var async = require('async');
var client = null;
var app = null;
var testAccounts = null;
var AWS = require("aws-sdk");
var assert = require('assert');
var config = require('../config')

AWS.config.update({
  region: "us-east-2",
  //endpoint: "http://localhost:8000"
});
AWS.config.apiVersions = {
  dynamodb: '2012-08-10',
  cognitoidentityserviceprovider: '2016-04-18',
};

var ddb = new AWS.DynamoDB();
var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

const HASH_KEY = 'email';
const RANGE_KEY = null;
function buildKey(obj){
    var key = {};
    key[HASH_KEY] = obj[HASH_KEY]
    if(RANGE_KEY){
        key[RANGE_KEY] = obj[RANGE_KEY];
    }

    return key;
}

setupTasksArray = [
    function deleteCognitoIdentities(callback) {
        const MAX_USER_RESULTS = 10;
        var params = {'UserPoolId': config.cognito.userPoolId, 'Limit': MAX_USER_RESULTS};
        cognitoidentityserviceprovider.listUsers(params, function(listUserError, data) {
            if (listUserError) {
                console.log('error from listUsers')
                console.dir(listUserError);
                callback(1);
            }
            var deleteCognitoUserTaskArray = [];
            data.Users.forEach(function(u) {
                deleteCognitoUserTaskArray.push(function deleteCognitoIdentity(deleteUserCB) {
                    var params = {'UserPoolId': config.cognito.userPoolId, 'Username': u.Username};
                    cognitoidentityserviceprovider.adminDeleteUser(params, function(deleteUserError, data) {
                        if (deleteUserError) {
                            console.log('error from adminDeleteUser on user')
                            console.dir(deleteUserError);
                            return deleteUserCB(1);
                        }
                        return deleteUserCB(0);
                    });
                });
            });
            deleteCognitoUserTaskArray.push(function() {
                console.log('Successfully removed all Cognito Users')
                callback(0);
            });
            async.series(deleteCognitoUserTaskArray);
        });
    },
    function connectDB(callback) {
        ddb.describeLimits({}, function(err) {
            assert.equal(null, err);
            console.log("Connected correctly to DynamoDB");
            return callback(0);
        });
    },
    function emptyUserTable(callback) {
        var params = {'TableName' : 'User'};

        ddb.describeTable(params, function(describeTableErr, describeTableData) {
            if (describeTableErr) {
                console.log('DynamoDB User table doesnt exist, skipping');
                return callback(0);
            }
            ddb.scan(params, function(scanTableErr, scanData) {
                if (scanTableErr) {
                    console.log('Error scanning DynamoDB User table');
                    console.dir(describeTableData);
                    console.dir(scanTableErr);
                    return callback(1);
                }
                var deleteDDBUserTaskArray = [];
                scanData.Items.forEach(function(obj,i) {
                    deleteDDBUserTaskArray.push(function deleteDDBUser(deleteUserCB) {
                        // console.log(i);
                        // console.dir(scanData);
                        var deleteParams = {
                            TableName: params.TableName,
                            Key: buildKey(obj),
                            ReturnValues: 'NONE', // optional (NONE | ALL_OLD)
                            ReturnConsumedCapacity: 'NONE', // optional (NONE | TOTAL | INDEXES)
                            ReturnItemCollectionMetrics: 'NONE', // optional (NONE | SIZE)
                        };

                        ddb.deleteItem(deleteParams, function(deleteDDBUserErr, deleteDDBUserData) {
                            if (deleteDDBUserErr) {
                                console.log('error from delete on user')
                                console.dir(deleteDDBUserErr);
                                return deleteUserCB(1);
                            }
                            return deleteUserCB(0);
                        });
                    });
                });
                deleteDDBUserTaskArray.push(function() {
                    console.log('Successfully removed all DynamoDB Users')
                    callback(0);
                });
                async.series(deleteDDBUserTaskArray);
            });
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
]

async.series(setupTasksArray, function(err, results){
    if (err) {
        console.log('Error running setupTasksArray');
        console.dir(err);
        process.exit(1);
    } else {
        console.log('Success running setupTasksArray');
        process.exit(0);
    }
});
