from pyramid.paster import get_app
from .interfaces import ELASTIC_SEARCH
from elasticsearch import RequestError
import requests
import json
import logging


EPILOG = __doc__


log = logging.getLogger(__name__)


index_name = 'suggester_index'
doc_type = 'gene'


# define autocomplete filter
def index_settings():
    return {
        "analysis": {
            "filter": {
                "autocomplete_filter": {
                    "type":     "edgeNGram",
                    "min_gram": 1,
                    "max_gram": 20,
                    "token_chars": [
                        "letter",
                        "digit",
                        "symbol"
                    ]
                }
            },
            "analyzer": {
                "autocomplete": {
                    "type":      "custom",
                    "tokenizer": "standard",
                    "filter": [
                        "lowercase",
                        "asciifolding",
                        "autocomplete_filter"
                    ]
                },
                "raw": {
                    "type": "custom",
                    "tokenizer": "keyword",
                    "filter": [
                        "lowercase",
                        "asciifolding"
                    ]
                }
            }
        }
    }


# define autocomplete mapping
def mapping_settings():
    return {
        "properties": {
            "synonyms": {
               "type": "completion",
               "index_analyzer": "standard",
               "search_analyzer": "autocomplete",
               "payloads": True
            },
            "previousSymbols": {
               "type": "completion",
               "index_analyzer": "standard",
               "search_analyzer": "autocomplete",
               "payloads": True
            },
            "symbol": {
               "type": "completion",
               "index_analyzer": "standard",
               "search_analyzer": "autocomplete",
               "payloads": True
            }
        }
    }


def request_body():
    return {
        "query": {
            "match": {
                "_type": "gene"
            }
        }
    }


def fetch_data(app):
    es = app.registry[ELASTIC_SEARCH]
    try:
        res = es.search(index='clincoded', body=request_body())
    except:
        return {}
    else:
        annotations = []
        doc = {}
        for hit in res['hits']['hits']:
            obj = {
                'hgncId': hit['_source']['embedded']['hgncId'],
                'symbol': hit['_source']['embedded']['symbol'],
                'synonyms': hit['_source']['embedded']['synonyms'],
                'previousSymbols': hit['_source']['embedded']['previousSymbols']
            }
            doc['symbol'] = {
                'input': obj['symbol'],
                'payload': {'id': obj['hgncId']},
                'weight': 3
            }
            doc['synonyms'] = {
                'input': obj['synonyms'],
                'payload': {'id': obj['hgncId']},
                'weight': 2
            }
            doc['previousSymbols'] = {
                'input': obj['previousSymbols'],
                'payload': {'id': obj['hgncId']},
                'weight': 1
            }

            # if obj['synonyms'] is not None and obj['synonyms'] != '':
            #    synonyms = [x.strip(' ') for x in obj['synonyms'].split(',')]
            #    doc['symbol']['input'] = doc['symbol']['input'] + synonyms

        annotations.append({
            "index": {
                "_index": index_name,
                "_type": doc_type,
                "_id": "test_doc"
            }
        })
        annotations.append(doc)
    return annotations


def run(app):
    es = app.registry[ELASTIC_SEARCH]
    # drop index and recreate
    try:
        es.indices.create(index=index_name, body=index_settings())
    except RequestError:
        es.indices.delete(index=index_name)
        es.indices.create(index=index_name, body=index_settings())

    try:
        es.indices.put_mapping(
            index=index_name,
            doc_type=doc_type,
            body={doc_type: mapping_settings()}
        )
    except:
        print("Could not create mapping for the collection %s", doc_type)
    else:
        es.indices.refresh(index=index_name)

    # dummy documents for testing
    documents = []
    document = {
        "symbol": {
            "input": "DICER1",
            "payload": {"@id": "/genes/DICER1/"},
            "weight": 3
        },
        "synonyms": {
            "input": ["Dicer", "KIAA0928", "K12H4.8-LIKE", "HERNA"],
            "payload": {"@id": "/genes/DICER1/"},
            "weight": 2
        },
        "previousSymbols": {
            "input": ["MNG1"],
            "payload": {"@id": "/genes/DICER1/"},
            "weight": 1
        }
    }
    documents.append({
        "index": {
            "_index": index_name,
            "_type": doc_type,
            "_id": "test"
        }
    })
    documents.append(document)
    try:
        es.bulk(index=index_name, body=documents, refresh=True)
    except:
        print("Unable to index documents")


def main():
    import argparse
    parser = argparse.ArgumentParser(
        description="Create and index gene symbols in Elasticsearch", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--app-name', help="Pyramid app name in configfile")
    parser.add_argument('config_uri', help="path to configfile")
    args = parser.parse_args()

    logging.basicConfig()
    app = get_app(args.config_uri, args.app_name)

    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('clincoded').setLevel(logging.DEBUG)

    return run(app)


if __name__ == '__main__':
    main()
