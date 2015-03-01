TEST_USERS = require('/tmp/readerTestCreds.js');

var frisby = require('frisby');
var tc = require('./config/test_config');
var async = require('async');
var dbConfig = require('./config/db.js');

var user = TEST_USERS[0];

frisby.create('GET invalid feed entries ' + user.email)
    .get(tc.url + '/feeds/1234/entries?unreadOnly=true')
    .auth(user.sp_api_key_id, user.sp_api_key_secret)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectStatus(404)
    .expectJSON({'error' : 'User not subscribed to feed 1234'})
    .toss()

frisby.create('GET feed list missing unreadOnly param part 1 ' + user.email)
    .get(tc.url + '/feeds')
    .auth(user.sp_api_key_id, user.sp_api_key_secret)
    .expectStatus(200)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectJSONLength('feeds', 2)
    .expectJSONTypes('feeds.*', {unreadCount : Number})
    .afterJSON(function getSingleFeed(res1) {
        frisby.create('GET feed list missing unreadOnly param part 2 ' + user.email)
            .get(tc.url + '/feeds/' + res1.feeds[0]._id + '/entries')
            .auth(user.sp_api_key_id, user.sp_api_key_secret)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectStatus(400)
            .expectJSON({'error' : 'Undefined unreadOnly parameter'})
            .toss()
    })
    .toss()

frisby.create('GET feed list invalid unreadOnly param part 1 ' + user.email)
    .get(tc.url + '/feeds')
    .auth(user.sp_api_key_id, user.sp_api_key_secret)
    .expectStatus(200)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectJSONLength('feeds', 2)
    .expectJSONTypes('feeds.*', {unreadCount : Number})
    .afterJSON(function getSingleFeed(res1) {
        frisby.create('GET feed list invalid unreadOnly param part 2 ' + user.email)
            .get(tc.url + '/feeds/' + res1.feeds[0]._id + '/entries?unreadOnly=blah')
            .auth(user.sp_api_key_id, user.sp_api_key_secret)
            .expectHeader('Content-Type', 'application/json; charset=utf-8')
            .expectStatus(400)
            .expectJSON({'error' : 'unreadOnly parameter must be either true or false'})
            .toss()
    })
    .toss()
