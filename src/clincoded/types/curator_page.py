from snovault.schema_utils import (
    load_schema,
    VALIDATOR_REGISTRY,
)
from snovault.resource_views import item_view_page
from snovault import (
    COLLECTIONS,
    CONNECTION,
    ROOT,
    calculated_property,
    collection,
)
from .base import (
    ALLOW_EVERYONE_VIEW,
    Item,
    ONLY_ADMIN_VIEW,
)
from pyramid.location import lineage
from pyramid.threadlocal import get_current_request
from pyramid.traversal import (
    find_resource,
)
from pyramid.view import view_config


@collection(
    name='curator-pages',
    unique_key='curator_page:location',
    properties={
        'title': 'Curator pages',
        'description': 'Pages for the curator action flow',
    })
class CuratorPage(Item):
    item_type = 'curator_page'
    schema = load_schema('clincoded:schemas/curator_page.json')
    name_key = 'name'

    def unique_keys(self, properties):
        keys = super(CuratorPage, self).unique_keys(properties)
        parent = properties.get('parent')
        name = properties['name']
        value = name if parent is None else u'{}:{}'.format(parent, name)
        keys.setdefault('curator_page:location', []).append(value)
        return keys

    @calculated_property(
        condition=lambda context, request: request.resource_path(context.__parent__) == '/curator-pages/',
        schema={
            "title": "Canonical URI",
            "type": "string",
        })
    def canonical_uri(self, name):
        if name == 'homepage':
            return '/'
        return '/%s/' % name

    @property
    def __parent__(self):
        parent_uuid = self.properties.get('parent')
        name = self.__name__
        collections = self.registry[COLLECTIONS]
        connection = self.registry[CONNECTION]
        if parent_uuid:  # explicit parent
            return connection.get_by_uuid(parent_uuid)
        elif name in collections or name == 'homepage':
            # collection default page; use pages collection as canonical parent
            return self.collection
        else:  # top level
            return self.registry[ROOT]

    def is_default_page(self):
        name = self.__name__
        collections = self.registry[COLLECTIONS]
        if self.properties.get('parent'):
            return False
        return name in collections or name == 'homepage'

    # Handle traversal to nested pages

    def __getitem__(self, name):
        resource = self.get(name)
        if resource is None:
            raise KeyError(name)
        return resource

    def __contains__(self, name):
        return self.get(name, None) is not None

    def get(self, name, default=None):
        location = str(self.uuid) + ':' + name
        connection = self.registry[CONNECTION]
        resource = connection.get_by_unique_key('curator_page:location', location)
        if resource is not None:
            return resource
        return default

    def __resource_url__(self, request, info):
        # Record ancestor uuids in linked_uuids so renames of ancestors
        # invalidate linking objects.
        for obj in lineage(self):
            uuid = getattr(obj, 'uuid', None)
            if uuid is not None:
                request._linked_uuids.add(str(uuid))
        return None

