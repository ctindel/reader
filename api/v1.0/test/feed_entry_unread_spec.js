TEST_USERS = require('/tmp/readerTestCreds.js');

var frisby = require('frisby');
var tc = require('./config/test_config');
var async = require('async');
var dbConfig = require('./config/db.js');

var dilbertBlogFeedURL = 'http://feed.dilbert.com/dilbert/blog';
var nycEaterFeedURL = 'http://feeds.feedburner.com/eater/nyc';

var user = TEST_USERS[0];
frisby.create('GET feed list for user ' + user.email)
    .get(tc.url + '/feeds')
    .auth(user.sp_api_key_id, user.sp_api_key_secret)
    .expectStatus(200)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectJSONLength('feeds', 2)
    .expectJSONTypes('feeds.*', {unreadCount : Number})
    .afterJSON(function getSingleFeed(res1) {
        frisby.create('GET second feed for user ' + user.email)
            .get(tc.url + '/feeds/' + res1.feeds[1]._id + '/entries?unreadOnly=false')
            .auth(user.sp_api_key_id, user.sp_api_key_secret)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSONLength('feed.unreadEntries', 0)
            .afterJSON(function markEntryUnread(res2) {
                frisby.create('PUT mark second feed entry unread for user ' + user.email)
                    .put(tc.url + '/feeds/' + res2.feed._id + '/entries/' 
                         + res2.feed.readEntries[1]._id,
                         {'read' : 'false'})
                    .auth(user.sp_api_key_id, user.sp_api_key_secret)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSON('feed', 
                                {'unreadCount' : 1,
                                 _id : res2.feed._id})
                    .afterJSON(function getFeedAgain(res3) {
                        frisby.create('GET second feed again for user ' + user.email)
                            .get(tc.url + '/feeds/' + res1.feeds[1]._id + '/entries?unreadOnly=false')
                            .auth(user.sp_api_key_id, user.sp_api_key_secret)
                            .expectStatus(200)
                            .expectHeader('Content-Type', 'application/json; charset=utf-8')
                            .expectJSONLength('feed.unreadEntries', 1)
                            .expectJSONLength('feed.readEntries', res2.feed.readEntries.length - 1)
                            .expectJSON('feed.unreadEntries.0', 
                                        { _id : res2.feed.readEntries[1]._id})
                            .toss()
                    })
                    .toss()
            })
            .toss()
    })
    .toss()
