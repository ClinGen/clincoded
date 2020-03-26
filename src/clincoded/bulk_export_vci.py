import requests
from requests.exceptions import HTTPError
from pyramid.view import view_config
from pyramid.httpexceptions import (
    HTTPBadRequest,
    HTTPServiceUnavailable,
)
from contentbase.validation import http_error

def includeme(config):
    config.add_route('bulk_export_vci', '/bulk_export_vci{slash:/?}')
    config.scan(__name__)


@view_config(route_name='bulk_export_vci', request_method='GET')
def bulk_export_vci(request):
    try:
        
        # TODO: experiment testing pyramid search endpoint

        # result = search(context, request, context.item_type)

        # misc
        # collection_add is in src/contentbase/resources.py

        return {
            'message': 'our test vci bulk export route'
        }

    except HTTPError as e:
        if (e.response.status_code == 404):
            return {}
        return http_error(HTTPServiceUnavailable(), request)
    except Exception as e:
        return http_error(HTTPServiceUnavailable(), request)
