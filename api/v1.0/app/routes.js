var express = require('express');
var logger = require('../logger');     
var security = require('../config/security');
var validator = require('validator');
var async = require('async');

exports.addAPIRouter = function(app, mongoose, stormpath) {

    var router = express.Router();

    var userSchema = new mongoose.Schema({
        active: Boolean,
        email: { type: String, trim: true, lowercase: true },
        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },
        sp_api_key_id: { type: String, trim: true },
        sp_api_key_secret: { type: String, trim: true },
        subs: { type: [mongoose.Schema.Types.ObjectId], default: [] },
        created: { type: Date, default: Date.now },
        lastLogin: { type: Date, default: Date.now },
    }, 
    { collection: 'user' }
    );

    userSchema.index({email : 1}, {unique:true});
    userSchema.index({sp_api_key_id : 1}, {unique:true});

    var UserModel = mongoose.model( 'User', userSchema );

    // state can be:
    //     new: It was just added by a user.  Once we
    //          validate that it is still serving content
    //          and we can grab feed entries it will move
    //          to active state.
    //     active: The feed is still live and serving content
    //     inactive: The feed is no longer serving content
    //               Users can still subscribe to it and read
    //               old content.  We will check to see if the
    //               feeds have come back online every so
    //               often (maybe once per day)
    //
    // created signifies when we added it to our system
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

    var FeedModel = mongoose.model( 'Feed', feedSchema );

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

    var FeedEntryModel = mongoose.model( 'FeedEntry', feedEntrySchema );

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

    var UserFeedEntryModel = mongoose.model( 'UserFeedEntry', userFeedEntrySchema );

    // GET
    app.get('/*', function(req, res, next) {
        res.contentType('application/json');
        next();
    });

    // POST
    app.post('/*', function(req, res, next) {
        res.contentType('application/json');
        next();
    });

    // PUT
    app.put('/*', function(req, res, next) {
        res.contentType('application/json');
        next();
    });

    // DELETE
    app.delete('/*', function(req, res, next) {
        res.contentType('application/json');
        next();
    });

    // test route to make sure everything is working (accessed at GET
    // http://localhost:8080/api/v1.0)
    router.get('/', function(req, res) {
        res.json({ message: 'hooray! welcome to our api!' });
    });

    router.post('/user/enroll', function(req, res) {
        errStr = undefined;

        // Structure required by Stormpath API
        account = {};
        account.givenName = account.surname = account.username = account.email
            = account.password = undefined;

        if (undefined == req.param('firstName')) {
            errStr = "Undefined First Name";
            logger.debug(errStr);
            res.status(400);
            res.json({error: errStr});
            return;
        } else if (undefined == req.param('lastName')) {
            errStr = "Undefined Last Name";
            logger.debug(errStr);
            res.status(400);
            res.json({error: errStr});
            return;
        } else if (undefined == req.param('email')) {
            errStr = "Undefined Email";
            logger.debug(errStr);
            res.status(400);
            res.json({error: errStr});
            return;
        } else if (undefined == req.param('password')) {
            errStr = "Undefined Password";
            logger.debug(errStr);
            res.status(400);
            res.json({error: errStr});
            return;
        }
        if (!validator.isEmail(req.param('email'))) {
            res.status(400);
            res.json({error: 'Invalid email format'})
            return;
        }
        UserModel.find({'email' : req.param('email')}, function dupeEmail(err, results) {
            if (err) {
                logger.debug("Error from dupeEmail check");
                console.dir(err);
                res.status(400);
                res.json(err);
                return;
            }
            if (results.length > 0) {
                res.status(400);
                res.json({error: 'Account with that email already exists.  Please choose another email.'});
                return;
            } else {
                account.givenName = req.param('firstName');
                account.surname = req.param('lastName');
                account.username = req.param('email');
                account.email = req.param('email');
                account.password = req.param('password');

                logger.debug("Calling stormPath createAccount API");
                app.get('stormpathApplication').createAccount(account, function(err, acc) {
                    if (err) { 
                        logger.debug("Stormpath error: " + err.developerMessage);
                        res.status(400);
                        res.json({error: err.userMessage});
                    } else {
                        acc.createApiKey(function(err,apiKey) {
                            if (err) { 
                                logger.debug("Stormpath error: " + err.developerMessage);
                                res.status(400);
                                res.json({error: err.userMessage});
                            } else {
                                //logger.debug(apiKey);
                                logger.debug("Successfully created new SP account for "
                                            + "firstName=" + acc.givenName
                                            + ", lastName=" + acc.surname
                                            + ", email=" + acc.email);
                                var newUser = new UserModel(
                                    { 
                                      active: true, 
                                      email: acc.email,
                                      firstName: acc.givenName,
                                      lastName: acc.surname,
                                      sp_api_key_id: apiKey.id,
                                      sp_api_key_secret: apiKey.secret
                                    });
                                newUser.save(function (err, user) {
                                    if (err) {
                                        logger.error("Mongoose error creating new account for " + user.email);
                                        logger.error(err);
                                        res.status(400);
                                        res.json({error: err}); 
                                    } else {
                                        logger.debug("Successfully added User object for " + user.email);
                                        res.status(201);
                                        res.json(user); 
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    });

    router.get('/feeds', stormpath.apiAuthenticationRequired, function(req, res) {
        logger.debug('Router for /feeds');

        var user = null;
        var errStr = null;
        var resultStatus = null;
        var resultJSON = {feeds : []};
        var state = { feeds : []};

        var getUserFeedsTasks = [
            function findUser(cb) {
                UserModel.find({'email' : req.user.email}, function(err, users) {
                    if (err && null == resultStatus) {
                        errStr = 'Internal error with mongoose looking user ' + req.user.email;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                    }

                    if (users.length == 0) {
                        errStr = 'Stormpath returned an email ' + req.user.email + ' for which we dont have a matching user object';
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                    }
                    user = users[0];
                    cb(null);
                });
            },
            function getFeeds(cb) {
                console.dir(user)
                FeedModel.find().where('_id').in(user.subs).lean().exec(function getFeeds(err, userFeeds) {
                    if (err && null == resultStatus) {
                        errStr = 'Error finding subs for user ' + user.email;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                    }

                    if (userFeeds.length == 0) {
                        logger.debug('Empty set of feeds for user ' + user.email);
                    }

                    state.feeds = userFeeds;
                    cb(null);
                });
            },
            // There are two ways to represent that a user has not read a particular feed
            // entry.  Either there is no user_feed_entry document referring to that
            // user/feed_entry combination, or there is a user_feed_entry document and the
            // “read” boolean is false.
            function findTrueReadUFEs(cb) {
                logger.debug("findTrueReadUFEs");
                state.feeds.forEach(function processFeed(feed, feedIndex, feedArray) {
                    UserFeedEntryModel.find({'userID' : user._id,
                                             'feedID' : feed._id,
                                             'read' : true}, function getFeeds(err, ufes) {
                        if (err && null == resultStatus) {
                            errStr = 'Error finding true read UFEs for ' + user.email;
                            resultStatus = 400;
                            resultJSON = { error : errStr };
                            logger.debug(errStr);
                            cb(new Error(errStr));
                        }
                        state.feeds[feedIndex].ufesTrue = ufes;
                        logger.debug("array length = " + feedArray.length)
                        logger.debug("index = " + feedIndex)
                        if (feedIndex == feedArray.length - 1) {
                            cb(null);
                        }
                    });
                });
            },
            function findFalseReadUFEs(cb) {
                logger.debug("findFalseReadUFEs");
                state.feeds.forEach(function processFeed(feed, feedIndex, feedArray) {
                    UserFeedEntryModel.find({'userID' : user._id,
                                             'feedID' : feed._id,
                                             'read' : false}, function getFeeds(err, ufes) {
                        if (err && null == resultStatus) {
                            errStr = 'Error finding false read UFEs for ' + user.email;
                            resultStatus = 400;
                            resultJSON = { error : errStr };
                            logger.debug(errStr);
                            cb(new Error(errStr));
                        }
                        state.feeds[feedIndex].ufesFalse = ufes;
                        if (feedIndex == feedArray.length - 1) {
                            cb(null);
                        }
                    });
                });
            },
            function getUnmarkedUFEsCount(cb) {
                logger.debug("getUnmarkedUFEsCount");
                state.feeds.forEach(function processFeed(feed, feedIndex, feedArray) {
                    state.feeds[feedIndex].falseEntryCount = state.feeds[feedIndex].ufesFalse.length;
                    state.feeds[feedIndex].ufeArray = [];
                    
                    state.feeds[feedIndex].ufesFalse.forEach(function processFeed(ufe, index, array) {
                        // Anything that is marked false has aleady been counted already
                        // so we don't want to double count it
                        state.feeds[feedIndex].ufeArray.push(ufe.feedEntryID);
                    });

                    state.feeds[feedIndex].ufesTrue.forEach(function processFeed(ufe, index, array) {
                        state.feeds[feedIndex].ufeArray.push(ufe.feedEntryID);
                    });

                    FeedEntryModel.find()
                        .where({'feedID' : feed._id})
                        .where('_id').nin(state.feeds[feedIndex].ufeArray)
                        .count()
                        .exec(function getFeeds(err, count) {
                            if (err && null == resultStatus) {
                                errStr = 'Error getting feed count ' + user.email;
                                resultStatus = 400;
                                resultJSON = { error : errStr };
                                logger.debug(errStr);
                                cb(new Error(errStr));
                            }
                            state.feeds[feedIndex].unmarkedEntryCount = count;
                            if (feedIndex == feedArray.length - 1) {
                                cb(null);
                            }
                        });
                });
            },
            function calcUnreadCount(cb) {
                logger.debug("calcUnreadCount");
                state.feeds.forEach(function processFeed(feed, feedIndex, feedArray) {
                    userUnreadCount = state.feeds[feedIndex].falseEntryCount +
                                      state.feeds[feedIndex].unmarkedEntryCount;
                    logger.debug('userUnreadCount is ' + userUnreadCount);

                    resultJSON.feeds.push({ _id : feed._id,
                                           feedURL : feed.feedURL,
                                           title : feed.title,
                                           state : feed.state,
                                           link : feed.link,
                                           description : feed.description,
                                           unreadCount : userUnreadCount });
                    if (feedIndex == feedArray.length - 1) {
                        cb(null);
                    }
                });    
            }
        ]

        async.series(getUserFeedsTasks, function finalizer(err, results) {
            if (null == resultStatus) {
                res.status(200);
            } else {
                res.status(resultStatus);
            }
            res.json(resultJSON);
        });
    });

    router.get('/feeds/:feed_id/entries', stormpath.apiAuthenticationRequired, function(req, res) {
        var feed_id = req.params.feed_id;
        var user = null;
        var errStr = null;
        var resultStatus = null;
        var resultJSON = {feeds : []};
        var state = { feeds : []};

        logger.debug('Router for /feeds/' + feed_id + '/entries');

        var getUserFeedEntryTasks = [
            function findUser(cb) {
                UserModel.find({'email' : req.user.email}, function(err, users) {
                    if (err && null == resultStatus) {
                        errStr = 'Internal error with mongoose looking user ' + req.user.email;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                    }

                    if (users.length == 0) {
                        errStr = 'Stormpath returned an email ' + req.user.email + ' for which we dont have a matching user object';
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                    }
                    user = users[0];
                    cb(null);
                });
            },
            function getFeeds(cb) {
                console.dir(user)
                FeedModel.find().where('_id').in(user.subs).lean().exec(function getFeeds(err, userFeeds) {
                    if (err && null == resultStatus) {
                        errStr = 'Error finding subs for user ' + user.email;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                    }

                    if (userFeeds.length == 0) {
                        logger.debug('Empty set of feeds for user ' + user.email);
                    }

                    state.feeds = userFeeds;
                    cb(null);
                });
            },
            // There are two ways to represent that a user has not read a particular feed
            // entry.  Either there is no user_feed_entry document referring to that
            // user/feed_entry combination, or there is a user_feed_entry document and the
            // “read” boolean is false.
            function findTrueReadUFEs(cb) {
                logger.debug("findTrueReadUFEs");
                state.feeds.forEach(function processFeed(feed, feedIndex, feedArray) {
                    UserFeedEntryModel.find({'userID' : user._id,
                                             'feedID' : feed._id,
                                             'read' : true}, function getFeeds(err, ufes) {
                        if (err && null == resultStatus) {
                            errStr = 'Error finding true read UFEs for ' + user.email;
                            resultStatus = 400;
                            resultJSON = { error : errStr };
                            logger.debug(errStr);
                            cb(new Error(errStr));
                        }
                        state.feeds[feedIndex].ufesTrue = ufes;
                        logger.debug("array length = " + feedArray.length)
                        logger.debug("index = " + feedIndex)
                        if (feedIndex == feedArray.length - 1) {
                            cb(null);
                        }
                    });
                });
            },
            function findFalseReadUFEs(cb) {
                logger.debug("findFalseReadUFEs");
                state.feeds.forEach(function processFeed(feed, feedIndex, feedArray) {
                    UserFeedEntryModel.find({'userID' : user._id,
                                             'feedID' : feed._id,
                                             'read' : false}, function getFeeds(err, ufes) {
                        if (err && null == resultStatus) {
                            errStr = 'Error finding false read UFEs for ' + user.email;
                            resultStatus = 400;
                            resultJSON = { error : errStr };
                            logger.debug(errStr);
                            cb(new Error(errStr));
                        }
                        state.feeds[feedIndex].ufesFalse = ufes;
                        if (feedIndex == feedArray.length - 1) {
                            cb(null);
                        }
                    });
                });
            },
            function getUnmarkedUFEsCount(cb) {
                logger.debug("getUnmarkedUFEsCount");
                state.feeds.forEach(function processFeed(feed, feedIndex, feedArray) {
                    state.feeds[feedIndex].falseEntryCount = state.feeds[feedIndex].ufesFalse.length;
                    state.feeds[feedIndex].ufeArray = [];
                    
                    state.feeds[feedIndex].ufesFalse.forEach(function processFeed(ufe, index, array) {
                        // Anything that is marked false has aleady been counted already
                        // so we don't want to double count it
                        state.feeds[feedIndex].ufeArray.push(ufe.feedEntryID);
                    });

                    state.feeds[feedIndex].ufesTrue.forEach(function processFeed(ufe, index, array) {
                        state.feeds[feedIndex].ufeArray.push(ufe.feedEntryID);
                    });

                    FeedEntryModel.find()
                        .where({'feedID' : feed._id})
                        .where('_id').nin(state.feeds[feedIndex].ufeArray)
                        .count()
                        .exec(function getFeeds(err, count) {
                            if (err && null == resultStatus) {
                                errStr = 'Error getting feed count ' + user.email;
                                resultStatus = 400;
                                resultJSON = { error : errStr };
                                logger.debug(errStr);
                                cb(new Error(errStr));
                            }
                            state.feeds[feedIndex].unmarkedEntryCount = count;
                            if (feedIndex == feedArray.length - 1) {
                                cb(null);
                            }
                        });
                });
            },
            function calcUnreadCount(cb) {
                logger.debug("calcUnreadCount");
                state.feeds.forEach(function processFeed(feed, feedIndex, feedArray) {
                    userUnreadCount = state.feeds[feedIndex].falseEntryCount +
                                      state.feeds[feedIndex].unmarkedEntryCount;
                    logger.debug('userUnreadCount is ' + userUnreadCount);

                    resultJSON.feeds.push({ _id : feed._id,
                                           feedURL : feed.feedURL,
                                           title : feed.title,
                                           state : feed.state,
                                           link : feed.link,
                                           description : feed.description,
                                           unreadCount : userUnreadCount });
                    if (feedIndex == feedArray.length - 1) {
                        cb(null);
                    }
                });    
            }
        ]

        res.status(200);
        res.json(resultJSON);

        //async.series(getUserFeedEntryTasks, function finalizer(err, results) {
            //if (null == resultStatus) {
                //res.status(200);
            //} else {
                //res.status(resultStatus);
            //}
            //res.json(resultJSON);
        //});
    });

    router.put('/feeds/subscribe', stormpath.apiAuthenticationRequired, function(req, res) {
        logger.debug('Router for /feeds/subscribe');

        // Users can't have more than 1000 feeds
        MAX_USER_FEEDS = 1000;

        var resultStatus = null;
        var resultJSON = [];

        var feed = null;
        var user = null;
        var saveErr = null;
        var errStr = null;
        var resultStatus = null;
        var resultJSON = {user : null};

        var feedURL = req.param('feedURL');

        if (undefined == feedURL) {
            errStr = "Undefined Feed URL";
            logger.debug(errStr);
            res.status(400);
            res.json({error: errStr});
            return;
        }

        var subFeedTasks = [
            function findUser(cb) {
                UserModel.find({'email' : req.user.email}, function(err, users) {
                    if (err && null == resultStatus) {
                        errStr = 'Internal error with mongoose looking user ' + req.user.email;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                    }

                    if (users.length == 0) {
                        errStr = 'Stormpath returned an email ' + req.user.email + ' for which we dont have a matching user object';
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                    }
                    user = users[0];
                    if (user.subs.length > MAX_USER_FEEDS) {
                        errStr = 'Max feed count of ' + 
                                 MAX_USER_FEEDS + ' reached for ' + 
                                 req.user.email;
                        resultStatus = 403;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                    }
                    cb(null);
                });
            },
            function insertFeed(cb) {
                // It's possible this feed already exists from a different user
                //  and this is totally fine.  
                // If so this save() will fail, but we'll check afterwards
                // to make sure this feed exists in the database.  Only if not
                // then will we return the error from save() to the user.
                var tmpFeed = new FeedModel({'feedURL' : feedURL});
                tmpFeed.save(function(err, tmpFeed) {
                    saveErr = err;
                    FeedModel.find({'feedURL' : feedURL}, function(err, newFeed) {
                        if (err && null == resultStatus) {
                            errStr = 'Error with mongoose looking for newly added feed ' 
                                     + feedURL + ' ' + JSON.stringify(saveErr);
                            resultStatus = 400;
                            resultJSON = { error : errStr };
                            logger.debug(errStr);
                            cb(new Error(errStr));
                        } else {
                            feed = newFeed[0];
                            logger.debug("Successfully added feed " + feedURL +
                                         " on behalf of " + user.email);
                            cb(null);
                        }
                    });
                });
            },
            function addSubToUser(cb) {
                user.subs.addToSet(feed._id);
                user.save(function(err, user) {
                    if (err && null == resultStatus) {
                        errStr = 'Error saving user ' + user.email
                                 + ' ' + JSON.stringify(err);
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                    } else {
                        logger.debug("Successfully subscribed user " + user.email +
                                     " to feed " + feed.feedURL);
                        resultJSON = {'user' : user};
                        cb(null);
                    }
                });
            }
        ]

        async.series(subFeedTasks, function finalizer(err, results) {
            if (null == resultStatus) {
                res.status(201);
            } else {
                res.status(resultStatus);
            }
            res.json(resultJSON);
        });
    });

    app.use('/api/v1.0', router);
}
