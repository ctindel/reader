#!/usr/bin/python

import feedparser
import pymongo
import time, datetime

def get_all_blogs():
    all_blogs = []
    connection = pymongo.Connection("mongodb://localhost", safe=True)

    # get a handle to the school database
    db=connection.reader
    blog_table = db.blog
    
    cursor = blog_table.find({'enabled' : True})

    for doc in cursor:
        blog = Blog()
        blog.load_from_doc(doc)
        all_blogs.append(blog)

    return all_blogs

def calc_unread_count(db, user, blog):
    blog_entry = db.blog_entry
    user_blog_entry = db.user_blog_entry


    ubes_false = user_blog_entry.find({'user_id' : user.get_user_id(), 
                                       'blog_id':blog.get_id(), 'read':False})

    ubes_true = user_blog_entry.find({'user_id' : user.get_user_id(), 
                                      'blog_id':blog.get_id(), 'read':True})
    # Entries might be unread because they were read, and then marked 
    # unread, which means they'll have a read:False entry in the 
    # user_blog_entry collection
    #
    # Or, that blog_entry might never have been seen by the user, which
    # means they don't even have a user_blog_entry document.
    entries_marked_false = ubes_false.count()

    ube_array = []
    for ube in ubes_false:
        # Anything that is marked false has aleady been counted already
        # so we don't want to double count it
        ube_array.append(ube['blog_entry_id'])
    for ube in ubes_true:
        ube_array.append(ube['blog_entry_id'])
    unmarked_entries = blog_entry.find({ 'blog_id' : blog.get_id(),
                                         '_id' : 
                                            { '$nin' : ube_array}}).count()
    return entries_marked_false + unmarked_entries

def get_user_blogs(user, load_entries):
    user_blogs = []
    connection = pymongo.Connection("mongodb://localhost", safe=True)

    # get a handle to the school database
    db=connection.reader
    blog = db.blog
    blog_entry = db.blog_entry
    user_blog_entry = db.user_blog_entry
    
    for bid in user.get_subs():
        cursor = blog.find({'_id' : bid})

        for doc in cursor:
            b = Blog()
            b.load_from_doc(doc)
            if True == load_entries:
                b.load_entries()
            b.set_unread_count(calc_unread_count(db, user, b))
            user_blogs.append(b)
    return user_blogs

class BlogEntry:
    def __init__(self, blog):
        self.entry_map = {}
        self.blog = blog

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
        blog_entry_table = db.blog_entry

        self.entry_map['blog_id'] = self.blog.get_id()
        new_doc = blog_entry_table.find_and_modify(query = {'link' : 
                                                   self.entry_map['link']}, 
                                                   update = self.entry_map, 
                                                   upsert = True, new = True)
        self.entry_map = new_doc

