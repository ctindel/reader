TEST_USERS = require('/tmp/readerTestCreds.js');

var frisby = require('frisby');
var async = require('async');
var config = require('../config/environment');

var dilbertBlogFeedURL = 'http://feed.dilbert.com/dilbert/blog';
var nycEaterFeedURL = 'http://feeds.feedburner.com/eater/nyc';

var uri = config.test.apiServerURI;

feedTestArray = [
    function getFeedsFirstUser(callback) {
        var user = TEST_USERS[0];
        frisby.create('GET feed list for user ' + user.email)
            .get(uri + '/feeds?includeUnreadIDs=true')
            .addHeader('Authorization', 'Bearer ' + user.token.access_token)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSONLength('feeds', 2)
            .expectJSONTypes('feeds.*', {unreadCount : Number, unreadEntryIDs : Array})
            .afterJSON(function getSingleFeed(res1) {
                frisby.create('GET first feed unread entries for user ' + user.email)
                    .get(uri + '/feeds/' + res1.feeds[0]._id + '/entries?unreadOnly=true')
                    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSONLength('feed.unreadEntries', res1.feeds[0].unreadCount)
                    .toss()

                frisby.create('GET first feed all entries for user ' + user.email)
                    .get(uri + '/feeds/' + res1.feeds[0]._id + '/entries?unreadOnly=false')
                    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSONLength('feed.unreadEntries', res1.feeds[0].unreadCount)
                    .toss()

                frisby.create('GET second feed unread entries for user ' + user.email)
                    .get(uri + '/feeds/' + res1.feeds[1]._id + '/entries?unreadOnly=true')
                    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSONLength('feed.unreadEntries', res1.feeds[1].unreadCount)
                    .toss()

                frisby.create('GET second feed all entries for user ' + user.email)
                    .get(uri + '/feeds/' + res1.feeds[1]._id + '/entries?unreadOnly=false')
                    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
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
            .get(uri + '/feeds')
            .addHeader('Authorization', 'Bearer ' + user.token.access_token)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSONLength('feeds', 1)
            .expectJSONTypes('feeds.*', {unreadCount : Number})
            .afterJSON(function getSingleFeed(res1) {
                frisby.create('GET first feed unread entries for user ' + user.email)
                    .get(uri + '/feeds/' + res1.feeds[0]._id + '/entries?unreadOnly=true')
                    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSONLength('feed.unreadEntries', res1.feeds[0].unreadCount)
                    .toss()

                frisby.create('GET first feed all entries for user ' + user.email)
                    .get(uri + '/feeds/' + res1.feeds[0]._id + '/entries?unreadOnly=false')
                    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
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
