import requests
from requests.exceptions import HTTPError
from pyramid.view import view_config
from pyramid.httpexceptions import (
    HTTPBadRequest,
    HTTPServiceUnavailable,
)
from contentbase.validation import http_error

def includeme(config):
    config.add_route('ldh', '/ldh/{variant_id}')
    config.add_route('afis', '/afis/{afis_id}')
    config.scan(__name__)


@view_config(route_name='ldh', request_method='GET')
def get_ldh_data(request):
    try:
        variant_id = request.matchdict['variant_id']
    except (ValueError, TypeError, KeyError) as e:
        return http_error(HTTPBadRequest(), request)
    try:
        ldh_url = 'https://ldh.clinicalgenome.org/ldh/Variant/id/' + variant_id
        ldh_data = requests.get(ldh_url, timeout=10)
        ldh_data.raise_for_status()
        ldh_data = ldh_data.json()
        return ldh_data['data']
    except HTTPError as e:
        if (e.response.status_code == 404):
            return {}
        return http_error(HTTPServiceUnavailable(), request)
    except Exception as e:
        return http_error(HTTPServiceUnavailable(), request)


@view_config(route_name='afis', request_method='GET')
def get_allele_frequency_impact_statements(request):
    try:
        afis_id = request.matchdict['afis_id']
    except (ValueError, TypeError, KeyError) as e:
        return http_error(HTTPBadRequest(), request)
    try:
        afis_url = 'https://ldh.clinicalgenome.org/fdr/AlleleFunctionalImpactStatement/id/' + afis_id
        afis_record = requests.get(afis_url, timeout=10)
        afis_record = afis_record.json()
        return afis_record['data']
    except Exception as e:
        return http_error(HTTPServiceUnavailable(), request)
    