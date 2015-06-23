TEST_USERS = require('/tmp/readerTestCreds.js');

var frisby = require('frisby');
var async = require('async');
var config = require('../config/environment');

var dilbertBlogFeedURL = 'http://feed.dilbert.com/dilbert/blog';
var nycEaterFeedURL = 'http://feeds.feedburner.com/eater/nyc';

var uri = config.test.apiServerURI;
var user = TEST_USERS[0];

frisby.create('GET feed list for user ' + user.email)
    .get(uri + '/feeds')
    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
    .expectStatus(200)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectJSONLength('feeds', 2)
    .expectJSONTypes('feeds.*', {unreadCount : Number})
    .afterJSON(function markFeedAsRead(res1) {
        frisby.create('PUT mark second feed read for user ' + user.email)
            .put(uri + '/feeds/' + res1.feeds[1]._id,
                 {'read' : 'true'})
            .addHeader('Authorization', 'Bearer ' + user.token.access_token)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSON('feed', 
                        {'unreadCount' : 0 })
            .afterJSON(function getSecondFeed(res2) {
                frisby.create('GET second feed for user ' + user.email)
                    .get(uri + '/feeds/' + res1.feeds[1]._id + '/entries?unreadOnly=false')
                    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSONLength('feed.unreadEntries', 0)
                    // We add 1 to unreadCount because the previous test
                    // case (feed_entry_read_spec.js) had marked a single 
                    // entry as read already
                    .expectJSONLength('feed.readEntries', res1.feeds[1].unreadCount+1)
                    .toss()

                frisby.create('GET feed list again for user ' + user.email)
                    .get(uri + '/feeds')
                    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSON('feeds.1', {unreadCount : 0})
                    .toss()
            })
            .toss()
    })
    .toss()
