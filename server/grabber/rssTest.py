#!/usr/bin/python

import feedparser

d = feedparser.parse('http://feeds.feedburner.com/DilbertDailyStrip')
if 'etag' in d:
    print 'etag: %s' % d.etag
if 'modified' in d:
    print 'modified: %s (%s)' % (d.modified, d.modified_parsed)
if 301 == d.status:
    print 'Permanent redirect to %s' % (d.href)
if 410 == d.status:
    print 'Feed has been permanently removed'
if 401 == d.status:
    print 'Feed requires authentication, not yet supported'
print 'Title: ' + d.feed.title
print 'Link: ' + d.feed.link
print 'Description: ' + d.feed.description
if 'image' in d.feed:
    print 'Image: ' + d.feed.image
if d.bozo:
    print 'BOZO BIT SET'
print 'Published: ' + d.feed.published
#print d.feed.published_parsed
print 'Num Entries %d' % len(d.entries)

print '\n'

for i in range(len(d.entries)):
    print 'Entry[%d].title: %s' % (i, d.entries[i].title)
    print 'Entry[%d].link: %s' % (i, d.entries[i].link)
    print 'Entry[%d].description: %s' % (i, d.entries[i].description)
    print 'Entry[%d].published: %s' % (i, d.entries[i].published)
    print 'Entry[%d].id: %s' % (i, d.entries[i].id)
    print 'Entry[%d].summary: %s' % (i, d.entries[i].summary)
    if 'content' in d.entries[i]:
        print 'Entry[%d].content: %s' % (i, d.entries[i].content)