class Blog:

    def __init__(self):
        self.blog_map = {}
        self.entries = []
        self.unread_count = 0

    def set_unread_count(self, count):
        self.unread_count = count

    def get_unread_count(self):
        return self.unread_count

    def load_from_doc(self, blog_doc):
        self.blog_map = blog_doc
        self.entries = []

    def load_entries(self):
        self.entries = []

        connection = pymongo.Connection("mongodb://localhost", safe=True)

        db=connection.reader
        blog_entry_table = db.blog_entry
    
        cursor = blog_entry_table.find({'blog_id' : self.blog_map['_id']})

        for doc in cursor:
            entry = BlogEntry(self)
            entry.load_from_doc(doc)
            self.entries.append(entry)

    def load_from_feedparser(self, d):
        self.entries = []
        if 301 == d.status:
            self.blog_map['permanent_redirect_url'] = d.href
        if 410 == d.status:
            self.blog_map['permanently_removed'] = True
            self.blog_map['enabled'] = False
        if 401 == d.status:
            self.blog_map['requires_authentication'] = True
            self.blog_map['enabled'] = False
        if d.bozo:
            self.blog_map['bozo_bit_set'] = True

        if d.entries:
            for i in range(len(d.entries)):
                entry = BlogEntry(self)
                entry.load_from_feed(d.entries[i])
                self.entries.append(entry)

        if 'etag' in d:
            self.blog_map['etag'] = d.etag

        if 'modified_parsed' in d:
            tt = d.modified_parsed
            # pymongo doesn't understand time.time so convert to  datetime.datetime
            self.blog_map['modified_date'] = datetime.datetime(tt[0], tt[1], tt[2], tt[3], tt[4], tt[5])

        if 'title' in d.feed:
            self.blog_map['title'] = d.feed.title
        if 'link' in d.feed:
            self.blog_map['link'] = d.feed.link
        if 'description' in d.feed:
            self.blog_map['description'] = d.feed.description
        if 'image' in d.feed:
            self.blog_map['image_url'] = d.feed.image
        if 'published_parsed' in d.feed:
            tt = d.feed.published_parsed
            self.blog_map['published_date'] = datetime.datetime(tt[0], tt[1], tt[2], tt[3], tt[4], tt[5])

    def reload(self):
        d = feedparser.parse(self.blog_map['blog_url'])
        self.load_from_feedparser(d)

    def load_from_url(self, blog_url):
        self.blog_map['blog_url'] = blog_url
        self.blog_map['permanent_redirect_url'] = None
        self.blog_map['permanently_removed'] = False
        self.blog_map['requires_authentication'] = False
        self.blog_map['bozo_bit_set'] = False
        self.blog_map['enabled'] = True

        d = feedparser.parse(blog_url)
        self.load_from_feedparser(d)

    def is_bozo_bit_set(self):
        return self.blog_map['permanent_redirect_url'] is not None

    def is_permanently_redirected(self):
        return self.blog_map['permanent_redirect_url'] is not None

    def get_permanent_redirect_url(self):
        assert self.blog_map['permanent_redirect_url'] is not None
        return self.blog_map['permanent_redirect_url']

    def is_permanently_removed(self):
        return self.blog_map['permanently_removed']

    def is_authentication_required(self):
        return self.blog_map['requires_authentication']

    def is_enabled(self):
        return self.blog_map['enabled']

    def get_id(self):
        assert '_id' in self.blog_map
        return self.blog_map['_id']

    def get_url(self):
        return self.blog_map['blog_url']

    def get_etag(self):
        if 'etag' in self.blog_map:
            return self.blog_map['etag']
        return ''

    def get_modified_date(self):
        if 'modified_date' in self.blog_map:
            return self.blog_map['modified_date']
        return ''

    def get_title(self):
        if 'title' in self.blog_map:
            return self.blog_map['title']
        return ''

    def get_link(self):
        if 'link' in self.blog_map:
            return self.blog_map['link']
        return ''

    def get_description(self):
        if 'description' in self.blog_map:
            return self.blog_map['description']
        return ''

    def has_image_url(self):
        return 'image_url' in self.blog_map

    def get_image_url(self):
        assert self.has_image_url()
        return self.blog_map['image_url']

    def get_published_date(self):
        if 'published_date' in self.blog_map:
            return self.blog_map['published_date']
        return ''

    def get_entries(self):
        return self.entries

    def save(self):
        connection = pymongo.Connection("mongodb://localhost", safe=True)

        # get a handle to the school database
        db=connection.reader
        blog_table = db.blog

        new_doc = blog_table.find_and_modify(query = {'blog_url' : 
                                             self.blog_map['blog_url']}, 
                                             update = self.blog_map, upsert = True, new = True)
        self.blog_map = new_doc
        for e in self.get_entries():
            e.save()

def print_blog(blog):
    if blog.is_permanently_redirected():
        print 'Permanent redirect to %s' % (blog.get_permanent_redirect_url())
    if blog.is_permanently_removed():
        print 'Feed has been permanently removed'
    if blog.is_authentication_required():
        print 'Feed requires authentication, not yet supported'
    if blog.is_bozo_bit_set():
        print 'BOZO BIT SET'

    print 'etag: %s' % blog.get_etag()
    print 'modified: %s ' % (blog.get_modified_date())
    print 'Title: ' + blog.get_title().encode('ascii', 'ignore')
    print 'Link: ' + blog.get_link()
    print 'Description: ' + blog.get_description().encode('ascii', 'ignore')
    if blog.has_image_url():
        print 'Image URL: ' + blog.get_image_url()

    print 'Published: %s' % (blog.get_published_date())

    entries = blog.get_entries()
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


#blog = Blog()
#blog.load_from_url('http://feeds.feedburner.com/ImbibeUnfiltered')
#blog.load_from_url('http://feeds.harvardbusiness.org/harvardbusiness/')
#blog.load_from_url('http://feeds.feedburner.com/eater/nyc')
#blog.load_from_url('http://feeds.feedburner.com/DilbertDailyStrip')
#print_blog(blog)
#blog.save()
