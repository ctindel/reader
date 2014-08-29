#!/usr/bin/python

import Feed

feeds = Feed.get_all_feeds()
for b in feeds:
    b.reload()
    b.save()
