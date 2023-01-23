TU_EMAIL_REGEX = new RegExp('^testuser.*$');
//TU_EMAIL_REGEX = new RegExp('^testuser1.*$');
TEST_CREDS_TMP_FILE = '/tmp/readerTestCreds.js';

var async = require('async');
var config = require('../config/environment');
var mongodb = require('mongodb');
const axios = require('axios');
assert = require('assert');

var uri = config.test.apiServerURI;
const MongoClient = require('mongodb').MongoClient;
var reader_db = null;
var users_array = null;
var qs = require('qs');

writeCredsArray = [
    function connectDB(callback) {
        MongoClient.connect(config.mongo.uri, { useNewUrlParser: true }, function(err, client) {
            assert.equal(null, err);
            reader_db_client = client;
            reader_db = reader_db_client.db(config.mongo.db);
            callback(null);
        });
    },
    function lookupUserKeys(callback) {
        console.log("lookupUserKeys");
        user_coll = reader_db.collection('user');
        user_coll.find({email : TU_EMAIL_REGEX}).toArray(function(err, users) {
            users_array = users;
            callback(null);
        });
    },
    function getUserTokens(callback) {
        console.log("getUserTokens, users_array.length=" + users_array.length);
        var numTokens = 0;

        users_array.forEach(function genToken(user, index, array) {
            var options = {
                baseURL: 'http://' + config.test.apiServer + ':' + config.test.apiServerPort + '/api/v1.0',
                url: '/auth/local',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    //'Content-Length': Buffer.byteLength(postData)
                },
                //data: {'email' : user.email, 'password' : user.localProvider.password },
                data: qs.stringify({'email' : user.email, 'password' : user.localProvider.password }),
                responseType: 'json',
            };
            axios.request(options)
                .then(function(response) {
                    user.token = response.headers['x-auth-token'];
                    numTokens++;
                    if (numTokens == users_array.length) {
                        callback(null);
                    }
                });
        });
    },
    function writeCreds(callback) {
        console.log("writeCreds");
        var fs = require('fs');
        fs.writeFileSync(TEST_CREDS_TMP_FILE, 'TEST_USERS = ');
        fs.appendFileSync(TEST_CREDS_TMP_FILE, JSON.stringify(users_array));
        fs.appendFileSync(TEST_CREDS_TMP_FILE, '; module.exports = TEST_USERS;');
        callback(0);
    },
    function closeDB(callback) {
        reader_db_client.close();
    },
    function callback(err, results) {
        console.log("Write creds callback");
        console.log("Results: %j", results);
    }
]

async.series(writeCredsArray);
