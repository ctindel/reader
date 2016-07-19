#!/usr/bin/python

import Feed
from elasticsearch import Elasticsearch

es = Elasticsearch(
    ['192.168.93.197'],
    use_ssl=False,
    verify_certs=False,
)

for f in Feed.get_all_feeds():
    f.loadEntries()
    res = f.save()
    print(" ES response: '%s'" % (res))
