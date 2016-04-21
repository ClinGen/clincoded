from pyramid.response import Response
from pyramid.view import view_config
from contentbase import Item
from collections import OrderedDict
import cgi
from urllib.parse import (
    parse_qs,
    urlencode,
)


def includeme(config):
    config.add_route('traverse', '/traverse/{gdm}')
    config.scan(__name__)


def traverse_action(request, obj):
    aid = obj['@id']
    if 'label' in obj:
        label = obj['label']
        print('%s : %s' % (aid, label))
    else:
        print('%s' % aid)
    root = request.embed('%s' % aid, as_user=True)
    # print(root)
    if 'annotations' in root:
        for annotation in root['annotations']:
            traverse_action(request, annotation)
    if 'groups' in root:
        for group in root['groups']:
            traverse_action(request, group)
    if 'families' in root:
        for family in root['families']:
            traverse_action(request, family)
    if 'individuals' in root:
        for individual in root['individuals']:
            traverse_action(request, individual)
    if 'familyIncluded' in root:
        for family in root['familyIncluded']:
            traverse_action(request, family)
    if 'individualIncluded' in root:
        for individual in root['individualIncluded']:
            traverse_action(request, individual)
    if 'experimentalData' in root:
        for experimentalDatum in root['experimentalData']:
            traverse_action(request, experimentalDatum)


@view_config(route_name='traverse', request_method='GET', permission='view')
def traverse(context, request):
    #param_list = parse_qs(request.matchdict['gdm'].replace(',,', '&'))
    gdm = request.matchdict['gdm']
    root = request.embed('/gdm/%s' % gdm, as_user=True)
    print("\n****************************************\n")
    traverse_action(request, root)
    print("\n****************************************\n")
    return Response(False)
