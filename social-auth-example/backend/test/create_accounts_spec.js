TEST_USERS = [{'fn' : 'Test User1',
               'email' : 'testuser1@example.com', 'pwd' : 'testUser123'},
              {'fn' : 'Test User2',
               'email' : 'testuser2@example.com', 'pwd' : 'testUser123'},
              {'fn' : 'Test User3',
               'email' : 'testuser3@example.com', 'pwd' : 'testUser123'}]

var frisby = require('frisby');
var config = require('../config');
var uri = config.test.apiServerURI;

TEST_USERS.forEach(function createUser(user, index, array) {
    frisby.create('POST enroll user ' + user.email)
        .post(uri + '/user/enroll',
              { 'fullName' : user.fn,
                'email' : user.email,
                'password' : user.pwd })
        .expectStatus(201)
        .expectHeader('Content-Type', 'application/json; charset=utf-8')
        .expectJSON({ 'fullName' : user.fn,
                      'email' : user.email })
        .toss()
});

frisby.create('POST enroll duplicate user ')
    .post(uri + '/user/enroll',
          { 'fullName' : TEST_USERS[0].fn,
            'email' : TEST_USERS[0].email,
            'password' : TEST_USERS[0].pwd })
    .expectStatus(400)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectJSON({'error' : 'Account with that email already exists.  Please choose another email.'})
    .toss()
