TEST_USERS = require('/tmp/readerTestCreds.js');

var frisby = require('frisby');
var async = require('async');
var config = require('../config/environment');

var lifeHackerFeedURL = 'http://lifehacker.com/rss';
var dilbertBlogFeedURL = 'http://feed.dilbert.com/dilbert/blog';
var nycEaterFeedURL = 'http://feeds.feedburner.com/eater/nyc';

var uri = config.test.apiServerURI;

unsubTestArray = [
    function unsubInvalidFeed(callback) {
        var user = TEST_USERS[0];
        frisby.create('DELETE unsubscribe invalid feed for user ' + user.email)
            .delete(uri + '/feeds/1234')
            .addHeader('Authorization', 'Bearer ' + user.token.access_token)
            .expectStatus(404)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSON({'error' : 'User not subscribed to feed 1234'})
            .toss()
        callback(null);
    },
    function unsubSecondFeed(callback) {
        var user = TEST_USERS[0];
        frisby.create('DELETE unsubscribe second feed part 1 for user ' + user.email)
            .get(uri + '/feeds')
            .addHeader('Authorization', 'Bearer ' + user.token.access_token)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSONLength('feeds', 2)
            .expectJSONTypes('feeds.*', {unreadCount : Number})
            .afterJSON(function unsub(res1) {
                frisby.create('DELETE unsubscribe second feed part 2 for user ' + user.email)
                    .delete(uri + '/feeds/' + res1.feeds[1]._id)
                    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSONLength('user.subs', 1)
                    .afterJSON(function getFeedsAgain(res2) {
                        frisby.create('DELETE unsubscribe second feed part 3 for user ' + user.email)
                            .get(uri + '/feeds')
                            .addHeader('Authorization', 'Bearer ' + user.token.access_token)
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
            .get(uri + '/feeds')
            .addHeader('Authorization', 'Bearer ' + user.token.access_token)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSONLength('feeds', 1)
            .expectJSONTypes('feeds.*', {unreadCount : Number})
            .afterJSON(function unsub(res1) {
                frisby.create('DELETE unsubscribe last feed part 2 for user ' + user.email)
                    .delete(uri + '/feeds/' + res1.feeds[0]._id)
                    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSONLength('user.subs', 0)
                    .afterJSON(function getFeedsAgain(res2) {
                        frisby.create('DELETE unsubscribe second feed part 3 for user ' + user.email)
                            .get(uri + '/feeds')
                            .addHeader('Authorization', 'Bearer ' + user.token.access_token)
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
