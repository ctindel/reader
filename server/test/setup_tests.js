var async = require('async');
var client = null;
var app = null;
var testAccounts = null;
var config = require('../config/environment');
var assert = require('assert');

const MongoClient = require('mongodb').MongoClient;
var reader_db_client = null;
var reader_db = null;

setupTasksArray = [
    function connectDB(callback) {
        MongoClient.connect(config.mongo.uri, { useNewUrlParser: true }, function(err, client) {
            assert.equal(null, err);
            reader_db_client = client;
            reader_db = reader_db_client.db(config.mongo.db);
            console.log("Connected correctly to server");
            callback(0);
        });
    },
    function dropUserCollection(callback) {
        console.log("dropUserCollection");
        user = reader_db.collection('user');
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
        console.log("dropUserFeedEntryCollection");
        userFeedEntry = reader_db.collection('userFeedEntry');
        if (undefined != userFeedEntry) {
            userFeedEntry.drop(function(err, reply) {
                console.log('userFeedEntry collection dropped');
                callback(0);
            });
        } else {
            callback(0);
        }
    },
    function closeDB(callback) {
        reader_db_client.close();
    },
    function callback(err, results) {
        console.log("Setup callback");
        console.log("Results: %j", results);
    }
]

async.series(setupTasksArray);
