import requests
from pyramid.response import Response
from pyramid.view import view_config
from pyramid.httpexceptions import (
    HTTPError,
    HTTPBadRequest,
    HTTPServiceUnavailable,
)
from contentbase.validation import http_error

def includeme(config):
    config.add_route('functional_data', '/functional_data/ldh/{variant_id}')
    config.scan(__name__)

@view_config(route_name='functional_data', request_method='GET')
def functional_data(request):
    try:
        variant_id = request.matchdict['variant_id']
    except (ValueError, TypeError, KeyError) as e:
        return http_error(HTTPBadRequest(), request)
    try:
        ldh_url = "https://genboree.org/ldh/Variant/entId/{id}" \
            .format(id=variant_id)
        ldh_data = requests.get(ldh_url).json()
    except Exception as e:
        return http_error(HTTPBadRequest(), request)
    try:
        afis_records = ldh_data['data']['ld']['AlleleFunctionalImpactStatement']
        for index, statement in enumerate(afis_records):
            try:
                fdr_data = requests.get(statement['entIri']).json()
                ldh_data['data']['ld']['AlleleFunctionalImpactStatement'][index]['fdr'] = fdr_data['data']
            except Exception as e:
                return http_error(HTTPServiceUnavailable(), request)
    except Exception as e:
        return http_error(HTTPServiceUnavailable(), request)
    return ldh_data['data']
