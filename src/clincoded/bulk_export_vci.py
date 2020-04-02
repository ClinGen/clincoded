import requests
from requests.exceptions import HTTPError
from pyramid.view import view_config
from pyramid.httpexceptions import (
    HTTPBadRequest,
    HTTPServiceUnavailable,
)
from contentbase.validation import http_error
from clincoded.search import search

def includeme(config):
    config.add_route('bulk_export_vci', '/bulk_export_vci{slash:/?}')
    config.scan(__name__)


@view_config(route_name='bulk_export_vci', request_method='GET')
def bulk_export_vci(context, request):
    
    try:
        
        # TODO: experiment testing pyramid search endpoint

        # result = search(context, request, context.item_type)

        # misc
        # collection_add is in src/contentbase/resources.py

        from pyramid.request import Request
        
        subreq = Request.blank(
            '/search?{}'.format(request.query_string),
            # '/search?type=interpretation&limit=11&interpretation_status=Provisional',
            headers={
                'Accept': 'application/json'
            },
            # params={
            #     'type': 'interpretation',
            #     'limit': 11,
            #     'interpretation_status': 'Provisional',
            # },
            cookies=request.cookies
        )


        # custom_params = {}
        # if not 'type' in request.params:
        #     custom_params['type'] = 'interpretation'

        # if not 'limit' in request.params:
        #     custom_params['limit'] = 11

        print('try to invoke subseq')
        # request.params = NestedMultiDict(request.params, custom_params)

        # search_result = search(context, request)
        search_result = request.invoke_subrequest(subreq).json

        total = search_result['total'] if 'total' in search_result else None
        print('\n\n\nes total is', total)
        print('page total', len(search_result['@graph']), '\n\n\n')

        with open('bulk_interpretations.json', 'w') as bulk_json_file:
            import json
            json.dump(search_result['@graph'], bulk_json_file)

        return {
            'a_message': 'ok!',
            'a_page_total': len(search_result['@graph']),
            'a_es_total': total,
            'search_result': search_result
        }

    except HTTPError as e:
        print('\n\n\n\n', '!HTTPError!')
        if (e.response.status_code == 404):
            return {}
        return http_error(HTTPServiceUnavailable(), request)
    except Exception as e:
        print('\n\n\n\n', '!Exception!', e)
        return http_error(HTTPServiceUnavailable(), request)
