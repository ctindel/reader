#!/usr/bin/python

import feedparser
import pymongo
import json
import bson
import time, datetime
import yaml
import copy
from singletonmixin import Singleton
#from elasticsearch import Elasticsearch

class Config(Singleton):
    def __init__(self):
        stream = open(file='config/config.yaml', mode='r')
        self.config = yaml.load(stream)
    def getDBURL(self):
        return self.config['db']['url']
    def getDBName(self):
        return self.config['db']['dbName']
#    def getElasticSearchHost(self):
#        return self.config['es']['host']
#    def getElasticSearchIndexName(self):
#        return self.config['es']['indexName']
#    def getElasticSearchFeedEntryDocType(self):
#        return self.config['es']['feedEntryDocType']
#
#es = Elasticsearch(
#    [Config.getInstance().getElasticSearchHost()],
#    use_ssl=False,
#    verify_certs=False,
#)

class MDBConnection(Singleton):

    def __init__(self):
        self.config = Config.getInstance()
        self.client = pymongo.MongoClient(self.config.getDBURL())
        self.db = self.client[self.config.getDBName()]
    def getDB(self):
        return self.db

class ESEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, bson.objectid.ObjectId):
            return str(obj)
        elif isinstance(obj, datetime.datetime):
            return obj.strftime('%Y-%m-%dT%H:%M:%S%z')
        elif isinstance(obj, time):
            return obj.strftime('%H:%M:%S')
        elif hasattr(obj, 'to_json'):
            return obj.to_json()
        else:
            return super(CustomEncoder, self).default(obj)

def getFeeds(filterMap):
    feeds = []

    # get a handle to the school database
    db=MDBConnection.getInstance().getDB()
    feed_table = db.feed
    
    cursor = feed_table.find(filterMap)

    for doc in cursor:
        #print `doc`     
        feed = Feed()
        feed.loadFromDoc(doc)
        feeds.append(feed)

    return feeds

def getNewFeeds():
    return getFeeds({'state' : 'new'})

def getActiveFeeds():
    return getFeeds({'state' : 'active'})

def getInactiveFeeds():
    return getFeeds({'state' : 'inactive'})

def get_all_feeds():
    return getFeeds({})

def calcUnreadCount(db, user, feed):
    feedEntry = db.feedEntry
    userFeedEntry = db.userFeedEntry

    ufes_false = userFeedEntry.find({'userID' : user.get_userID(), 
                                       'feedID':feed.getID(), 'read':False})

    ufes_true = userFeedEntry.find({'userID' : user.get_userID(), 
                                      'feedID':feed.getID(), 'read':True})
    # Entries might be unread because they were read, and then marked 
    # unread, which means they'll have a read:False entry in the 
    # userFeedEntry collection
    #
    # Or, that feedEntry might never have been seen by the user, which
    # means they don't even have a userFeedEntry document.
    entries_marked_false = ufes_false.count()

    ube_array = []
    for ube in ufes_false:
        # Anything that is marked false has aleady been counted already
        # so we don't want to double count it
        ube_array.append(ube['feedEntryID'])
    for ube in ufes_true:
        ube_array.append(ube['feedEntryID'])
    unmarked_entries = feedEntry.find({ 'feedID' : feed.getID(),
                                         '_id' : 
                                            { '$nin' : ube_array}}).count()
    return entries_marked_false + unmarked_entries

def getUserFeeds(user, loadEntries):
    user_feeds = []

    db=MDBConnection.getInstance().getDB()
    feed = db.feed
    feedEntry = db.feedEntry
    userFeedEntry = db.userFeedEntry
    
    for fid in user.get_subs():
        cursor = feed.find({'_id' : fid})

        for doc in cursor:
            f = Feed()
            f.loadFromDoc(doc)
            if True == loadEntries:
                f.loadEntries()
            f.setUnreadCount(calcUnreadCount(db, user, f))
            user_feeds.append(f)
    return user_feeds

class FeedEntry:
    def __init__(self, feed):
        self.entry_map = {}
        self.feed = feed

    # _id is a reserved key in elastic search so we need
    #  to store this value as mongoID instead
