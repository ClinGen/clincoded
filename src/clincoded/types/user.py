from pyramid.view import (
    view_config,
)
from pyramid.security import (
    Allow,
    Deny,
    Everyone,
)
from .base import (
    Item,
)
from snovault import (
    CONNECTION,
    calculated_property,
    collection,
    load_schema,
)
from snovault.calculated import calculate_properties
from snovault.resource_views import item_view_object
from snovault.util import expand_path


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


@view_config(context=User, permission='view', request_method='GET', name='page')
def user_page_view(context, request):
    if request.has_permission('view_details'):
        properties = item_view_object(context, request)
    else:
        item_path = request.resource_path(context)
        properties = request.embed(item_path, '@@object')
    for path in context.embedded:
        expand_path(request, properties, path)
    calculated = calculate_properties(context, request, properties, category='page')
    properties.update(calculated)
    return properties


@view_config(context=User, permission='view', request_method='GET',
             name='object')
def user_basic_view(context, request):
    properties = item_view_object(context, request)
    filtered = {}
    for key in ['@id', '@type', 'uuid', 'first_name', 'last_name', 'lab', 'title']:
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
