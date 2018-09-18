TU_EMAIL_REGEX = 'testuser*';

var async = require('async');
var client = null;
var app = null;
var testAccounts = null;
var AWS = require("aws-sdk");
var assert = require('assert');

AWS.config.update({
  region: "us-east-2",
  endpoint: "http://localhost:8000"
});
AWS.config.apiVersions = {
  dynamodb: '2012-08-10',
};

var ddb = new AWS.DynamoDB();

setupTasksArray = [
    function connectDB(callback) {
        ddb.describeLimits({}, function(err) {
            assert.equal(null, err);
            console.log("Connected correctly to DynamoDB");
            callback(0);
        });
    },
    function deleteUserTable(callback) {
        console.log("dropUserTable");
        ddb.deleteTable({"TableName" : "User"}, function(err) {
            callback(0);
            // user.drop(function(err, reply) {
            //     console.log('User table deleted');
            //     callback(0);
            // });
        });
    },
    // function dropUserFeedEntryCollection(callback) {
    //     console.log("dropUserFeedEntryCollection");
    //     userFeedEntry = reader_db.collection('userFeedEntry');
    //     if (undefined != userFeedEntry) {
    //         userFeedEntry.drop(function(err, reply) {
    //             console.log('userFeedEntry collection dropped');
    //             callback(0);
    //         });
    //     } else {
    //         callback(0);
    //     }
    // },
    function callback(err, results) {
        console.log("Setup callback");
        console.log("Results: %j", results);
    }
]

async.series(setupTasksArray);
