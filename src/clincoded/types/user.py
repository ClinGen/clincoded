from pyramid.view import (
    view_config,
)
from pyramid.security import (
    Allow,
    Deny,
    Everyone,
    effective_principals,
)
from .base import Item
from snovault import (
    Root,
    CONNECTION,
    calculated_property,
    collection,
    load_schema,
)
from snovault.calculated import calculate_properties
from snovault.resource_views import item_view_object
from snovault.util import expand_path

ONLY_ADMIN_VIEW_DETAILS = [
    (Allow, 'group.admin', ['view', 'view_details', 'edit']),
    (Allow, 'group.read-only-admin', ['view', 'view_details']),
    (Allow, 'remoteuser.INDEXER', ['view']),
    (Allow, 'remoteuser.EMBED', ['view']),
    (Deny, Everyone, ['view', 'view_details', 'edit']),
]

USER_ALLOW_CURRENT = [
    (Allow, Everyone, 'view'),
] + ONLY_ADMIN_VIEW_DETAILS

USER_DELETED = [
    (Deny, Everyone, 'visible_for_edit')
] + ONLY_ADMIN_VIEW_DETAILS


@collection(
    name='users',
    unique_key='user:email',
    properties={
        'title': 'ClinGen Curation Users',
        'description': 'Listing of current ClinGen Curation users',
    },
    acl=[
        (Allow, 'group.admin', ['list', 'view_details']),
        (Allow, 'group.read-only-admin', ['list', 'view_details']),
        (Allow, 'role.owner', ['edit', 'view_details']),
        (Allow, 'remoteuser.INDEXER', ['list', 'view']),
        (Allow, 'remoteuser.EMBED', ['list', 'view']),
        (Allow, Everyone, ['view']),
        (Allow, 'group.curator', ['view']),
        (Deny, Everyone, ['list', 'view_details']),
    ])
class User(Item):
    item_type = 'user'
    schema = load_schema('clincoded:schemas/user.json')

    @calculated_property(schema={
        "title": "Title",
        "type": "string",
    })
    def title(self, first_name, last_name):
        return u'{} {}'.format(first_name, last_name)

    def __ac_local_roles__(self):
        owner = 'userid.%s' % self.uuid
        return {owner: 'role.owner'}


@view_config(context=User, permission='view_details', request_method='GET',
             name='details')
def user_details_view(context, request):
    return item_view_object(context, request)


@view_config(context=User, permission='view', request_method='GET',
             name='object')
def user_basic_view(context, request):
    properties = item_view_object(context, request)
    filtered = {}
    for key in ['@id', '@type', 'uuid', 'lab', 'title', 'email', 'first_name', 'last_name']:
        try:
            filtered[key] = properties[key]
        except KeyError:
            pass
    return filtered


@calculated_property(context=User, category='user_action')
def impersonate(request):
    # This is assuming the user_action calculated properties
    # will only be fetched from the current_user view,
    # which ensures that the user represented by 'context' is also an effective principal
    if request.has_permission('impersonate'):
        return {
            'id': 'impersonate',
            'title': 'Impersonate User…',
            'href': '/#!impersonate-user',
        }


@calculated_property(context=User, category='user_action')
def profile(context, request):
    return {
        'id': 'profile',
        'title': 'Profile',
        'href': request.resource_path(context),
    }


@calculated_property(context=User, category='user_action')
def signout(context, request):
    return {
        'id': 'signout',
        'title': 'Sign out',
        'trigger': 'logout',
}


@view_config(context=Root, name='current-user', request_method='GET')
def current_user(request):
    request.environ['clincoded.canonical_redirect'] = False
    for principal in effective_principals(request):
        if principal.startswith('userid.'):
            break
    else:
        return {}
    namespace, userid = principal.split('.', 1)
    collection = request.root.by_item_type[User.item_type]
    path = request.resource_path(collection, userid, '@@details')
    return request.embed(path, as_user=True)
