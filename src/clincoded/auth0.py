import requests
import json
from pyramid.authentication import CallbackAuthenticationPolicy
from pyramid.httpexceptions import (
    HTTPForbidden,
    HTTPFound,
)
from pyramid.security import (
    NO_PERMISSION_REQUIRED,
    remember,
    forget,
)
from pyramid.settings import (
    asbool,
    aslist,
)
from pyramid.view import (
    view_config,
)

from pyramid.httpexceptions import (
    HTTPServiceUnavailable,
)

from contentbase import (
    COLLECTIONS,
    collection_add,
    validate_request,
)

from contentbase.validation import (
    http_error,
)

_marker = object()


def includeme(config):
    config.scan(__name__)
    config.add_route('login', 'login')
    config.add_route('logout', 'logout')
    config.add_route('session', 'session')


class RequestedActivation(HTTPForbidden):
    title = 'Requsted Activation'

class LoginDenied(HTTPForbidden):
    title = 'Login failure'

class LoginNotVerified(HTTPForbidden):
    title = 'Account not verified'


class Auth0AuthenticationPolicy(CallbackAuthenticationPolicy):
    """
    Checks assertion during authentication so login can construct user session.
    """
    login_path = '/login'
    method = 'POST'

    def unauthenticated_userid(self, request):
        if request.method != self.method or request.path != self.login_path:
            return None

        cached = getattr(request, '_auth0_authenticated', _marker)
        if cached is not _marker:
            return cached

        try:
            access_token = request.json['accessToken']
        except (ValueError, TypeError, KeyError):
            if self.debug:
                self._log(
                    'Missing assertion.',
                    'unauthenticated_userid',
                    request)
            request._auth0_authenticated = None
            return None

        try:
            user_url = "https://{domain}/userinfo?access_token={access_token}" \
                .format(domain='clingen.auth0.com', access_token=access_token)  # AUTH0: LOGIN DOMAIN

            user_info = requests.get(user_url).json()
        except Exception as e:
            if self.debug:
                self._log(
                    ('Invalid assertion: %s (%s)', (e, type(e).__name__)),
                    'unauthenticated_userid',
                    request)
            request._auth0_authenticated = None
            return None

        if user_info['email_verified'] is True:
            email = request._auth0_authenticated = user_info['email'].lower()
            return email
        else:
            raise LoginNotVerified()

    def remember(self, request, principal, **kw):
        return []

    def forget(self, request):
        return []


# Unfortunately, X-Requested-With is not sufficient.
# http://lists.webappsec.org/pipermail/websecurity_lists.webappsec.org/2011-February/007533.html
# Checking the CSRF token in middleware is easier
@view_config(route_name='login', request_method='POST',
             permission=NO_PERMISSION_REQUIRED)
def login(request):
    """View to check the auth0 assertion and remember the user"""
    login = request.authenticated_userid
    # If the user has not been added to the database yet, @login will be None
    if login is None:
        namespace = userid = None
    else:
        namespace, userid = login.split('.', 1)
    
    body = request.json_body
    if userid == None:
        email = body['email'] if 'email' in body else None
    else:
        email = userid

    # If a user is not found in the database
    if namespace != 'auth0':
        try:
            create_user(request, body)
        except:
            request.session.invalidate()
            request.session['user_properties'] = {}
            request.response.headerlist.extend(forget(request))
            return http_error(HTTPServiceUnavailable(), request)

    request.session.invalidate()
    request.session.get_csrf_token()
    request.session['user_properties'] = request.embed('/current-user', as_user=email)

    user_status = request.session['user_properties']['user_status'] if 'user_status' in request.session['user_properties'] else None
    if user_status == 'requested activation':
        request.response.status = 403
        return {
            "@type": ['RequestedActivation', 'error']
        }
    elif user_status == 'inactive':
        request.response.status = 403
        return {
            "@type": ['LoginDenied', 'error']
        }

    request.response.headerlist.extend(remember(request, 'mailto.' + email))
    return request.session


@view_config(route_name='logout',
             permission=NO_PERMISSION_REQUIRED, http_cache=0)
def logout(request):
    """View to forget the user"""
    request.session.invalidate()
    request.session.get_csrf_token()
    request.session['user_properties'] = {}
    request.response.headerlist.extend(forget(request))
    if asbool(request.params.get('redirect', True)):
        raise HTTPFound(location=request.resource_path(request.root))
    return request.session


@view_config(route_name='session', request_method='GET',
             permission=NO_PERMISSION_REQUIRED)
def session(request):
    """ Possibly refresh the user's session cookie
    """
    request.session.get_csrf_token()
    if not request.params.get('reload'):
        return request.session
    # Reload the user's session cookie
    login = request.authenticated_userid
    if login is None:
        namespace = userid = None
    else:
        namespace, userid = login.split('.', 1)
    if namespace != 'mailto':
        return request.session
    request.session['user_properties'] = request.embed('/current-user', as_user=userid)
    return request.session

def create_user(request, body):
    """ Constructs user properties and creates new user in the database """
    email = body['email'] if 'email' in body else ''
    first_name = body['firstName'] if 'firstName' in body else ''
    last_name = body['lastName'] if 'lastName' in body else ''
    institution = body['institution'] if 'institution' in body else ''
    usage_intent = body['usageIntent'] if 'usageIntent' in body else ''

    properties = {
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "institution": institution,
        "usage_intent": usage_intent,
        "groups": ["curator"],
        "status": "current",
        "timezone": "US/Pacific",
        "job_title": "ClinGen Curator",
        "affiliation": [],
        "lab": "59110818-1f5b-4ac5-af38-0d5948aca66e", # Use UUID instead of "/labs/curator/"
        "submits_for": ["59110818-1f5b-4ac5-af38-0d5948aca66e"], # Use UUID instead of "/labs/curator/"
        "user_status": "requested activation"
    }
    
    registry = request.registry
    context = registry[COLLECTIONS]['users']
    request.body =json.dumps(properties).encode('utf-8')
    data = request.json
    validate_request(context.type_info.schema, request, data)
    collection_add(context, request)
