from pyramid.view import view_config
from contentbase.elasticsearch import ELASTIC_SEARCH
from urllib.parse import urlencode
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
        "suggest_symbol": {
            "text": search_term,
            "completion": {
                "field": "symbol",
                "size": 10
            }
        },
        "suggest_synonyms": {
            "text": search_term,
            "completion": {
                "field": "synonyms",
                "size": 10
            }
        },
        "suggest_prevSymbols": {
            "text": search_term,
            "completion": {
                "field": "previousSymbols",
                "size": 10
            }
        }
    }
    try:
        results = es.suggest(index='suggester_index', body=query)
    except:
        return {}
    else:
        result['@id'] = '/suggest/?' + urlencode({'q': search_term})
        result['@graph'] = []
        for item in results['suggest_symbol'][0]['options']:
            result['@graph'].append(item)
        for item in results['suggest_synonyms'][0]['options']:
            result['@graph'].append(item)
        for item in results['suggest_prevSymbols'][0]['options']:
            result['@graph'].append(item)
        return result
