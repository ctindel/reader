TU_EMAIL_REGEX = 'testuser*';
SP_APP_NAME = 'Reader Test';

var stormpath = require('stormpath');
var async = require('async');
var client = null;
var app = null;
var testAccounts = null;
var keyfile = '../config/stormpath_apikey.properties';
var dbConfig = require('./config/db.js');
var mongodb = require('mongodb');
assert = require('assert');

stormpath.loadApiKey(keyfile, function apiKeyFileLoaded(err, apiKey) {
  if (err) throw err;
  client = new stormpath.Client({apiKey: apiKey});
});

var mongoClient = mongodb.MongoClient
var reader_test_db = null;

setupTasksArray = [
    function connectDB(callback) {
        mongoClient.connect(dbConfig.testDBURL, function(err, db) {
            assert.equal(null, err);
            reader_test_db = db; 
            console.log("Connected correctly to server");
            callback(0);
        });
    },
    function dropUserCollection(callback) {
        console.log("dropUserCollection");
        user = reader_test_db.collection('user');
        if (undefined != user) {
            user.drop(function(err, reply) {
                console.log('user collection dropped');
                callback(0);
            });
        } else {
            callback(0);
        }
    },
    function dropUserFeedEntryCollection(callback) {
        console.log("dropFeedEntryCollection");
        user_feed_entry = reader_test_db.collection('user_feed_entry');
        if (undefined != user_feed_entry) {
            user_feed_entry.drop(function(err, reply) {
                console.log('user_feed_entry collection dropped');
                callback(0);
            });
        } else {
            callback(0);
        }
    },
    function getApplication(callback) {
        console.log("getApplication");
        client.getApplications({name: SP_APP_NAME}, function(err, applications) {
            console.log(applications);
            if (err) {
                log("Error in getApplications");
                throw err;
            }

            app = applications.items[0];
            callback(0);
        });
    },
    function deleteTestAccounts(callback) {
        console.log("deleteTestAccounts");
        app.getAccounts({email: TU_EMAIL_REGEX}, function(err, accounts) {
            if (err) {
                log("Error in getAccounts");
                throw err;
            }
            
            console.log("Accounts: %j", accounts);
            accounts.items.forEach(function deleteAccount(account) {
                console.log("account: " + account);
                console.log("Deleting Account for %s %s", account.givenName, account.surname);
                account.delete(function deleteError(err) {
                    if (err) {
                        console.log("Error deleting account");
                        throw err;
                    }
                });
            });

            callback(0);
        });
    },
    function closeDB(callback) {
        reader_test_db.close();
    },
    function callback(err, results) {
        console.log("Setup callback");
        console.log("Results: %j", results);
    }
]

async.series(setupTasksArray);
