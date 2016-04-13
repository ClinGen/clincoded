from pyramid.view import view_config
from contentbase import TYPES
from contentbase.elasticsearch import ELASTIC_SEARCH
from pyramid.response import Response
from pyramid.security import effective_principals
from urllib.parse import urlencode
from collections import OrderedDict
from .search import (
    set_filters,
    get_filtered_query
)
import requests
import logging


log = logging.getLogger(__name__)


def includeme(config):
    config.add_route('suggest', '/suggest{slash:/?}')
    config.scan(__name__)


@view_config(route_name='suggest', request_method='GET', permission='search')
def suggest(context, request):
    search_term = ''
    result = {
        '@id': '/suggest/?' + urlencode({'q': search_term}),
        '@type': ['suggest'],
        'title': 'Suggest',
        '@graph': [],
    }
    if 'q' in request.params:
        search_term = request.params.get('q', '')
    else:
        return []
    es = request.registry[ELASTIC_SEARCH]
    query = {
        "suggester": {
            "text": search_term,
            "completion": {
                "field": "symbol",
                "size": 10
            }
        }
    }
    try:
        results = es.suggest(index='gene_symbol_index', body=query)
    except:
        return {}
    else:
        result['@id'] = '/suggest/?' + urlencode({'q': search_term})
        result['@graph'] = []
        for item in results['suggester'][0]['options']:
            if not any(x in item['text'] for x in ['(C. elegans)', '(mus musculus)']):
                result['@graph'].append(item)
        return result
