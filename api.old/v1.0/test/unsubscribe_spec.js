TEST_USERS = require('/tmp/readerTestCreds.js');

var frisby = require('frisby');
var tc = require('./config/test_config');
var async = require('async');
var dbConfig = require('./config/db.js');

var lifeHackerFeedURL = 'http://lifehacker.com/rss';
var dilbertBlogFeedURL = 'http://feed.dilbert.com/dilbert/blog';
var nycEaterFeedURL = 'http://feeds.feedburner.com/eater/nyc';

unsubTestArray = [
    function unsubInvalidFeed(callback) {
        var user = TEST_USERS[0];
        frisby.create('DELETE unsubscribe invalid feed for user ' + user.email)
            .delete(tc.url + '/feeds/1234')
            .auth(user.sp_api_key_id, user.sp_api_key_secret)
            .expectStatus(404)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSON({'error' : 'User not subscribed to feed 1234'})
            .toss()
        callback(null);
    },
    function unsubSecondFeed(callback) {
        var user = TEST_USERS[0];
        frisby.create('DELETE unsubscribe second feed part 1 for user ' + user.email)
            .get(tc.url + '/feeds')
            .auth(user.sp_api_key_id, user.sp_api_key_secret)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSONLength('feeds', 2)
            .expectJSONTypes('feeds.*', {unreadCount : Number})
            .afterJSON(function unsub(res1) {
                frisby.create('DELETE unsubscribe second feed part 2 for user ' + user.email)
                    .delete(tc.url + '/feeds/' + res1.feeds[1]._id)
                    .auth(user.sp_api_key_id, user.sp_api_key_secret)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSONLength('user.subs', 1)
                    .afterJSON(function getFeedsAgain(res2) {
                        frisby.create('DELETE unsubscribe second feed part 3 for user ' + user.email)
                            .get(tc.url + '/feeds')
                            .auth(user.sp_api_key_id, user.sp_api_key_secret)
                            .expectStatus(200)
                            .expectHeader('Content-Type', 'application/json; charset=utf-8')
                            .expectJSONLength('feeds', 1)
                            .expectJSONTypes('feeds.*', {unreadCount : Number})
                            .toss()
                    })
                    .toss()
            })
            .toss()
        callback(null);
    },
    function unsubLastFeed(callback) {
        var user = TEST_USERS[1];
        frisby.create('DELETE unsubscribe last feed part 1 for user ' + user.email)
            .get(tc.url + '/feeds')
            .auth(user.sp_api_key_id, user.sp_api_key_secret)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSONLength('feeds', 1)
            .expectJSONTypes('feeds.*', {unreadCount : Number})
            .afterJSON(function unsub(res1) {
                frisby.create('DELETE unsubscribe last feed part 2 for user ' + user.email)
                    .delete(tc.url + '/feeds/' + res1.feeds[0]._id)
                    .auth(user.sp_api_key_id, user.sp_api_key_secret)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSONLength('user.subs', 0)
                    .afterJSON(function getFeedsAgain(res2) {
                        frisby.create('DELETE unsubscribe second feed part 3 for user ' + user.email)
                            .get(tc.url + '/feeds')
                            .auth(user.sp_api_key_id, user.sp_api_key_secret)
                            .expectStatus(200)
                            .expectHeader('Content-Type', 'application/json; charset=utf-8')
                            .expectJSONLength('feeds', 0)
                            .expectJSONTypes('feeds.*', {unreadCount : Number})
                            .toss()
                    })
                    .toss()
            })
            .toss()
        callback(null);
    },
]

async.series(unsubTestArray);
