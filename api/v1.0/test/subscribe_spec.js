var TEST_USERS = require('/tmp/readerTestCreds.js');

var frisby = require('frisby');
var async = require('async');
var tc = require('./config/test_config');

TEST_USERS.forEach(function createUser(user, index, array) {
    frisby.create('POST missing firstName')
        .post(tc.url + '/user/enroll',
              { 'firstName' : user.fn,
                'lastName' : user.ln,
                'email' : user.email,
                'password' : user.pwd })
        .expectStatus(200)
        .expectHeader('Content-Type', 'application/json; charset=utf-8')
        .expectJSON({ 'firstName' : user.fn,
                      'lastName' : user.ln,
                      'email' : user.email })
        .toss()
});
