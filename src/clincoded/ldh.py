import requests
from requests.exceptions import HTTPError
from pyramid.view import view_config
from pyramid.httpexceptions import (
    HTTPBadRequest,
    HTTPServiceUnavailable,
)
from contentbase.validation import http_error

def includeme(config):
    config.add_route('functional_data', '/functional_data/{variant_id}')
    config.add_route('population_data', '/population_data/{variant_id}')
    config.scan(__name__)

def get_ldh_data(path):
    try:
        ldh_url = 'https://genboree.org' + path
        ldh_data = requests.get(ldh_url)
        ldh_data.raise_for_status()
        return ldh_data.json()
    except HTTPError as e:
        if (e.response.status_code == 404):
            return {}
        return e
    except Exception as e:
        return e

@view_config(route_name='functional_data', request_method='GET')
def get_functional_data(request):
    try:
        variant_id = request.matchdict['variant_id']
    except (ValueError, TypeError, KeyError) as e:
        return http_error(HTTPBadRequest(), request)
    try:
        ldh_path = "/fdr/Variant/entId/{id}" \
            .format(id=variant_id)
        ldh_data = get_ldh_data(ldh_path)
        if (ldh_data == {}):
            return {}
    except Exception as e:
        return http_error(HTTPServiceUnavailable(), request)
    try:
        afis_records = ldh_data['data'][0]['ld']['AlleleFunctionalImpactStatement']
        for index, statement in enumerate(afis_records):
            try:
                fdr_data = requests.get(statement['entIri']).json()
                ldh_data['data'][0]['ld']['AlleleFunctionalImpactStatement'][index]['fdr'] = fdr_data['data']
            except Exception as e:
                return http_error(HTTPServiceUnavailable(), request)
        return ldh_data['data'][0]
    except Exception as e:
        return http_error(HTTPServiceUnavailable(), request)
    