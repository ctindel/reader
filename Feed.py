#!/usr/bin/python

import feedparser
import pymongo
import bson
import time, datetime

def get_all_feeds():
    all_feeds = []
    connection = pymongo.Connection("mongodb://localhost", safe=True)

    # get a handle to the school database
    db=connection.reader
    feed_table = db.feed
    
    cursor = feed_table.find({'enabled' : True})

    for doc in cursor:
        feed = Feed()
        feed.load_from_doc(doc)
        all_feeds.append(feed)

    return all_feeds

def calc_unread_count(db, user, feed):
    feed_entry = db.feed_entry
    user_feed_entry = db.user_feed_entry

    ufes_false = user_feed_entry.find({'user_id' : user.get_user_id(), 
                                       'feed_id':feed.get_id(), 'read':False})

    ufes_true = user_feed_entry.find({'user_id' : user.get_user_id(), 
                                      'feed_id':feed.get_id(), 'read':True})
    # Entries might be unread because they were read, and then marked 
    # unread, which means they'll have a read:False entry in the 
    # user_feed_entry collection
    #
    # Or, that feed_entry might never have been seen by the user, which
    # means they don't even have a user_feed_entry document.
    entries_marked_false = ufes_false.count()

    ube_array = []
    for ube in ufes_false:
        # Anything that is marked false has aleady been counted already
        # so we don't want to double count it
        ube_array.append(ube['feed_entry_id'])
    for ube in ufes_true:
        ube_array.append(ube['feed_entry_id'])
    unmarked_entries = feed_entry.find({ 'feed_id' : feed.get_id(),
                                         '_id' : 
                                            { '$nin' : ube_array}}).count()
    return entries_marked_false + unmarked_entries

def get_user_feeds(user, load_entries):
    user_feeds = []
    connection = pymongo.Connection("mongodb://localhost", safe=True)

    # get a handle to the school database
    db=connection.reader
    feed = db.feed
    feed_entry = db.feed_entry
    user_feed_entry = db.user_feed_entry
    
    for fid in user.get_subs():
        cursor = feed.find({'_id' : fid})

        for doc in cursor:
            f = Feed()
            f.load_from_doc(doc)
            if True == load_entries:
                f.load_entries()
            f.set_unread_count(calc_unread_count(db, user, f))
            user_feeds.append(f)
    return user_feeds

class FeedEntry:
    def __init__(self, feed):
        self.entry_map = {}
        self.feed = feed

    def get_as_dict(self):
        return self.entry_map

    def load_from_feed(self, entry):
        if 'title' in entry:
            self.entry_map['title'] = entry.title

        if 'link' in entry:
            self.entry_map['link'] = entry.link

        if 'description' in entry:
            self.entry_map['description'] = entry.description

        if 'published_parsed' in entry:
            # pymongo doesn't understand time.time so convert to  datetime.datetime
            tt = entry.published_parsed
            self.entry_map['published_date'] = datetime.datetime(tt[0], tt[1], tt[2], tt[3], tt[4], tt[5])

        if 'id' in entry:
            self.entry_map['entry_id'] = entry.id

        if 'summary' in entry:
            self.entry_map['summary'] = entry.summary

        if 'content' in entry:
            self.entry_map['content'] = entry.content

    def load_from_doc(self, entry_doc):
        self.entry_map = entry_doc

    def get_id(self):
        return self.entry_map['_id']

    def get_title(self):
        if 'title' in self.entry_map:
            return self.entry_map['title']
        return ''

    def get_link(self):
        if 'link' in self.entry_map:
            return self.entry_map['link']
        return ''

    def get_description(self):
        if 'description' in self.entry_map:
            return self.entry_map['description']
        return ''

    def get_published_date(self):
        if 'published_date' in self.entry_map:
            return self.entry_map['published_date']
        return ''

    def get_entry_id(self):
        if 'id' in self.entry_map:
            return self.entry_map['entry_id']
        return None

    def get_summary(self):
        if 'summary' in self.entry_map:
            return self.entry_map['summary']
        return ''

    def get_content(self):
        if 'content' in self.entry_map:
            return self.entry_map['content']
        return ''

    def save(self):
        connection = pymongo.Connection("mongodb://localhost", safe=True)

        db=connection.reader
        feed_entry_table = db.feed_entry

        self.entry_map['feed_id'] = self.feed.get_id()
        new_doc = feed_entry_table.find_and_modify(query = {'link' : 
                                                   self.entry_map['link']}, 
                                                   update = self.entry_map, 
                                                   upsert = True, new = True)
        self.entry_map = new_doc

