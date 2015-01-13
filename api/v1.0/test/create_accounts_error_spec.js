TU1_FN = "Test";
TU1_LN = "User1";
TU1_EMAIL = "testuser1@example.com";
TU1_PW = "testUser123";
TU_EMAIL_REGEX = 'testuser*';
SP_APP_NAME = 'Reader Test';

var frisby = require('frisby');
var tc = require('./config/test_config');

frisby.create('POST missing firstName')
    .post(tc.url + '/user/enroll',
          { 'lastName' : TU1_LN,
            'email' : TU1_EMAIL,
            'password' : TU1_PW })
    .expectStatus(400)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectJSON({'error' : 'Undefined First Name'})
    .toss()

frisby.create('POST missing lastName')
    .post(tc.url + '/user/enroll',
          { 'firstName' : TU1_FN,
            'email' : TU1_EMAIL,
            'password' : TU1_PW })
    .expectStatus(400)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectJSON({'error' : 'Undefined Last Name'})
    .toss()

frisby.create('POST missing email')
    .post(tc.url + '/user/enroll',
          { 'firstName' : TU1_FN,
            'lastName' : TU1_LN,
            'password' : TU1_PW })
    .expectStatus(400)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectJSON({'error' : 'Undefined Email'})
    .toss()

frisby.create('POST missing password')
    .post(tc.url + '/user/enroll',
          { 'firstName' : TU1_FN,
            'lastName' : TU1_LN,
            'email' : TU1_EMAIL})
    .expectStatus(400)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectJSON({'error' : 'Undefined Password'})
    .toss()

frisby.create('POST password missing lowercase')
    .post(tc.url + '/user/enroll',
          { 'firstName' : TU1_FN,
            'lastName' : TU1_LN,
            'email' : TU1_EMAIL,
            'password' : 'TESTUSER123' })
    .expectStatus(400)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectJSONTypes({'error' : String})
    .toss()

frisby.create('POST password missing uppercase')
    .post(tc.url + '/user/enroll',
          { 'firstName' : TU1_FN,
            'lastName' : TU1_LN,
            'email' : TU1_EMAIL,
            'password' : 'testuser123' })
    .expectStatus(400)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectJSONTypes({'error' : String})
    .toss()

frisby.create('POST password missing numbers')
    .post(tc.url + '/user/enroll',
          { 'firstName' : TU1_FN,
            'lastName' : TU1_LN,
            'email' : TU1_EMAIL,
            'password' : 'testUser' })
    .expectStatus(400)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectJSONTypes({'error' : String})
    .toss()

frisby.create('POST invalid email address')
    .post(tc.url + '/user/enroll',
          { 'firstName' : TU1_FN,
            'lastName' : TU1_LN,
            'email' : "invalid.email",
            'password' : 'testUser' })
    .expectStatus(400)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectJSONTypes({'error' : String})
    .toss()

