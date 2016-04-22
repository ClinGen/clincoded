from browserid.errors import TrustError
from pyramid.authentication import CallbackAuthenticationPolicy
from pyramid.config import ConfigurationError
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

_marker = object()


def includeme(config):
    config.scan(__name__)
    config.add_route('login', 'login')
    config.add_route('logout', 'logout')
    config.add_route('session', 'session')


class LoginDenied(HTTPForbidden):
    title = 'Login failure'


class GoogleAuthenticationPolicy(CallbackAuthenticationPolicy):
    """
    Checks assertion during authentication so login can construct user session.
    """
    login_path = '/login'
    method = 'POST'

    def unauthenticated_userid(self, request):
        if request.method != self.method or request.path != self.login_path:
            return None
        return request.json['email']

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
    login = request.authenticated_userid
    if login is None:
        namespace = userid = None
    else:
        namespace, userid = login.split('.', 1)
    if namespace != 'google':
        raise LoginDenied()
    request.session['user_properties'] = request.embed('/current-user', as_user=userid)
    request.response.headerlist.extend(remember(request, 'mailto.' + userid))
    return request.session


@view_config(route_name='logout',
             permission=NO_PERMISSION_REQUIRED, http_cache=0)
def logout(request):
    """View to forget the user"""
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
