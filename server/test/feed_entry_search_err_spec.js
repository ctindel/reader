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
var user = TEST_USERS[0];

frisby.create('GET search feed entries missing searchQuery param ' + user.email)
    .get(uri + '/feeds/1234/search')
    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectStatus(400)
    .expectJSON({'error' : 'Undefined searchQuery parameter'})
    .toss()

frisby.create('GET search feed entries empty searchQuery param ' + user.email)
    .get(uri + '/feeds/1234/search?searchQuery=')
    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectStatus(400)
    .expectJSON({'error' : 'Invalid empty searchQuery parameter'})
    .toss()

frisby.create('GET search feed entries invalid pageIndex param ' + user.email)
    .get(uri + '/feeds/1234/search?searchQuery=foo&pageIndex=blah')
    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectStatus(400)
    .expectJSON({'error' : 'Invalid pageIndex parameter blah'})
    .toss()

frisby.create('GET search feed entries invalid countPerPage param ' + user.email)
    .get(uri + '/feeds/1234/search?searchQuery=foo&pageIndex=1&countPerPage=abc')
    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectStatus(400)
    .expectJSON({'error' : 'Invalid countPerPage parameter abc'})
    .toss()

frisby.create('GET search feed entries invalid feedID' + user.email)
    .get(uri + '/feeds/1234/search?searchQuery=foo&pageIndex=1&countPerPage=10')
    .addHeader('Authorization', 'Bearer ' + user.token.access_token)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectStatus(404)
    .expectJSON({'error' : 'User not subscribed to feed 1234'})
    .toss()
