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

    router.put('/feeds/subscribe', stormpath.apiAuthenticationRequired, function(req, res) {
        logger.debug('Router for PUT /feeds/subscribe');

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
                        return;
                    }

                    if (users.length == 0) {
                        errStr = 'Stormpath returned an email ' + req.user.email + ' for which we dont have a matching user object';
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
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
                        return;
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
                            return;
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
                        return;
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

    // If the user sets includeUnreadIDs then we will give them back an array
    // of unread feed entry IDs and we will exclute the unreadCount to avoid
    // the possibility of things changing since it would need to be done in two
    // queries and they can get the unreadCount simply by examining the number
    // of array entries returned in unreadIDs
    router.get('/feeds', stormpath.apiAuthenticationRequired, function(req, res) {
        logger.debug('Router for GET /feeds');

        var user = null;
        var errStr = null;
        var includeUnreadIDs = false;
        var resultStatus = null;
        var resultJSON = {feeds : []};
        var state = { feeds : [] };

        if (undefined != req.param('includeUnreadIDs')) {
            if ('true' == req.param('includeUnreadIDs')) {
                includeUnreadIDs = true;
            } else {
                errStr = "includeUnreadIDs parameter must be true if set";
                logger.debug(errStr);
                res.status(400);
                res.json({error: errStr});
                return;
            }
        }

        var getUserFeedsTasks = [
            function findUser(cb) {
                UserModel.find({'email' : req.user.email}, function(err, users) {
                    if (err) {
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
                FeedModel.find().where('_id').in(user.subs).lean().exec(function getFeeds(err, userFeeds) {
                    if (err) {
                        errStr = 'Error finding subs for user ' + user.email;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                    }

                    if (userFeeds.length == 0) {
                        logger.debug('Empty set of feeds for user ' + user.email);
                        cb(new Error("Not really an error but we want to shortcircuit the series"));
                    } else {
                        state.feeds = userFeeds;
                        cb(null);
                    }
                });
            },
            // We find the unread feed entries by looking at which UFEs are
            // marked true, then looking for feed entries which are not in that
            // list.  This will work for entries which have no UFE or where the
            // UFE is marked as unread.
            function findTrueReadUFEs(cb) {
                var feedsProcessed = 0;

                state.feeds.forEach(function processFeed(feed, feedIndex, feedArray) {
                    UserFeedEntryModel.find({'userID' : user._id,
                                             'feedID' : feed._id,
                                             'read' : true}, function getFeedEntries(err, ufes) {
                        if (err) {
                            errStr = 'Error finding true read UFEs for ' + user.email;
                            resultStatus = 400;
                            resultJSON = { error : errStr };
                            logger.debug(errStr);
                            cb(new Error(errStr));
                        }
                        state.feeds[feedIndex].ufesTrue = ufes;
                        feedsProcessed++;
                        if (feedsProcessed == feedArray.length) {
                            cb(null);
                        }
                    });
                });
            },
            function getUnreadFeedEntries(cb) {
                var feedsProcessed = 0;

                state.feeds.forEach(function processFeed(feed, feedIndex, feedArray) {
                    feed.readEntryIDs = [];
                    feed.unreadEntryIDs = [];
                    
                    feed.ufesTrue.forEach(function (ufe, index, array) {
                        feed.readEntryIDs.push(ufe.feedEntryID);
                    });

                    FeedEntryModel.find()
                        .where({'feedID' : feed._id})
                        .where('_id').nin(feed.readEntryIDs)
                        .select('_id')
                        .exec(function getFeedEntries(err, entries) {
                            if (err) {
                                errStr = 'Error getting feed entries for feedID ' + feed._id;
                                resultStatus = 400;
                                resultJSON = { error : errStr };
                                logger.debug(errStr);
                                cb(new Error(errStr));
                            }
                            
                            entries.forEach(function(entry, unreadIndex, unreadArray) {
                                feed.unreadEntryIDs.push(entry._id);
                            });

                            feedsProcessed++;
                            if (feedsProcessed == feedArray.length) {
                                cb(null);
                            }
                        });
                });
            },
            function formResponse(cb) {
                var feedsProcessed = 0;

                state.feeds.forEach(function processFeed(feed, feedIndex, feedArray) {
                    userUnreadCount = feed.unreadEntryIDs.length;

                    var feedRes = 
                        { _id : feed._id,
                          feedURL : feed.feedURL,
                          title : feed.title,
                          state : feed.state,
                          link : feed.link,
                          description : feed.description,
                          unreadCount : feed.unreadEntryIDs.length };

                    if (true == includeUnreadIDs) {
                        feedRes.unreadEntryIDs = feed.unreadEntryIDs;
                    }
                    resultJSON.feeds.push(feedRes);
                    feedsProcessed++;
                    if (feedsProcessed == feedArray.length) {
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

    router.get('/feeds/:feedID/entries', stormpath.apiAuthenticationRequired, function(req, res) {
        var feedID = req.params.feedID;
        var user = null;
        var errStr = null;
        var resultStatus = null;
        var resultJSON = null;
        var state = { };
        var unreadEntryIDStr = null;
        var unreadEntryIDs = null;

        var MAX_UNREAD_ENTRY_ID_STR_LENGTH = 1024;
        var MAX_UNREAD_ENTRY_ID_ARR_LENGTH = 20;

        logger.debug('Router for GET /feeds/' + feedID + '/entries');

        if (undefined == req.param('unreadOnly')) {
            errStr = "Undefined unreadOnly parameter";
            logger.debug(errStr);
            res.status(400);
            res.json({error: errStr});
            return;
        } else {
            unreadEntryIDStr = req.param('unreadEntryIDs');
            if (undefined != unreadEntryIDStr) {
                if (unreadEntryIDStr.length > MAX_UNREAD_ENTRY_ID_STR_LENGTH) {
                    errStr = "unreadEntryIDs parameter must be shorter than " 
                             + MAX_UNREAD_ENTRY_ID_STR_LENGTH + " bytes";
                    logger.debug(errStr);
                    res.status(400);
                    res.json({error: errStr});
                    return;
                }
                unreadEntryIDs = unreadEntryIDStr.split(',');
                if (unreadEntryIDs.length > MAX_UNREAD_ENTRY_ID_ARR_LENGTH) {
                    errStr = "unreadEntryIDs parameter must be fewer than " 
                             + MAX_UNREAD_ENTRY_ID_ARR_LENGTH + " entries";
                    logger.debug(errStr);
                    res.status(400);
                    res.json({error: errStr});
                    return;
                }
                if ('true' != req.param('unreadOnly')) {
                    errStr = "unreadOnly parameter must be true if unreadEntryIDs is set";
                    logger.debug(errStr);
                    res.status(400);
                    res.json({error: errStr});
                    return;
                }
            }
            if (('true' != req.param('unreadOnly')) && ('false' != req.param('unreadOnly'))) {
                errStr = "unreadOnly parameter must be either true or false";
                logger.debug(errStr);
                res.status(400);
                res.json({error: errStr});
                return;
            }
        }

        var getUserFeedEntryTasks = [
            function findUser(cb) {
                UserModel.find({'email' : req.user.email}, function(err, users) {
                    if (err) {
                        errStr = 'Internal error with mongoose looking user ' + req.user.email;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }

                    if (users.length == 0) {
                        errStr = 'Stormpath returned an email ' + req.user.email + ' for which we dont have a matching user object';
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }
                    user = users[0];
                    cb(null);
                });
            },
            function getFeed(cb) {
                if (-1 == user.subs.indexOf(feedID)) {
                    errStr = 'User not subscribed to feed ' + feedID;
                    resultStatus = 404;
                    resultJSON = { error : errStr };
                    logger.debug(errStr);
                    cb(new Error(errStr));
                    return;
                }
                FeedModel.find().where({'_id': feedID}).lean().exec(function getFeeds(err, feeds) {
                    if (err || (0 == feeds.length)) {
                        // I'm not sure if this could ever happen, maybe if a
                        // user was subscribed to a sub that got deleted?
                        // We'll handle it anyway because we rock.
                        errStr = 'Error finding feedID ' + feedID;
                        resultStatus = 404;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }

                    state.feed = feeds[0];
                    // ufesTrue track _id of UserFeedEntry
                    //   documents where the user has marked specific feed
                    //   entries as read=true
                    // readEntries and unreadEntries are the actual
                    //   FeedEntry documents themselves
                    state.feed.ufesTrue = [];
                    state.feed.readEntries = [];
                    state.feed.unreadEntries = [];
                    cb(null);
                });
            },
            // There are two ways to represent that a user has not read a particular feed
            // entry.  Either there is no user_feed_entry document referring to that
            // user/feed_entry combination, or there is a user_feed_entry document and the
            // “read” boolean is false.
            function findTrueReadUFEs(cb) {
                UserFeedEntryModel.find({'userID' : user._id,
                                         'feedID' : state.feed._id,
                                         'read' : true}, function getFeedEntries(err, ufes) {
                    if (err) {
                        errStr = 'Error finding true read UFEs for ' + user.email;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }
                    state.feed.ufesTrue = ufes;
                    cb(null);
                });
            },
            function getUnreadFeedEntries(cb) {
                state.feed.readEntryIDs = [];
                
                state.feed.ufesTrue.forEach(function processFeed(ufe, index, array) {
                    state.feed.readEntryIDs.push(ufe.feedEntryID);
                });

                query = FeedEntryModel.find()
                    .where({'feedID' : state.feed._id})
                    .where('_id').nin(state.feed.readEntryIDs);

                if (null != unreadEntryIDs) {
                    query.where('_id').in(unreadEntryIDs)
                }
                query.lean().exec(function getFeedEntries(err, entries) {
                    if (err) {
                        errStr = 'Error getting feed entries for feedID ' + feedID;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }
                    state.feed.unreadEntries = entries;
                    cb(null);
                });
            },
            function getReadFeedEntries(cb) {
                if ('true' == req.param('unreadOnly')) {
                    // If the user only wants unread entries then we're done
                    cb(null);
                    return;
                }

                FeedEntryModel.find()
                    .where({'feedID' : state.feed._id})
                    .where('_id').in(state.feed.readEntryIDs)
                    .lean()
                    .exec(function getFeedEntries(err, entries) {
                        if (err) {
                            errStr = 'Error getting feed entries for feedID' + feedID;
                            resultStatus = 400;
                            resultJSON = { error : errStr };
                            logger.debug(errStr);
                            cb(new Error(errStr));
                            return;
                        }
                        state.feed.readEntries = entries;
                        cb(null);
                    });
            },
            function formResponse(cb) {
                resultJSON = { feed : { _id : state.feed._id,
                                       feedURL : state.feed.feedURL,
                                       title : state.feed.title,
                                       state : state.feed.state,
                                       link : state.feed.link,
                                       description : state.feed.description,
                                       unreadEntries : state.feed.unreadEntries,
                                       readEntries : state.feed.readEntries,
                                       unreadCount : state.feed.unreadEntries.length } }
                resultJSON.feed.unreadEntries.forEach(function processEntry(entry, index, array) {
                    entry.read = false;
                });
                resultJSON.feed.readEntries.forEach(function processEntry(entry, index, array) {
                    entry.read = true;
                });
                cb(null);
            }
        ]

        async.series(getUserFeedEntryTasks, function finalizer(err, results) {
            if (null == resultStatus) {
                res.status(200);
            } else {
                res.status(resultStatus);
            }
            res.json(resultJSON);
        });
    });


    router.put('/feeds/:feedID', stormpath.apiAuthenticationRequired, function(req, res) {
        var feedID = req.params.feedID;
        var user = null;
        var errStr = null;
        var resultStatus = null;
        var resultJSON = null;
        var readParam = req.param('read');
        var state = { };

        logger.debug('Router for PUT /feeds/' + feedID);

        if (undefined == readParam) {
            errStr = "Undefined read parameter";
            logger.debug(errStr);
            res.status(400);
            res.json({error: errStr});
            return;
        } else {
            if (('true' != readParam)) {
                errStr = "read parameter must be true";
                logger.debug(errStr);
                res.status(400);
                res.json({error: errStr});
                return;
            }
        }

        var markUserFeedReadTasks = [
            function findUser(cb) {
                UserModel.find({'email' : req.user.email}, function(err, users) {
                    if (err) {
                        errStr = 'Internal error with mongoose looking user ' + req.user.email;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }

                    if (users.length == 0) {
                        errStr = 'Stormpath returned an email ' + req.user.email + ' for which we dont have a matching user object';
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }
                    user = users[0];
                    cb(null);
                });
            },
            function getFeed(cb) {
                if (-1 == user.subs.indexOf(feedID)) {
                    errStr = 'User not subscribed to feed ' + feedID;
                    resultStatus = 404;
                    resultJSON = { error : errStr };
                    logger.debug(errStr);
                    cb(new Error(errStr));
                    return;
                }
                FeedModel.find().where({'_id': feedID}).lean().exec(function getFeeds(err, feeds) {
                    if (err || (0 == feeds.length)) {
                        // I'm not sure if this could ever happen, maybe if a
                        // user was subscribed to a sub that got deleted?
                        // We'll handle it anyway because we rock.
                        errStr = 'Error finding feedID ' + feedID;
                        resultStatus = 404;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }

                    state.feed = feeds[0];
                    // ufesTrue track _id of UserFeedEntry
                    //   documents where the user has marked specific feed
                    //   entries as read=true
                    state.feed.ufesTrue = [];
                    cb(null);
                });
            },
            function findTrueReadUFEs(cb) {
                UserFeedEntryModel.find({'userID' : user._id,
                                         'feedID' : state.feed._id,
                                         'read' : true}, function getFeedEntries(err, ufes) {
                    if (err) {
                        errStr = 'Error finding true read UFEs for ' + user.email;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }
                    state.feed.ufesTrue = ufes;
                    cb(null);
                });
            },
            function getUnreadFeedEntries(cb) {
                state.feed.readEntryIDs = [];
                
                state.feed.ufesTrue.forEach(function processFeed(ufe, index, array) {
                    state.feed.readEntryIDs.push(ufe.feedEntryID);
                });

                FeedEntryModel.find()
                    .where({'feedID' : state.feed._id})
                    .where('_id').nin(state.feed.readEntryIDs)
                    .exec(function getFeedEntries(err, entries) {
                        if (err) {
                            errStr = 'Error getting feed entries for feedID ' + feedID;
                            resultStatus = 400;
                            resultJSON = { error : errStr };
                            logger.debug(errStr);
                            cb(new Error(errStr));
                        }
                        state.feed.unreadEntries = entries;
                        cb(null);
                    });
            },
            function markEntriesAsRead(cb) {
                var entriesProcessed = 0;

                if (state.feed.unreadEntries.length == 0) {
                    cb(null);
                    return;
                }

                state.feed.unreadEntries.forEach(function markEntryAsRead(entry, index, array) {
                    UserFeedEntryModel.update({ 'userID' : user._id, 
                                                'feedID' : state.feed._id,
                                                'feedEntryID' : entry._id },
                                              { 'read' : true },
                                              { upsert : true }, function (err, numberAffected, raw) {
                        if (err) {
                            errStr = 'Error marking feedID ' + state.feed._id
                                     + ' entryID ' + entry._id + ' read=true'
                                     + ' for user ' + user.email;
                            resultStatus = 400;
                            resultJSON = { error : errStr };
                            logger.debug(errStr);
                            cb(new Error(errStr));
                            return;
                        }
                        entriesProcessed++;
                        if (entriesProcessed == array.length) {
                            cb(null);
                        }
                    });
                });
            },
            function formResponse(cb) {
                resultJSON = { feed : { _id : state.feed._id,
                                       'unreadCount' : 0 }};
                cb(null);
            }
        ]

        async.series(markUserFeedReadTasks, function finalizer(err, results) {
            if (null == resultStatus) {
                res.status(200);
            } else {
                res.status(resultStatus);
            }
            res.json(resultJSON);
        });
    });

    router.put('/feeds/:feedID/entries/:entryID', stormpath.apiAuthenticationRequired, function(req, res) {
        var feedID = req.params.feedID;
        var entryID = req.params.entryID;
        var readParam = req.param('read');
        var user = null;
        var errStr = null;
        var resultStatus = null;
        var resultJSON = null;
        var state = { };
        var markRead = null;

        logger.debug('Router for PUT /feeds/' + feedID + '/entries/' + entryID);

        if (undefined == readParam) {
            errStr = "Undefined read parameter";
            logger.debug(errStr);
            res.status(400);
            res.json({error: errStr});
            return;
        } else {
            if ('true' == readParam) {
                markRead = true;
            } else if ('false' == readParam) {
                markRead = false;
            } else {
                errStr = "read parameter must be either true or false";
                logger.debug(errStr);
                res.status(400);
                res.json({error: errStr});
                return;
            }
        }

        var markUserFeedEntryReadTasks = [
            function findUser(cb) {
                UserModel.find({'email' : req.user.email}, function(err, users) {
                    if (err) {
                        errStr = 'Internal error with mongoose looking user ' + req.user.email;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }

                    if (users.length == 0) {
                        errStr = 'Stormpath returned an email ' + req.user.email + ' for which we dont have a matching user object';
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }
                    user = users[0];
                    cb(null);
                });
            },
            function getFeed(cb) {
                if (-1 == user.subs.indexOf(feedID)) {
                    errStr = 'User not subscribed to feed ' + feedID;
                    resultStatus = 404;
                    resultJSON = { error : errStr };
                    logger.debug(errStr);
                    cb(new Error(errStr));
                    return;
                }
                FeedModel.find().where({'_id': feedID}).lean().exec(function getFeeds(err, feeds) {
                    if (err || (0 == feeds.length)) {
                        // I'm not sure if this could ever happen, maybe if a
                        // user was subscribed to a sub that got deleted?
                        // We'll handle it anyway because we rock.
                        errStr = 'Error finding feedID ' + feedID;
                        resultStatus = 404;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }

                    state.feed = feeds[0];
                    // ufesTrue track _id of UserFeedEntry
                    //   documents where the user has marked specific feed
                    //   entries as read=true
                    state.feed.ufesTrue = [];
                    cb(null);
                });
            },
            function checkEntryExists(cb) {
                FeedEntryModel.find().where({'_id': entryID}).exec(function getFeeds(err, entryArray) {
                    if (err || (0 == entryArray.length)) {
                        errStr = 'Error finding entryID ' + entryID;
                        resultStatus = 404;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }
                    state.entry = entryArray[0];
                    if (state.entry.feedID != feedID) {
                        errStr = 'Entry ' + entryID + ' is part of feed ' 
                                  + state.entry.feedID + ' not part of feed ' + feedID;
                        resultStatus = 404;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }
                    cb(null);
                });
            },
            function markEntry(cb) {
                UserFeedEntryModel.update({ 'userID' : user._id, 
                                            'feedID' : state.feed._id,
                                            'feedEntryID' : entryID },
                                          { 'read' : markRead },
                                          { upsert : true }, function (err, numberAffected, raw) {
                    if (err) {
                        errStr = 'Error marking feedID ' + feedID
                                 + ' entryID ' + entryID + ' read=' + markRead
                                 + ' for user ' + user.email;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }
                    cb(null);
                });
            },
            function findFeedEntryCount(cb) {
                FeedEntryModel.find()
                    .where({'feedID' : feedID})
                    .count()
                    .exec(function getFeeds(err, count) {
                        if (err) {
                            errStr = 'Error getting feed count ' + feedID;
                            resultStatus = 400;
                            resultJSON = { error : errStr };
                            logger.debug(errStr);
                            cb(new Error(errStr));
                            return;
                        }
                        state.feed.entryCount = count;
                        cb(null);
                    });
            },
            function findTrueReadUFECount(cb) {
                UserFeedEntryModel.find()
                   .where({ 'userID' : user._id,
                            'feedID' : state.feed._id,
                            'read' : true})
                   .count()
                   .exec(function getReadEntryCount(err, count) {
                        if (err) {
                            errStr = 'Error finding true read UFE Count for user ' 
                                     + user.email + ' feed ' + feedID;
                            resultStatus = 400;
                            resultJSON = { error : errStr };
                            logger.debug(errStr);
                            cb(new Error(errStr));
                            return;
                        }
                        state.feed.ufesTrueCount = count;
                        cb(null);
                });
            },
            function formResponse(cb) {
                var unreadCount = state.feed.entryCount - state.feed.ufesTrueCount;
                resultJSON = { feed : { '_id' : state.feed._id,
                                       'unreadCount' : unreadCount }};
                cb(null);
            }
        ]

        async.series(markUserFeedEntryReadTasks, function finalizer(err, results) {
            if (null == resultStatus) {
                res.status(200);
            } else {
                res.status(resultStatus);
            }
            res.json(resultJSON);
        });
    });

    app.use('/api/v1.0', router);
}
