#!/usr/bin/python

import Feed
from elasticsearch import Elasticsearch

es = Elasticsearch(
    ['192.168.93.197'],
    use_ssl=False,
    verify_certs=False,
)

if es.indices.exists('reader'):
    es.indices.delete(index='reader')

feed_entry_mapping = {
    'settings': {
        'number_of_shards': 1,
        'number_of_replicas': 0
    },
    'feedEntry': {
        'properties': {
            'description': {'type': 'string'},
            'entryID': {'type': 'string'},
            'feedID': {'type': 'string'},
            'link': {'type': 'string'},
            'mongoID': {'type': 'string'},
            'publishedDate': {'type': 'date'},
            'summary': {'type': 'string'},
            'title': {'type': 'string'}
        }
    }
}

es.indices.create(index='reader', ignore=400, body=feed_entry_mapping)


for f in Feed.get_all_feeds():
    f.loadEntries()
    f.save()
