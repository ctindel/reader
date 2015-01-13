#!/usr/bin/python

from flask import Flask, request, abort
from tools import jsonify
import pymongo
from userDAO import UserDAO
import re

app = Flask(__name__)

SECRET_KEY = "yeah, not actually a secret"
DEBUG = True

app.config.from_object(__name__)

CONNECTION_STRING = "mongodb://localhost"
CTINDEL_API_KEY = 'mwkMqTWFnK0LzJHyfkeBGoS2hr2KG7WhHqSGX0SbDJ4'
connection = pymongo.MongoClient(CONNECTION_STRING)
db = connection.reader

users = UserDAO(db)

@app.route('/api/v1/feeds', methods=['GET'])
def api_get_user_feeds():
    user = users.load_user_by_apikey(request.args['apikey'])
    feeds = current_user.get_feeds_as_dict(False)
    return jsonify(feeds)

@app.route('/api/v1/feeds/entries', methods=['GET'])
def api_get_user_feed_entries():
    user = users.load_user_by_apikey(request.args['apikey'])
    feeds = current_user.get_feeds_as_dict(True)
    return jsonify(feeds)

@app.route('/api/v1/feeds/<feedid>/entries', methods=['GET'])
def api_get_user_feed_entries_by_feed(feedid):
    user = users.load_user_by_apikey(request.args['apikey'])
    feeds = current_user.get_feeds_as_dict(True)
    for f in feeds['feeds']:
        if str(f['_id']) == str(feedid):
            return jsonify(f)
    abort(400)

@app.route('/api/v1/feeds/<feedid>/entries/<entryid>', methods=['PUT'])
def api_put_user_feed_entry(feedid, entryid):
    read_val = True
    found_entry = False

    if not request.args.has_key('apikey'):
        abort(400)
    if not request.args.has_key('read'):
        abort(400)
    if 'true' == request.args['read'].lower():
        read_val = True
    elif 'false' == request.args['read'].lower():
        read_val = False
    else:
        abort(400)

    user = users.load_user_by_apikey(request.args['apikey'])
    feeds = current_user.get_feeds(True)
    for f in feeds:
        if str(f.get_id()) == str(feedid):
            print "entry_id " + entryid
            found_entry = f.update_entry_read_val(user, entryid, read_val)
            return 200

    if not found_entry:
        abort(400)

if __name__ == "__main__":
    app.run()
