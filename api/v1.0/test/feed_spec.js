TEST_USERS = require('/tmp/readerTestCreds.js');

var frisby = require('frisby');
var tc = require('./config/test_config');
var async = require('async');
var dbConfig = require('./config/db.js');

var dilbertBlogFeedURL = 'http://feed.dilbert.com/dilbert/blog';
var nycEaterFeedURL = 'http://feeds.feedburner.com/eater/nyc';

feedTestArray = [
    function getFeedsFirstUser(callback) {
        var user = TEST_USERS[0];
        frisby.create('GET feed list for user ' + user.email)
            .get(tc.url + '/feeds')
            .auth(user.sp_api_key_id, user.sp_api_key_secret)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSONLength('feeds', 2)
            .expectJSONTypes('feeds.*', {unreadCount : Number})
            .afterJSON(function getSingleFeed(res1) {
                frisby.create('GET first feed unread entries for user ' + user.email)
                    .get(tc.url + '/feeds/' + res1.feeds[0]._id + '/entries?unreadOnly=true')
                    .auth(user.sp_api_key_id, user.sp_api_key_secret)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSONLength('feed.unreadEntries', res1.feeds[0].unreadCount)
                    .toss()

                frisby.create('GET first feed all entries for user ' + user.email)
                    .get(tc.url + '/feeds/' + res1.feeds[0]._id + '/entries?unreadOnly=false')
                    .auth(user.sp_api_key_id, user.sp_api_key_secret)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSONLength('feed.unreadEntries', res1.feeds[0].unreadCount)
                    .toss()

                frisby.create('GET second feed unread entries for user ' + user.email)
                    .get(tc.url + '/feeds/' + res1.feeds[1]._id + '/entries?unreadOnly=true')
                    .auth(user.sp_api_key_id, user.sp_api_key_secret)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSONLength('feed.unreadEntries', res1.feeds[1].unreadCount)
                    .toss()

                frisby.create('GET second feed all entries for user ' + user.email)
                    .get(tc.url + '/feeds/' + res1.feeds[1]._id + '/entries?unreadOnly=false')
                    .auth(user.sp_api_key_id, user.sp_api_key_secret)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSONLength('feed.unreadEntries', res1.feeds[1].unreadCount)
                    .toss()
            })
            .toss()
            callback(null);
        },
    function getFeedsSecondUser(callback) {
        var user = TEST_USERS[1];
        frisby.create('GET feed list for user ' + user.email)
            .get(tc.url + '/feeds')
            .auth(user.sp_api_key_id, user.sp_api_key_secret)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSONLength('feeds', 1)
            .expectJSONTypes('feeds.*', {unreadCount : Number})
            .afterJSON(function getSingleFeed(res1) {
                frisby.create('GET first feed unread entries for user ' + user.email)
                    .get(tc.url + '/feeds/' + res1.feeds[0]._id + '/entries?unreadOnly=true')
                    .auth(user.sp_api_key_id, user.sp_api_key_secret)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSONLength('feed.unreadEntries', res1.feeds[0].unreadCount)
                    .toss()

                frisby.create('GET first feed all entries for user ' + user.email)
                    .get(tc.url + '/feeds/' + res1.feeds[0]._id + '/entries?unreadOnly=false')
                    .auth(user.sp_api_key_id, user.sp_api_key_secret)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSONLength('feed.unreadEntries', res1.feeds[0].unreadCount)
                    .toss()
            })
            .toss()
            callback(null);
        },
]

async.series(feedTestArray);
