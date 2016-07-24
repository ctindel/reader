TEST_USERS = require('/tmp/readerTestCreds.js');

var frisby = require('frisby');
var async = require('async');
var config = require('../config/environment');

var dilbertBlogFeedURL = 'http://feed.dilbert.com/dilbert/blog';
var nycEaterFeedURL = 'http://feeds.feedburner.com/eater/nyc';

var dilbertSearchQuery = 'dilbert';
var eaterSearchQuery = 'restaurant';

var DEFAULT_COUNT_PER_PAGE = 25;

var uri = config.test.apiServerURI;

feedTestArray = [
    function searchFeedsFirstUser(callback) {
        var user = TEST_USERS[0];

        frisby.create('GET feed list for user ' + user.email)
            .get(uri + '/feeds?includeUnreadIDs=true')
            .addHeader('Authorization', 'Bearer ' + user.token.access_token)
            .expectStatus(200)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectJSONLength('feeds', 2)
            .expectJSONTypes('feeds.*', {unreadCount : Number, unreadEntryIDs : Array})
            .afterJSON(function searchFirstFeedPage1(res1) {
                frisby.create('GET search first feed page 1 for user ' + user.email)
                    .get(uri + '/feeds/' + res1.feeds[0]._id + '/search?searchQuery=' + dilbertSearchQuery)
                    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSON(
                        {
                            'feedID' : res1.feeds[0]._id,
                            'searchQuery' : dilbertSearchQuery,
                            'pageIndex' : 0
                        })
                    .expectJSONLength('entries', DEFAULT_COUNT_PER_PAGE)
                    .afterJSON(function searchFirstFeedPage2(res2) {
                        params = 'searchQuery=' + dilbertSearchQuery +
                            '&pageIndex=1&countPerPage=' + DEFAULT_COUNT_PER_PAGE;
                        frisby.create('GET search first feed page 2 for user ' + user.email)
                            .get(uri + '/feeds/' + res1.feeds[0]._id + '/search?' + params)
                            .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                            .expectStatus(200)
                            .expectHeader('Content-Type', 'application/json; charset=utf-8')
                            .expectJSON(
                                {
                                    'feedID' : res1.feeds[0]._id,
                                    'searchQuery' : dilbertSearchQuery,
                                    'pageIndex' : 1
                                })
                            .expectJSONLength('entries', DEFAULT_COUNT_PER_PAGE)
                            .toss()
                    })
                    .toss()

                frisby.create('GET search second feed page 1 for user ' + user.email)
                    .get(uri + '/feeds/' + res1.feeds[1]._id + '/search?searchQuery=' + eaterSearchQuery)
                    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                    .expectStatus(200)
                    .expectHeader('Content-Type', 'application/json; charset=utf-8')
                    .expectJSON(
                        {
                            'feedID' : res1.feeds[1]._id,
                            'searchQuery' : eaterSearchQuery,
                            'pageIndex' : 0
                        })
                    .expectJSONLength('entries', DEFAULT_COUNT_PER_PAGE)
                    .afterJSON(function searchFirstFeedPage2(res2) {
                        params = 'searchQuery=' + eaterSearchQuery +
                            '&pageIndex=1&countPerPage=' + DEFAULT_COUNT_PER_PAGE;
                        frisby.create('GET search second feed page 2 for user ' + user.email)
                            .get(uri + '/feeds/' + res1.feeds[1]._id + '/search?' + params)
                            .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                            .expectStatus(200)
                            .expectHeader('Content-Type', 'application/json; charset=utf-8')
                            .expectJSON(
                                {
                                    'feedID' : res1.feeds[1]._id,
                                    'searchQuery' : eaterSearchQuery,
                                    'pageIndex' : 1
                                })
                            .expectJSONLength('entries', DEFAULT_COUNT_PER_PAGE)
                            .toss()
                    })
                    .toss()
            })
            .toss()
            callback(null);
        },
        function searchFeedsSecondUser(callback) {
            var user = TEST_USERS[1];

            frisby.create('GET feed list for user ' + user.email)
                .get(uri + '/feeds?includeUnreadIDs=true')
                .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                .expectStatus(200)
                .expectHeader('Content-Type', 'application/json; charset=utf-8')
                .expectJSONLength('feeds', 1)
                .expectJSONTypes('feeds.*', {unreadCount : Number, unreadEntryIDs : Array})
                .afterJSON(function searchFirstFeedPage1(res1) {
                    frisby.create('GET search first feed page 1 for user ' + user.email)
                        .get(uri + '/feeds/' + res1.feeds[0]._id + '/search?searchQuery=' + eaterSearchQuery)
                        .addHeader('Authorization', 'Bearer ' + user.token.access_token)
                        .expectStatus(200)
                        .expectHeader('Content-Type', 'application/json; charset=utf-8')
                        .expectJSON(
                            {
                                'feedID' : res1.feeds[0]._id,
                                'searchQuery' : eaterSearchQuery,
                                'pageIndex' : 0
                            })
                        .expectJSONLength('entries', DEFAULT_COUNT_PER_PAGE)
                        .toss()
                })
                .toss()
                callback(null);
            }
]

async.series(feedTestArray);