#    def getAsElasticSearchDict(self):
#        esDict = copy.deepcopy(self.entry_map)
#        esDict['mongoID'] = esDict['_id']
#        del esDict['_id']
#        return esDict

    def loadFromFeed(self, entry):
        if 'title' in entry:
            self.entry_map['title'] = entry.title

        if 'link' in entry:
            self.entry_map['link'] = entry.link

        if 'description' in entry:
            self.entry_map['description'] = entry.description

        if 'published_parsed' in entry:
            # pymongo doesn't understand time.time so convert to  datetime.datetime
            tt = entry.published_parsed
            self.entry_map['publishedDate'] = datetime.datetime(tt[0], tt[1], tt[2], tt[3], tt[4], tt[5])

        if 'id' in entry:
            self.entry_map['entryID'] = entry.id

        if 'summary' in entry:
            self.entry_map['summary'] = entry.summary

        if 'content' in entry:
            self.entry_map['content'] = entry.content

    def loadFromDoc(self, entry_doc):
        self.entry_map = entry_doc

    def getID(self):
        return self.entry_map['_id']

    def getTitle(self):
        if 'title' in self.entry_map:
            return self.entry_map['title']
        return ''

    def getLink(self):
        if 'link' in self.entry_map:
            return self.entry_map['link']
        return ''

    def getDescription(self):
        if 'description' in self.entry_map:
            return self.entry_map['description']
        return ''

    def getPublishedDate(self):
        if 'publishedDate' in self.entry_map:
            return self.entry_map['publishedDate']
        return ''

    def getEntryID(self):
        if 'id' in self.entry_map:
            return self.entry_map['entryID']
        return None

    def getSummary(self):
        if 'summary' in self.entry_map:
            return self.entry_map['summary']
        return ''

    def getContent(self):
        if 'content' in self.entry_map:
            return self.entry_map['content']
        return ''

    def save(self):

        db = MDBConnection.getInstance().getDB()
        feedEntry_table = db.feedEntry

        self.entry_map['feedID'] = self.feed.getID()
        new_doc = feedEntry_table.find_and_modify(query = {'link' : 
                                                   self.entry_map['link']}, 
                                                   update = self.entry_map, 
                                                   upsert = True, new = True)
        self.entry_map = new_doc
#        esBody = json.loads(json.dumps(self.getAsElasticSearchDict(), cls=ESEncoder))
#        es.index(
#            index = Config.getInstance().getElasticSearchIndexName(),
#            doc_type=Config.getInstance().getElasticSearchFeedEntryDocType(),
#            id=self.getID(), 
#            body = esBody)

class Feed:

# state can be:
#   new: It was just added by a user.  Once we
#   validate that it is still serving content
#   and we can grab feed entries it will move
#   to active state.
# active: The feed is still live and serving content
# inactive: The feed is no longer serving content
#   but the feed has not told us it was
#   permanently removed.
#   Users can still subscribe to it and read
#   old content.  We will check to see if the
#   feeds have come back online every so
#   often (maybe once per day)

    def __init__(self):
        self.feed_map = {}
        self.entries = []
        self.unread_count = 0
        self.feed_map['state'] = 'new'

    # _id is a reserved key in elastic search so we need
    #  to store this value as mongoID instead
