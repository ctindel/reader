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
    .afterJSON(function getSingleFeed(res1) {
        frisby.create('GET second feed for user ' + user.email)
            .get(uri + '/feeds/' + res1.feeds[1]._id + '/entries?unreadOnly=true')
            .addHeader('Authorization', 'Bearer ' + user.token.access_token)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSONLength('feed.unreadEntries', res1.feeds[1].unreadCount)
            .afterJSON(function markEntryRead(res2) {
                frisby.create('PUT mark second feed entry read for user ' + user.email)
                    .put(uri + '/feeds/' + res2.feed._id + '/entries/' 
                         + res2.feed.unreadEntries[1]._id,
                         {'read' : 'true'})
                    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSON('feed', 
                                {'unreadCount' : res2.feed.unreadCount - 1,
                                 _id : res2.feed._id})
                    .afterJSON(function getFeedAgain(res3) {
                        frisby.create('GET second feed again for user ' + user.email)
                            .get(uri + '/feeds/' + res1.feeds[1]._id + '/entries?unreadOnly=false')
                            .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                            .expectStatus(200)
                            .expectHeader('Content-Type', 'application/json; charset=utf-8')
                            .expectJSONLength('feed.unreadEntries', res1.feeds[1].unreadCount - 1)
                            .expectJSON('feed.readEntries.0', 
                                        { _id : res2.feed.unreadEntries[1]._id})
                            .toss()
                    })
                    .toss()
            })
            .toss()
    })
    .toss()
