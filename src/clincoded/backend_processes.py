from pyramid.response import Response
from pyramid.view import view_config
from contentbase import Item
from collections import OrderedDict
import cgi
from urllib.parse import (
    parse_qs,
    urlencode,
)
from json import dumps


def includeme(config):
    config.add_route('traverse', '/traverse/{obj_type}/{uuid}')
    config.scan(__name__)


def traverse_action(request, obj, depth):
    payload = []
    aid = obj['@id']
    if 'label' in obj:
        label = obj['label']
        print('%s : %s' % (aid, label))
        payload += [{
            'label': obj['label'],
            'id': aid,
            'depth': depth
        }]
    else:
        print('%s' % aid)
        payload += [{
            'id': aid,
            'depth': depth
        }]

    root = request.embed('%s' % aid, as_user=True)
    # print(root)
    if 'annotations' in root:
        for annotation in root['annotations']:
            payload += traverse_action(request, annotation, depth=depth + 1)
    if 'groups' in root:
        for group in root['groups']:
            payload += traverse_action(request, group, depth=depth + 1)
    if 'families' in root:
        for family in root['families']:
            payload += traverse_action(request, family, depth=depth + 1)
    if 'individuals' in root:
        for individual in root['individuals']:
            payload += traverse_action(request, individual, depth=depth + 1)
    if 'familyIncluded' in root:
        for family in root['familyIncluded']:
            payload += traverse_action(request, family, depth=depth + 1)
    if 'individualIncluded' in root:
        for individual in root['individualIncluded']:
            payload += traverse_action(request, individual, depth=depth + 1)
    if 'experimentalData' in root:
        for experimentalDatum in root['experimentalData']:
            payload += traverse_action(request, experimentalDatum, depth=depth + 1)

    return payload


def reassociate_action(request, obj, old_parent, new_parent):
    obj_type = obj['@type'][0]
    obj_uuid = obj['uuid']
    old_parent_obj = request.embed(old_parent, as_user=True)
    if obj_type == 'group':
        if 'families' in obj:
            for i, family in enumerate(obj['families']):
                if family.uuid = obj_uuid:
                    del obj['families'][i]
    new_parent_obj = request.embed(new_parent, as_user=True)


@view_config(route_name='traverse', request_method='GET', permission='view')
def traverse(context, request):
    #param_list = parse_qs(request.matchdict['gdm'].replace(',,', '&'))
    obj_type = request.matchdict['obj_type']
    uuid = request.matchdict['uuid']
    obj = request.embed('/%s/%s' % (obj_type, uuid), as_user=True)
    print("\n****************************************\n")
    payload = traverse_action(request, obj, depth=0)
    print("\n****************************************\n")
    print(payload)
    print("\n****************************************\n")
    return Response(dumps(payload), content_type='text/plain')