class Feed:

    def __init__(self):
        self.feed_map = {}
        self.entries = []
        self.unread_count = 0

    def get_as_dict(self, include_entries):
        if False == include_entries:
            return dict(self.feed_map.items() + {'unread_count' : self.unread_count}.items())
        else:
            entries = []
            for e in self.entries:
                entries.append(e.get_as_dict())
            return dict(self.feed_map.items() + 
                        {'entries': entries, 'unread_count' : self.unread_count}.items())

    def set_unread_count(self, count):
        self.unread_count = count

    def get_unread_count(self):
        return self.unread_count

    def load_from_doc(self, feed_doc):
        self.feed_map = feed_doc
        self.entries = []

    def load_entries(self):
        self.entries = []

        connection = pymongo.Connection("mongodb://localhost", safe=True)

        db=connection.reader
        feed_entry_table = db.feed_entry
    
        cursor = feed_entry_table.find({'feed_id' : self.feed_map['_id']})

        for doc in cursor:
            entry = FeedEntry(self)
            entry.load_from_doc(doc)
            self.entries.append(entry)

    def load_from_feedparser(self, d):
        self.entries = []
        if 301 == d.status:
            self.feed_map['permanent_redirect_url'] = d.href
        if 410 == d.status:
            self.feed_map['permanently_removed'] = True
            self.feed_map['enabled'] = False
        if 401 == d.status:
            self.feed_map['requires_authentication'] = True
            self.feed_map['enabled'] = False
        if d.bozo:
            self.feed_map['bozo_bit_set'] = True

        if d.entries:
            for i in range(len(d.entries)):
                entry = FeedEntry(self)
                entry.load_from_feed(d.entries[i])
                self.entries.append(entry)

        if 'etag' in d:
            self.feed_map['etag'] = d.etag

        if 'modified_parsed' in d:
            tt = d.modified_parsed
            # pymongo doesn't understand time.time so convert to  datetime.datetime
            self.feed_map['modified_date'] = datetime.datetime(tt[0], tt[1], tt[2], tt[3], tt[4], tt[5])

        if 'title' in d.feed:
            self.feed_map['title'] = d.feed.title
        if 'link' in d.feed:
            self.feed_map['link'] = d.feed.link
        if 'description' in d.feed:
            self.feed_map['description'] = d.feed.description
        if 'image' in d.feed:
            self.feed_map['image_url'] = d.feed.image
        if 'published_parsed' in d.feed:
            tt = d.feed.published_parsed
            self.feed_map['published_date'] = datetime.datetime(tt[0], tt[1], tt[2], tt[3], tt[4], tt[5])

    def reload(self):
        d = feedparser.parse(self.feed_map['feed_url'])
        self.load_from_feedparser(d)

    def load_from_url(self, feed_url):
        self.feed_map['feed_url'] = feed_url
        self.feed_map['permanent_redirect_url'] = None
        self.feed_map['permanently_removed'] = False
        self.feed_map['requires_authentication'] = False
        self.feed_map['bozo_bit_set'] = False
        self.feed_map['enabled'] = True

        d = feedparser.parse(feed_url)
        self.load_from_feedparser(d)

    def is_bozo_bit_set(self):
        return self.feed_map['permanent_redirect_url'] is not None

    def is_permanently_redirected(self):
        return self.feed_map['permanent_redirect_url'] is not None

    def get_permanent_redirect_url(self):
        assert self.feed_map['permanent_redirect_url'] is not None
        return self.feed_map['permanent_redirect_url']

    def is_permanently_removed(self):
        return self.feed_map['permanently_removed']

    def is_authentication_required(self):
        return self.feed_map['requires_authentication']

    def is_enabled(self):
        return self.feed_map['enabled']

    def get_id(self):
        assert '_id' in self.feed_map
        return self.feed_map['_id']

    def get_url(self):
        return self.feed_map['feed_url']

    def get_etag(self):
        if 'etag' in self.feed_map:
            return self.feed_map['etag']
        return ''

    def get_modified_date(self):
        if 'modified_date' in self.feed_map:
            return self.feed_map['modified_date']
        return ''

    def get_title(self):
        if 'title' in self.feed_map:
            return self.feed_map['title']
        return ''

    def get_link(self):
        if 'link' in self.feed_map:
            return self.feed_map['link']
        return ''

    def get_description(self):
        if 'description' in self.feed_map:
            return self.feed_map['description']
        return ''

    def has_image_url(self):
        return 'image_url' in self.feed_map

    def get_image_url(self):
        assert self.has_image_url()
        return self.feed_map['image_url']

    def get_published_date(self):
        if 'published_date' in self.feed_map:
            return self.feed_map['published_date']
        return ''

    def get_entries(self):
        return self.entries

    def update_entry_read_val(self, user, entry_id, read_val):
        connection = pymongo.Connection("mongodb://localhost", safe=True)

        # get a handle to the school database
        db=connection.reader
        user_feed_entry_table = db.user_feed_entry

        found_entry = False

        for e in self.get_entries():
            if str(e.get_id()) == entry_id:
                found_entry = True

                new_doc = user_feed_entry_table.find_and_modify(
                    query = {'user_id' : user.get_user_id(), 'feed_id' : self.get_id(), 
                             'feed_entry_id' : bson.objectid.ObjectId(entry_id)}, 
                    update = {'read': read_val, 
                              'user_id' : user.get_user_id(),
                              'feed_id' : self.get_id(),
                              'feed_entry_id' : bson.objectid.ObjectId(entry_id)},
                    upsert = True,
                    new = True)

        return found_entry
        
    def save(self):
        connection = pymongo.Connection("mongodb://localhost", safe=True)

        # get a handle to the school database
        db=connection.reader
        feed_table = db.feed

        new_doc = feed_table.find_and_modify(query = {'feed_url' : 
                                             self.feed_map['feed_url']}, 
                                             update = self.feed_map, upsert = True, new = True)
        self.feed_map = new_doc
        for e in self.get_entries():
            e.save()

