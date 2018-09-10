'use strict';

var dynamoose = require('dynamoose');
var Schema = dynamoose.Schema;

dynamoose.AWS.config.update({
  //accessKeyId: 'AKID',
  //secretAccessKey: 'SECRET',
  region: 'us-east-2'
});
dynamoose.local("http://localhost:8000") // This will set the server to "http://localhost:1234"

module.exports = function () {

    var UserSchema = new Schema({
        email: {
            type: String, 
            hashKey: true,
            required: true,
            unique: true,
            trim: true, 
            match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
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
        }
    });

    UserSchema.statics.upsertTwitterUser = function(token, tokenSecret, profile, cb) {
        var that = this;
        return this.findOne({
            'twitterProvider.id': profile.id
        }, function(err, user) {
            // no user was found, lets create a new one
            if (!user) {
                var newUser = new that({
                    email: profile.emails[0].value,
                    twitterProvider: {
                        id: profile.id,
                        token: token,
                        tokenSecret: tokenSecret
                    }
                });

                newUser.save(function(error, savedUser) {
                    if (error) {
                        console.log(error);
                    }
                    return cb(error, savedUser);
                });
            } else {
                return cb(err, user);
            }
        });
    };

    UserSchema.statics.upsertFbUser = function(accessToken, refreshToken, profile, cb) {
        var that = this;
        var UserModel = dynamoose.model('User', UserSchema, {create: true, waitForActive: true});
        UserModel.queryOne('email').eq(profile.emails[0].value).exec(
            function(err, user) {
                if (!user) {
                    // no user was found, lets create a new one
                    console.log("No user was found")
                    var newUser = new UserModel({
                        fullName: profile.displayName,
                        email: profile.emails[0].value,
                        facebookProvider: {
                            id: profile.id,
                            token: accessToken
                        }
                    });
    
                    newUser.save(function(error, savedUser) {
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
        var that = this;
        var UserModel = dynamoose.model('User', UserSchema, {create: true, waitForActive: true});
        UserModel.queryOne('email').eq(profile.emails[0].value).exec(
            function(err, user) {
                // no user was found, lets create a new one
                if (!user) {
                    var newUser = new UserModel({
                        fullName: profile.displayName,
                        email: profile.emails[0].value,
                        googleProvider: {
                            id: profile.id,
                            token: accessToken
                        }
                    });
    
                    newUser.save(function(error, savedUser) {
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

    dynamoose.model('User', UserSchema);

    return dynamoose;
};
