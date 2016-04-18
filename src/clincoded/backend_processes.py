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

@view_config(route_name='traverse')
def traverse(context, request):
    #param_list = parse_qs(request.matchdict['gdm'].replace(',,', '&'))
    gdm = request.matchdict['gdm']
    results = request.embed('/gdm/%s' % gdm, as_user=True)['@graph']
    print("\n****************************************\n")
    print(gdm)
    print(results)
    print("\n****************************************\n")
    return False
