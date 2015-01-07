TEST_USERS = [{'fn' : 'Test', 'ln' : 'User1', 
               'email' : 'testuser1@example.com', 'pwd' : 'testUser123'},
              {'fn' : 'Test', 'ln' : 'User2', 
               'email' : 'testuser2@example.com', 'pwd' : 'testUser123'},
              {'fn' : 'Test', 'ln' : 'User3', 
               'email' : 'testuser3@example.com', 'pwd' : 'testUser123'}]

TU1_FN = "Test";
TU1_LN = "User1";
TU1_EMAIL = "testuser1@example.com";
TU1_PW = "testUser123";
TU_EMAIL_REGEX = 'testuser*';
SP_APP_NAME = 'Reader Test';

var frisby = require('frisby');
var async = require('async');
var tc = require('./test_config');

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