#    def getAsElasticSearchDict(self):
#        esDict = copy.deepcopy(self.feed_map)
#        esDict['mongoID'] = esDict['_id']
#        del esDict['_id']
#        return esDict

    def setUnreadCount(self, count):
        self.unread_count = count

    def getUnreadCount(self):
        return self.unread_count

    def loadFromDoc(self, feed_doc):
        self.feed_map = feed_doc
        self.entries = []

    def loadEntries(self):
        self.entries = []

        db = MDBConnection.getInstance().getDB()

        feedEntry_table = db.feedEntry
    
        cursor = feedEntry_table.find({'feedID' : self.feed_map['_id']})

        for doc in cursor:
            entry = FeedEntry(self)
            entry.loadFromDoc(doc)
            self.entries.append(entry)

    def loadFromFeedparser(self, d):
        self.entries = []
        self.feed_map['state'] = 'active'
        if d.bozo:
            self.feed_map['bozoBitSet'] = True
            self.feed_map['bozoException'] = d.bozo_exception
            print(d.bozo_exception)
            self.feed_map['enabled'] = False
            self.feed_map['state'] = 'bozo'
            self.feed_map['error'] = 'Feed is unparseable, we will not be loading or parsing this feed'
            return
        if 301 == d.status:
            self.feed_map['permanentRedirectURL'] = d.href
            self.feed_map['state'] = 'inactive'
            self.feed_map['error'] = 'Permanently Redirected'
        elif 410 == d.status:
            self.feed_map['permanentlyRemoved'] = True
            self.feed_map['enabled'] = False
            self.feed_map['state'] = 'inactive'
            self.feed_map['error'] = 'Permanently Removed'
        elif 401 == d.status:
            self.feed_map['requiresAuthentication'] = True
            self.feed_map['enabled'] = False
            self.feed_map['state'] = 'inactive'
            self.feed_map['error'] = 'Requires Authentication'

        if d.entries:
            for i in range(len(d.entries)):
                entry = FeedEntry(self)
                entry.loadFromFeed(d.entries[i])
                self.entries.append(entry)

        if 'etag' in d:
            self.feed_map['etag'] = d.etag

        if 'modified_parsed' in d:
            tt = d.modified_parsed
            # pymongo doesn't understand time.time so convert to  datetime.datetime
            self.feed_map['modifiedDate'] = datetime.datetime(tt[0], tt[1], tt[2], tt[3], tt[4], tt[5])

        if 'title' in d.feed:
            self.feed_map['title'] = d.feed.title
        if 'link' in d.feed:
            self.feed_map['link'] = d.feed.link
        if 'description' in d.feed:
            self.feed_map['description'] = d.feed.description
        if 'image' in d.feed:
            self.feed_map['imageURL'] = d.feed.image
        if 'published_parsed' in d.feed:
            tt = d.feed.published_parsed
            self.feed_map['publishedDate'] = datetime.datetime(tt[0], tt[1], tt[2], tt[3], tt[4], tt[5])

    def reload(self):
        d = feedparser.parse(self.feed_map['feedURL'])
        self.loadFromFeedparser(d)

    def loadFromURL(self, feedURL):
        self.feed_map['feedURL'] = feedURL
        self.feed_map['permanentRedirectURL'] = None
        self.feed_map['permanentlyRemoved'] = False
        self.feed_map['requiresAuthentication'] = False
        self.feed_map['bozoBitSet'] = False

        d = feedparser.parse(feedURL)
        self.loadFromFeedparser(d)

    def isBozoBitSet(self):
        return 'bozoBitSet' in self.feed_map and \
               self.feed_map['bozoBitSet'] is True \

    def isPermanentlyRedirected(self):
        return 'permanentRedirectURL' in self.feed_map and \
               self.feed_map['permanentRedirectURL'] is not None

    def getPermanentRedirectURL(self):
        assert self.feed_map['permanentRedirectURL'] is not None
        return self.feed_map['permanentRedirectURL']

    def getFeedURL(self):
        if 'permanentRedirectURL' in self.feed_map:
            assert self.feed_map['permanentRedirectURL'] is not None
        return self.feed_map['feedURL']

    def isPermanentlyRemoved(self):
        return 'permanentlyRemoved' in self.feed_map and \
               self.feed_map['permanentlyRemoved']

    def isAuthenticationRequired(self):
        return 'requiresAuthentication' in self.feed_map and \
               self.feed_map['requiresAuthentication']

    def isActive(self):
        return self.feed_map['state'] == 'active'

    def getID(self):
        assert '_id' in self.feed_map
        return self.feed_map['_id']

    def getURL(self):
        return self.feed_map['feedURL']

    def getEtag(self):
        if 'etag' in self.feed_map:
            return self.feed_map['etag']
        return ''

    def getModifiedDate(self):
        if 'modifiedDate' in self.feed_map:
            return self.feed_map['modifiedDate']
        return ''

    def getTitle(self):
        if 'title' in self.feed_map:
            return self.feed_map['title']
        return ''

    def getLink(self):
        if 'link' in self.feed_map:
            return self.feed_map['link']
        return ''

    def getDescription(self):
        if 'description' in self.feed_map:
            return self.feed_map['description']
        return ''

    def hasImageURL(self):
        return 'imageURL' in self.feed_map

    def getImageURL(self):
        assert self.hasImageURL()
        return self.feed_map['imageURL']

    def getPublishedDate(self):
        if 'publishedDate' in self.feed_map:
            return self.feed_map['publishedDate']
        return ''

    def getEntries(self):
        return self.entries

    def updateEntryReadVal(self, user, entryID, read_val):
        db = MDBConnection.getInstance().getDB()
        userFeedEntry_table = db.userFeedEntry

        found_entry = False

        for e in self.getEntries():
            if str(e.getID()) == entryID:
                found_entry = True

                new_doc = userFeedEntry_table.find_and_modify(
                    query = {'userID' : user.get_userID(), 'feedID' : self.getID(), 
                             'feedEntryID' : bson.objectid.ObjectId(entryID)}, 
                    update = {'read': read_val, 
                              'userID' : user.get_userID(),
                              'feedID' : self.getID(),
                              'feedEntryID' : bson.objectid.ObjectId(entryID)},
                    upsert = True,
                    new = True)

        return found_entry
        
    def save(self):
        db = MDBConnection.getInstance().getDB()
        feed_table = db.feed

        new_doc = feed_table.find_and_modify(query = {'feedURL' : 
                                             self.feed_map['feedURL']}, 
                                             update = self.feed_map, upsert = True, new = True)
        self.feed_map = new_doc
        for e in self.getEntries():
            e.save()

