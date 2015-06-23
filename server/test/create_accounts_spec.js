TEST_USERS = [{'fn' : 'Test', 'ln' : 'User1', 
               'email' : 'testuser1@example.com', 'pwd' : 'testUser123'},
              {'fn' : 'Test', 'ln' : 'User2', 
               'email' : 'testuser2@example.com', 'pwd' : 'testUser123'},
              {'fn' : 'Test', 'ln' : 'User3', 
               'email' : 'testuser3@example.com', 'pwd' : 'testUser123'}]

SP_APP_NAME = 'Reader Test';

var frisby = require('frisby');
var config = require('../config/environment');
var uri = config.test.apiServerURI;

TEST_USERS.forEach(function createUser(user, index, array) {
    frisby.create('POST enroll user ' + user.email)
        .post(uri + '/user/enroll',
              { 'firstName' : user.fn,
                'lastName' : user.ln,
                'email' : user.email,
                'password' : user.pwd })
        .expectStatus(201)
        .expectHeader('Content-Type', 'application/json; charset=utf-8')
        .expectJSON({ 'firstName' : user.fn,
                      'lastName' : user.ln,
                      'email' : user.email })
        .toss()
});

frisby.create('POST enroll duplicate user ')
    .post(uri + '/user/enroll',
          { 'firstName' : TEST_USERS[0].fn,
            'lastName' : TEST_USERS[0].ln,
            'email' : TEST_USERS[0].email,
            'password' : TEST_USERS[0].pwd })
    .expectStatus(400)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectJSON({'error' : 'Account with that email already exists.  Please choose another email.'})
    .toss()
