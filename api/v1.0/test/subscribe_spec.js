TEST_USERS = require('/tmp/readerTestCreds.js');

var frisby = require('frisby');
var tc = require('./config/test_config');
var async = require('async');
var dbConfig = require('./config/db.js');

var lifeHackerFeedURL = 'http://lifehacker.com/rss';
var dilbertBlogFeedURL = 'http://feed.dilbert.com/dilbert/blog';
var nycEaterFeedURL = 'http://feeds.feedburner.com/eater/nyc';

feedTestArray = [
    function addEmptyFeedListTest(callback) {
        var user = TEST_USERS[0];
        frisby.create('GET empty feed list for user ' + user.email)
            .get(tc.url + '/feeds')
            .auth(user.sp_api_key_id, user.sp_api_key_secret)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSON({feeds : []})
            .toss()
        callback(null);
    },
    function subOneFeed(callback) {
        var user = TEST_USERS[0];
        frisby.create('PUT Add feed sub for user ' + user.email)
            .put(tc.url + '/feeds/subscribe',
                 {'feedURL' : dilbertBlogFeedURL})
            .auth(user.sp_api_key_id, user.sp_api_key_secret)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSONLength('user.subs', 1)
            .toss()
        callback(null);
    },
    function subDuplicateFeed(callback) {
        var user = TEST_USERS[0];
        frisby.create('PUT Add duplicate feed sub for user ' + user.email)
            .put(tc.url + '/feeds/subscribe',
                 {'feedURL' : dilbertBlogFeedURL})
            .auth(user.sp_api_key_id, user.sp_api_key_secret)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSONLength('user.subs', 1)
            .toss()
        callback(null);
    },
    function subSecondFeed(callback) {
        var user = TEST_USERS[0];
        frisby.create('PUT Add second feed sub for user ' + user.email)
            .put(tc.url + '/feeds/subscribe',
                 {'feedURL' : nycEaterFeedURL})
            .auth(user.sp_api_key_id, user.sp_api_key_secret)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSONLength('user.subs', 2)
            .toss()
        callback(null);
    },
    function subOneFeedSecondUser(callback) {
        var user = TEST_USERS[1];
        frisby.create('PUT Add one feed sub for second user ' + user.email)
            .put(tc.url + '/feeds/subscribe',
                 {'feedURL' : nycEaterFeedURL})
            .auth(user.sp_api_key_id, user.sp_api_key_secret)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSONLength('user.subs', 1)
            .toss()
        callback(null);
    }
]

async.series(feedTestArray);
