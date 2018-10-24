'use strict';

require('./dynamoose')();
var passport = require('passport');
var TwitterTokenStrategy = require('passport-twitter-token');
var User = require('dynamoose').model('User');
var FacebookTokenStrategy = require('passport-facebook-token');
var GoogleTokenStrategy = require('passport-google-token').Strategy;
var CognitoStrategy = require('passport-cognito')
var config = require('./config');

module.exports = function () {

    passport.use(new TwitterTokenStrategy({
            consumerKey: config.twitterAuth.consumerKey,
            consumerSecret: config.twitterAuth.consumerSecret,
            includeEmail: true
        },
        function (token, tokenSecret, profile, done) {
            User.upsertTwitterUser(token, tokenSecret, profile, function(err, user) {
                return done(err, user);
            });
        }));

    passport.use(new FacebookTokenStrategy({
            clientID: config.facebookAuth.clientID,
            clientSecret: config.facebookAuth.clientSecret
        },
        function (accessToken, refreshToken, profile, done) {
            User.upsertFbUser(accessToken, refreshToken, profile, function(err, user) {
                return done(err, user);
            });
        }));

    passport.use(new GoogleTokenStrategy({
            clientID: config.googleAuth.clientID,
            clientSecret: config.googleAuth.clientSecret
        },
        function (accessToken, refreshToken, profile, done) {
            User.upsertGoogleUser(accessToken, refreshToken, profile, function(err, user) {
                return done(err, user);
            });
        }));

    passport.use(new CognitoStrategy({
        userPoolId: config.cognito.userPoolId,
        clientId: config.cognito.appClientId,
        region: config.cognito.poolRegion
      },
      function(accessToken, idToken, refreshToken, user, cb) {
        process.nextTick(function() {
            cb(null, user);
        });
      }
    ));
};
