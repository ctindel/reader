TU1_FN = "Test";
TU1_LN = "User1";
TU1_EMAIL = "testuser1@example.com";
TU1_PW = "testUser123";
TU_EMAIL_REGEX = 'testuser*';

var frisby = require('frisby');
// var config = require('../config/environment');
// var uri = config.test.apiServerURI;
var uri = "http://localhost:4000/api/v1"

frisby.create('POST missing firstName')
    .post(uri + '/user/enroll',
          { 'lastName' : TU1_LN,
            'email' : TU1_EMAIL,
            'password' : TU1_PW })
    .expectStatus(400)
    .expectHeader('Content-Type', 'application/json; charset=utf-8')
    .expectJSON({'error' : 'Undefined First Name'})
    .toss()

// frisby.create('POST missing lastName')
//     .post(uri + '/user/enroll',
//           { 'firstName' : TU1_FN,
//             'email' : TU1_EMAIL,
//             'password' : TU1_PW })
//     .expectStatus(400)
//     .expectHeader('Content-Type', 'application/json; charset=utf-8')
//     .expectJSON({'error' : 'Undefined Last Name'})
//     .toss()
//
// frisby.create('POST missing email')
//     .post(uri + '/user/enroll',
//           { 'firstName' : TU1_FN,
//             'lastName' : TU1_LN,
//             'password' : TU1_PW })
//     .expectStatus(400)
//     .expectHeader('Content-Type', 'application/json; charset=utf-8')
//     .expectJSON({'error' : 'Undefined Email'})
//     .toss()
//
// frisby.create('POST missing password')
//     .post(uri + '/user/enroll',
//           { 'firstName' : TU1_FN,
//             'lastName' : TU1_LN,
//             'email' : TU1_EMAIL})
//     .expectStatus(400)
//     .expectHeader('Content-Type', 'application/json; charset=utf-8')
//     .expectJSON({'error' : 'Undefined Password'})
//     .toss()
//
// frisby.create('POST password missing lowercase')
//     .post(uri + '/user/enroll',
//           { 'firstName' : TU1_FN,
//             'lastName' : TU1_LN,
//             'email' : TU1_EMAIL,
//             'password' : 'TESTUSER123' })
//     .expectStatus(400)
//     .expectHeader('Content-Type', 'application/json; charset=utf-8')
//     .expectJSONTypes({'error' : String})
//     .toss()
//
// frisby.create('POST password missing uppercase')
//     .post(uri + '/user/enroll',
//           { 'firstName' : TU1_FN,
//             'lastName' : TU1_LN,
//             'email' : TU1_EMAIL,
//             'password' : 'testuser123' })
//     .expectStatus(400)
//     .expectHeader('Content-Type', 'application/json; charset=utf-8')
//     .expectJSONTypes({'error' : String})
//     .toss()
//
// frisby.create('POST password missing numbers')
//     .post(uri + '/user/enroll',
//           { 'firstName' : TU1_FN,
//             'lastName' : TU1_LN,
//             'email' : TU1_EMAIL,
//             'password' : 'testUser' })
//     .expectStatus(400)
//     .expectHeader('Content-Type', 'application/json; charset=utf-8')
//     .expectJSONTypes({'error' : String})
//     .toss()
//
// frisby.create('POST invalid email address')
//     .post(uri + '/user/enroll',
//           { 'firstName' : TU1_FN,
//             'lastName' : TU1_LN,
//             'email' : "invalid.email",
//             'password' : 'testUser' })
//     .expectStatus(400)
//     .expectHeader('Content-Type', 'application/json; charset=utf-8')
//     .expectJSONTypes({'error' : String})
//     .toss()
//
