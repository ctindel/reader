'use strict';

var shortId = require('shortid');
var dynamoose = require('dynamoose');
var Schema = dynamoose.Schema;
var config = require('./config');

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;
const AWS = require('aws-sdk');
const request = require('request');
const jwkToPem = require('jwk-to-pem');
const jwt = require('jsonwebtoken');
// The amazon-cognito-identity-js uses fetch, which isn't in node.js core
global.fetch = require('node-fetch');

const poolData = {
    UserPoolId: config.cognito.userPoolId,
    ClientId : config.cognito.appClientId
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

dynamoose.AWS.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region
});
// dynamoose.local("http://localhost:8000") // This will set the server to "http://localhost:1234"

module.exports = function () {

    var UserSchema = new Schema({
        email: {
            type: String,
            hashKey: true,
            required: true,
            trim: true,
            lowercase: true,
            match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        localProvider: {
            hashedPassword: { type: String, index: false },
        },
        facebookProvider: {
            id: { type: String, index: false },
            token: { type: String , index: false}
        },
        twitterProvider: {
            id: { type: String, index: false },
            token: { type: String , index: false}
        },
        googleProvider: {
            id: { type: String, index: false },
            token: { type: String, index: false }
        },
        cognitoProvider: {
            id: { type: String, index: false }
        }
    });

    UserSchema.statics.upsertTwitterUser = function(token, tokenSecret, profile, cb) {
        var UserModel = dynamoose.model('User', UserSchema, {create: true, waitForActive: true});
        UserModel.queryOne('email').eq(profile.emails[0].value).exec(
            function(err, user) {
                // no user was found, lets create a new one
                if (!user) {
                    console.log("No existing user was found with email " + profile.emails[0].value)
                    var newUser = new UserModel({
                        fullName: profile.displayName,
                        email: profile.emails[0].value,
                        twitterProvider: {
                            id: profile.id,
                            token: token,
                            tokenSecret: tokenSecret
                        }
                    });

                    newUser.create(function(error, savedUser) {
                        if (error) {
                            console.log(error);
                        }
                        return cb(error, savedUser);
                    });
                } else {
                    return cb(err, user);
                }
            }
        );
    };

    UserSchema.statics.upsertFbUser = function(accessToken, refreshToken, profile, cb) {
        var UserModel = dynamoose.model('User', UserSchema, {create: true, waitForActive: true});
        UserModel.queryOne('email').eq(profile.emails[0].value).exec(
            function(err, user) {
                if (!user) {
                    // no user was found, lets create a new one
                    console.log("No existing user was found with email " + profile.emails[0].value)
                    var newUser = new UserModel({
                        fullName: profile.displayName,
                        email: profile.emails[0].value,
                        facebookProvider: {
                            id: profile.id,
                            token: accessToken
                        }
                    });

                    newUser.create(function(error, savedUser) {
                        if (error) {
                            console.log(error);
                        }
                        console.log("Done saving new user");
                        return cb(error, savedUser);
                    });
                } else {
                    console.log("User already existed")
                    console.log(user);
                    return cb(err, user);
                }
            }
        );
    };

    UserSchema.statics.upsertGoogleUser = function(accessToken, refreshToken, profile, cb) {
        var UserModel = dynamoose.model('User', UserSchema, {create: true, waitForActive: true});
        UserModel.queryOne('email').eq(profile.emails[0].value).exec(
            function(err, user) {
                // no user was found, lets create a new one
                if (!user) {
                    console.log("No existing user was found with email " + profile.emails[0].value)
                    var newUser = new UserModel({
                        fullName: profile.displayName,
                        email: profile.emails[0].value,
                        googleProvider: {
                            id: profile.id,
                            token: accessToken
                        }
                    });

                    newUser.create(function(error, savedUser) {
                        if (error) {
                            console.log(error);
                        }
                        return cb(error, savedUser);
                    });
                } else {
                    return cb(err, user);
                }
            }
        );
    };

    UserSchema.statics.upsertCognitoUser = function(email, fullName, password, cb) {
        var UserModel = dynamoose.model('User', UserSchema, {create: true, waitForActive: true});
        var attributeList = [];
        attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"email",Value:email}));
        attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"name",Value:fullName}));

        userPool.signUp(email, password, attributeList, null, function(err, result){
            if (err) {
                console.log("Error with userPool.signUp");
                console.log(err);
                return cb(err, result);
            }
            // console.dir(result);
            var cognitoUser = result.user;
            console.log('user id ' + result.userSub);

            var newUser = new UserModel({
                fullName: fullName,
                email: email,
                cognitoProvider: {
                    id: result.userSub
                }
            });

            newUser.save(function(error, savedUser) {
                if (error) {
                    console.log(error);
                }
                return cb(error, savedUser);
            });
        });
    };

    dynamoose.model('User', UserSchema, {create: true, waitForActive: true});

    return dynamoose;
};
