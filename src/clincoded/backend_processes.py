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
    config.add_route('traverse', '/traverse/{obj_type}/{uuid}/')
    config.add_route('reassociate', '/reassociate/{obj_type}/{obj_uuid}/{old_parent_type}/{old_parent_uuid}/{new_parent_type}/{new_parent_uuid}/')
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


def reassociate_action(request, obj_type, obj_uuid, old_parent_type, old_parent_uuid, new_parent_type, new_parent_uuid):
    obj_id = '/%s/%s/' % (obj_type, obj_uuid)
    old_parent_obj = request.embed('/%s/%s/?frame=object' % (old_parent_type, old_parent_uuid), as_user=True)
    old_parent_obj_type = old_parent_obj['@type'][0]
    new_parent_obj = request.embed('/%s/%s/?frame=object' % (new_parent_type, new_parent_uuid), as_user=True)
    new_parent_obj_type = new_parent_obj['@type'][0]
    if obj_type == 'groups':
        if old_parent_obj_type == 'annotation':
            old_parent_obj['groups'].remove(obj_id)
        if new_parent_obj_type == 'annotation':
            new_parent_obj['groups'].append(obj_id)
    elif obj_type == 'families':
        if old_parent_obj_type == 'annotation':
            old_parent_obj['families'].remove(obj_id)
        elif old_parent_obj_type == 'group':
            old_parent_obj['familyIncluded'].remove(obj_id)
        if new_parent_obj_type == 'annotation':
            new_parent_obj['families'].append(obj_id)
        elif new_parent_obj_type == 'group':
            new_parent_obj['families'].append(obj_id)
    elif obj_type == 'individuals':
        if old_parent_obj_type == 'annotation':
            old_parent_obj['individuals'].remove(obj_id)
        elif old_parent_obj_type == 'group' or old_parent_obj_type == 'family':
            old_parent_obj['individualIncluded'].remove(obj_id)
        if new_parent_obj_type == 'annotation':
            new_parent_obj['individuals'].append(obj_id)
        elif new_parent_obj_type == 'group' or new_parent_obj_type == 'family':
            new_parent_obj['individualIncluded'].append(obj_id)
    elif obj_type == 'experimental':
        if old_parent_obj_type == 'annotation':
            old_parent_obj['experimentalData'].remove(obj_id)
        if new_parent_obj_type == 'annotation':
            new_parent_obj['experimentalData'].append(obj_id)


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

@view_config(route_name='reassociate', request_method='GET', permission='edit')
def reassociate(context, request):
    obj_type = request.matchdict['obj_type']
    obj_uuid = request.matchdict['obj_uuid']
    old_parent_type = request.matchdict['old_parent_type']
    old_parent_uuid = request.matchdict['old_parent_uuid']
    new_parent_type = request.matchdict['new_parent_type']
    new_parent_uuid = request.matchdict['new_parent_uuid']
    reassociate_action(request, obj_type, obj_uuid, old_parent_type, old_parent_uuid, new_parent_type, new_parent_uuid)
    return Response(dumps([0]), content_type='text/plain')
