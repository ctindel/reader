"use strict";

module.exports = function(mongoose) {

    var userSchema = new mongoose.Schema({
        active: Boolean,
        email: { type: String, trim: true, lowercase: true },
        name: { type: String, trim: true },
        subs: { type: [mongoose.Schema.Types.ObjectId], default: [] },
        created: { type: Date, default: Date.now },
        lastLogin: { type: Date, default: Date.now },
        localProvider: {
            password: {
                type: String,
                trim: true
            }
        },
        googleProvider: {
            type: {
                id: String,
                token: String
            },
            select: false
        }
    },
    { collection: 'user' }
    );

    userSchema.index({email : 1}, {unique:true});

    userSchema.statics.upsertGoogleUser = function(accessToken, refreshToken, profile, cb) {
        var that = this;
        return this.findOne({
            'googleProvider.id': profile.id
        }, function(err, user) {
            // no user was found, lets create a new one
            if (!user) {
                var newUser = new that({
                    fullName: profile.displayName,
                    email: profile.emails[0].value,
                    googleProvider: {
                        id: profile.id,
                        token: accessToken
                    }
                });

                newUser.save(function(error, savedUser) {
                    if (error) {
                        console.error(error);
                    }
                    return cb(error, savedUser);
                });
            } else {
                user.googleProvider.token = accessToken;
                user.save(function(error, savedUser) {
                    if (error) {
                        console.error(error);
                    }
                    return cb(error, savedUser);
                });
            }
        });
    };

    userSchema.statics.upsertLocalUser = function(email, password, cb) {
        var that = this;
        return this.findOne({
            'email': email
        }, function(err, user) {
            // no user was found, lets create a new one
            if (!user) {
                var newUser = new that({
                    email: email,
                    localProvider: {
                        password: password
                    }
                });

                newUser.save(function(error, savedUser) {
                    if (error) {
                        console.error(error);
                    }
                    return cb(error, savedUser);
                });
            } else {
                user.localProvider.password = password;
                user.save(function(error, savedUser) {
                    if (error) {
                        console.error(error);
                    }
                    return cb(error, savedUser);
                });
            }
        });
    };

    var feedSchema = new mongoose.Schema({
        feedURL: { type: String, trim:true },
        link: { type: String, trim:true },
        description: { type: String, trim:true },
        state: { type: String, trim:true, lowercase:true, default: 'new' },
        createdDate: { type: Date, default: Date.now },
        modifiedDate: { type: Date, default: Date.now },
    },
    { collection: 'feed' }
    );

    feedSchema.index({feedURL : 1}, {unique:true});
    feedSchema.index({link : 1}, {unique:true, sparse:true});

    var feedEntrySchema = new mongoose.Schema({
        description: { type: String, trim:true },
        title: { type: String, trim:true },
        summary: { type: String, trim:true },
        entryID: { type: String, trim:true },
        publishedDate: { type: Date },
        link: { type: String, trim:true  },
        feedID: { type: mongoose.Schema.Types.ObjectId },
        state: { type: String, trim:true, lowercase:true, default: 'new' },
        created: { type: Date, default: Date.now },
    },
    { collection: 'feedEntry' }
    );

    feedEntrySchema.index({entryID : 1});
    feedEntrySchema.index({feedID : 1});

    var userFeedEntrySchema = new mongoose.Schema({
        userID: { type: mongoose.Schema.Types.ObjectId },
        feedEntryID: { type: mongoose.Schema.Types.ObjectId },
        feedID: { type: mongoose.Schema.Types.ObjectId },
        read : { type: Boolean, default: false },
    },
    { collection: 'userFeedEntry' }
    );

    userFeedEntrySchema.index({ userID : 1, feedID : 1,
                                feedEntryID : 1, read : 1});

    var models = {};

    try {
        // Throws an error if "Name" hasn't been registered
        mongoose.model("User");
    } catch (e) {
        models.UserModel = mongoose.model('User', userSchema);
    }

    try {
        // Throws an error if "Name" hasn't been registered
        mongoose.model("Feed");
    } catch (e) {
        models.FeedModel = mongoose.model('Feed', feedSchema);
    }

    try {
        // Throws an error if "Name" hasn't been registered
        mongoose.model("FeedEntry");
    } catch (e) {
        models.FeedEntryModel = mongoose.model('FeedEntry', feedEntrySchema);
    }

    try {
        // Throws an error if "Name" hasn't been registered
        mongoose.model("UserFeedEntry");
    } catch (e) {
        models.UserFeedEntryModel = mongoose.model('UserFeedEntry', userFeedEntrySchema);
    }

    return models;
}