def printFeed(feed):
    if feed.isBozoBitSet():
        print('Bozo bit set for feed ' + feed.feed_map['feedURL'] + ', we will not be trying to parse this feed')
        print(feed.feed_map['bozoException'])
        return
    if feed.isPermanentlyRedirected():
        print('Permanent redirect to %s' % (feed.getPermanentRedirectURL()))
    if feed.isPermanentlyRemoved():
        print('Feed has been permanently removed')
    if feed.isAuthenticationRequired():
        print('Feed requires authentication, not y)et supported')

    print('etag: %s' % feed.getEtag())
    print('modified: %s ' % (feed.getModifiedDate()))
    print('Title: %s' % feed.getTitle().encode('ascii', 'ignore'))
    print('Link: ' + feed.getLink())
    print('Description: %s' % feed.getDescription().encode('ascii', 'ignore'))
    if feed.hasImageURL():
        print('Image URL: ' + feed.getImageURL())

    print('Published: %s' % (feed.getPublishedDate()))

    entries = feed.getEntries()
    print('Num Entries %d' % len(entries))

    print('\n')

    for i in range(len(entries)):
        print('Entry[%d].title: %s' % (i, entries[i].getTitle().encode('ascii', 'ignore')))
        print('Entry[%d].link: %s' % (i, entries[i].getLink()))
        print('Entry[%d].description: %s' % (i, entries[i].getDescription().encode('ascii', 'ignore')))
        print('Entry[%d].published: %s' % (i, entries[i].getPublishedDate()))
        print('Entry[%d].id: %s' % (i, entries[i].getEntryID()))
        print('Entry[%d].summary: %s' % (i, entries[i].getSummary().encode('ascii', 'ignore')))
        print('Entry[%d].content: %s' % (i, entries[i].getContent()))


feed = Feed()
#feed.loadFromURL('http://imbibemagazine.com/category/article/cocktails-spirits-article/feed')
# this hbr feed is a good example of a feed that fails
#feed.loadFromURL('https://feeds.hbr.org/harvardbusiness')
#feed.loadFromURL('https://ny.eater.com/rss/index.xml')
#feed.loadFromURL('http://feeds.feedburner.com/DilbertDailyStrip')
feed.loadFromURL('https://lifehacker.com/rss')
printFeed(feed)
feed.save()