def print_feed(feed):
    if feed.is_permanently_redirected():
        print 'Permanent redirect to %s' % (feed.get_permanent_redirect_url())
    if feed.is_permanently_removed():
        print 'Feed has been permanently removed'
    if feed.is_authentication_required():
        print 'Feed requires authentication, not yet supported'
    if feed.is_bozo_bit_set():
        print 'BOZO BIT SET'

    print 'etag: %s' % feed.get_etag()
    print 'modified: %s ' % (feed.get_modified_date())
    print 'Title: ' + feed.get_title().encode('ascii', 'ignore')
    print 'Link: ' + feed.get_link()
    print 'Description: ' + feed.get_description().encode('ascii', 'ignore')
    if feed.has_image_url():
        print 'Image URL: ' + feed.get_image_url()

    print 'Published: %s' % (feed.get_published_date())

    entries = feed.get_entries()
    print 'Num Entries %d' % len(entries)

    print '\n'

    for i in range(len(entries)):
        print 'Entry[%d].title: %s' % (i, entries[i].get_title().encode('ascii', 'ignore'))
        print 'Entry[%d].link: %s' % (i, entries[i].get_link())
        print 'Entry[%d].description: %s' % (i, entries[i].get_description().encode('ascii', 'ignore'))
        print 'Entry[%d].published: %s' % (i, entries[i].get_published_date())
        print 'Entry[%d].id: %s' % (i, entries[i].get_entry_id())
        print 'Entry[%d].summary: %s' % (i, entries[i].get_summary().encode('ascii', 'ignore'))
        print 'Entry[%d].content: %s' % (i, entries[i].get_content())


#feed = Feed()
#feed.load_from_url('http://feeds.feedburner.com/ImbibeUnfiltered')
#feed.load_from_url('http://feeds.harvardbusiness.org/harvardbusiness/')
#feed.load_from_url('http://feeds.feedburner.com/eater/nyc')
#feed.load_from_url('http://feeds.feedburner.com/DilbertDailyStrip')
#print_feed(feed)
#feed.save()
