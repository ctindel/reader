'use strict';

var _ = require('lodash');
var async = require('async');
var util = require('util');

var _mongoose = null;
var _models = null;
var _UserModel = null;
var _FeedModel = null;
var _FeedEntryModel = null;
var _UserFeedEntryModel = null;
var _logger = null;

module.exports = FeedController;

function FeedController(app, stormpath, mongoose) {
    _mongoose = mongoose;
    _models = app.get('readerModels');
    _UserModel = _models.UserModel;
    _FeedModel = _models.FeedModel;
    _FeedEntryModel = _models.FeedEntryModel;
    _UserFeedEntryModel = _models.UserFeedEntryModel;
    _logger = app.get('readerLogger');
}

FeedController.prototype.getFeeds = function(req, res) {
    _logger.debug('Router for GET /feeds');

    var user = null;
    var errStr = null;
    var includeUnreadIDs = false;
    var resultStatus = null;
    var resultJSON = {feeds : []};
    var state = { feeds : [] };

    if(req.authenticationError){
        console.log("Authentication Error: ");
        console.dir(req.authenticationError);
    }

    if (undefined != req.param('includeUnreadIDs')) {
        if ('true' == req.param('includeUnreadIDs')) {
            includeUnreadIDs = true;
        } else {
            errStr = "includeUnreadIDs parameter must be true if set";
            _logger.debug(errStr);
            res.status(400);
            res.json({error: errStr});
            return;
        }
    }

    var getUserFeedsTasks = [
        function findUser(cb) {
            _UserModel.find({'email' : req.user.email}, function(err, users) {
                if (err) {
                    errStr = 'Internal error with mongoose looking user ' + req.user.email;
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                }

                if (users.length == 0) {
                    errStr = 'Stormpath returned an email ' + req.user.email + ' for which we dont have a matching user object';
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                }
                user = users[0];
                cb(null);
            });
        },
        function getFeeds(cb) {
            _FeedModel.find().where('_id').in(user.subs).lean().exec(function getFeeds(err, userFeeds) {
                if (err) {
                    errStr = 'Error finding subs for user ' + user.email;
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                }

                if (userFeeds.length == 0) {
                    _logger.debug('Empty set of feeds for user ' + user.email);
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
                _UserFeedEntryModel.find({'userID' : user._id,
                                         'feedID' : feed._id,
                                         'read' : true}, function getFeedEntries(err, ufes) {
                    if (err) {
                        errStr = 'Error finding true read UFEs for ' + user.email;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        _logger.debug(errStr);
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

                _FeedEntryModel.find()
                    .where({'feedID' : feed._id})
                    .where('_id').nin(feed.readEntryIDs)
                    .select('_id')
                    .exec(function getFeedEntries(err, entries) {
                        if (err) {
                            errStr = 'Error getting feed entries for feedID ' + feed._id;
                            resultStatus = 400;
                            resultJSON = { error : errStr };
                            _logger.debug(errStr);
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
                var userUnreadCount = feed.unreadEntryIDs.length;

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
};

FeedController.prototype.getFeedSearch = function(req, res) {
    _logger.debug('Router for GET /feeds/search');

    var user = null;
    var errStr = null;
    var searchQuery = null;
    var esResponse = null;
    var resultStatus = null;
    var resultJSON = {feeds : []};
    var state = { feeds : [] };

    if(req.authenticationError){
        console.log("Authentication Error: ");
        console.dir(req.authenticationError);
    }

    if (undefined == req.param('searchQuery')) {
        errStr = "Undefined searchQuery parameter";
        _logger.debug(errStr);
        res.status(400);
        res.json({error: errStr});
        return;
    }
    searchQuery = req.param('searchQuery').trim();
    if (null == searchQuery || '' == searchQuery) {
        errStr = "Invalid empty searchQuery parameter";
        _logger.debug(errStr);
        res.status(400);
        res.json({error: errStr});
        return;
    }

    var getUserFeedsTasks = [
        function findUser(cb) {
            _UserModel.find({'email' : req.user.email}, function(err, users) {
                if (err) {
                    errStr = 'Internal error with mongoose looking user ' + req.user.email;
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                }

                if (users.length == 0) {
                    errStr = 'Stormpath returned an email ' + req.user.email + ' for which we dont have a matching user object';
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                }
                user = users[0];
                cb(null);
            });
        },
        function searchFeeds(cb) {
            var elasticClient = req.app.get('elasticClient');
            var config = req.app.get('config');
            elasticClient.search({
                'index' : config.es.indexName,
                'type' : config.es.feedTypeName,
                'q' : searchQuery},
                function (err, response) {
                    if (err) {
                        errStr = 'Internal error with elasticClient.search on index' +
                            config.es.indexName + ', type ' + config.es.feedTypeName +
                            ' for query "' + searchQuery + '": ' +
                            util.inspect(err, false, null);
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        _logger.debug(errStr);
                        return cb(new Error(errStr));
                    }
                    console.log(util.inspect(response, false, null));
                    esResponse = response;
                    resultJSON = {};
                    return cb(null);
                }
            );
        },
        // function getFeeds(cb) {
        //     _FeedModel.find().where('_id').in(user.subs).lean().exec(function getFeeds(err, userFeeds) {
        //         if (err) {
        //             errStr = 'Error finding subs for user ' + user.email;
        //             resultStatus = 400;
        //             resultJSON = { error : errStr };
        //             _logger.debug(errStr);
        //             cb(new Error(errStr));
        //         }
        //
        //         if (userFeeds.length == 0) {
        //             _logger.debug('Empty set of feeds for user ' + user.email);
        //             cb(new Error("Not really an error but we want to shortcircuit the series"));
        //         } else {
        //             state.feeds = userFeeds;
        //             cb(null);
        //         }
        //     });
        // },
        function formResponse(cb) {
            var feedsProcessed = 0;

            state.feeds.forEach(function processFeed(feed, feedIndex, feedArray) {
                var userUnreadCount = feed.unreadEntryIDs.length;

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
};

FeedController.prototype.subscribe = function(req, res) {
    _logger.debug('Router for PUT /feeds/subscribe');

    // Users can't have more than 1000 feeds
    var MAX_USER_FEEDS = 200;

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
        _logger.debug(errStr);
        res.status(400);
        res.json({error: errStr});
        return;
    }

    var subFeedTasks = [
        function findUser(cb) {
            _UserModel.find({'email' : req.user.email}, function(err, users) {
                if (err && null == resultStatus) {
                    errStr = 'Internal error with mongoose looking user ' + req.user.email;
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                    return;
                }

                if (users.length == 0) {
                    errStr = 'Stormpath returned an email ' + req.user.email + ' for which we dont have a matching user object';
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
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
                    _logger.debug(errStr);
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
            var tmpFeed = new _FeedModel({'feedURL' : feedURL});
            tmpFeed.save(function(err, tmpFeed) {
                saveErr = err;
                _FeedModel.find({'feedURL' : feedURL}, function(err, newFeed) {
                    if (err && null == resultStatus) {
                        errStr = 'Error with mongoose looking for newly added feed '
                                 + feedURL + ' ' + JSON.stringify(saveErr);
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        _logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    } else {
                        feed = newFeed[0];
                        _logger.debug("Successfully added feed " + feedURL +
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
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                    return;
                } else {
                    _logger.debug("Successfully subscribed user " + user.email +
                                 " to feed " + feed.feedURL);
                    resultJSON = {'user' : user};
                    cb(null);
                }
            });
        }
    ]

    async.series(subFeedTasks, function finalizer(err, results) {
        if (null == resultStatus) {
            res.status(200);
        } else {
            res.status(resultStatus);
        }
        res.json(resultJSON);
    });
};

// Users can send in search queries in this format:
//  https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-simple-query-string-query.html#query-dsl-simple-query-string-query
FeedController.prototype.getFeedEntrySearch = function(req, res) {
    var feedID = req.params.feedID;
    var user = null;
    var errStr = null;
    var searchQuery = null;
    var pageIndex = null;
    var countPerPage = null;
    var esResponse = null;
    var resultStatus = null;
    var resultJSON = {feeds : []};
    var state = { feeds : [] };

    _logger.debug('Router for GET /feeds/' + feedID + '/search');

    var DEFAULT_COUNT_PER_PAGE = 25;
    var TITLE_FIELD_BOOST_FACTOR = 3;

    if(req.authenticationError){
        console.log("Authentication Error: ");
        console.dir(req.authenticationError);
    }

    if (undefined == req.param('searchQuery')) {
        errStr = "Undefined searchQuery parameter";
        _logger.debug(errStr);
        res.status(400);
        res.json({error: errStr});
        return;
    }
    searchQuery = req.param('searchQuery').trim();
    if (null == searchQuery || '' == searchQuery) {
        errStr = "Invalid empty searchQuery parameter";
        _logger.debug(errStr);
        res.status(400);
        res.json({error: errStr});
        return;
    }
    if (null == req.param('pageIndex')) {
        pageIndex = 0;
    } else {
        pageIndex = parseInt(req.param('pageIndex'));
        if (NaN == pageIndex) {
            errStr = "Invalid pageIndex parameter " + pageIndex;
            _logger.debug(errStr);
            res.status(400);
            res.json({error: errStr});
            return;
        }
    }

    if (null == req.param('countPerPage')) {
        countPerPage = DEFAULT_COUNT_PER_PAGE;
    } else {
        countPerPage = parseInt(req.param('countPerPage'));
        if (NaN == countPerPage) {
            errStr = "Invalid countPerPage parameter " + countPerPage;
            _logger.debug(errStr);
            res.status(400);
            res.json({error: errStr});
            return;
        }
    }

    _logger.debug('searchQuery is ' + searchQuery);

    var getFeedSearchTasks = [
        function findUser(cb) {
            _UserModel.find({'email' : req.user.email}, function(err, users) {
                if (err) {
                    errStr = 'Internal error with mongoose looking user ' + req.user.email;
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                }

                if (users.length == 0) {
                    errStr = 'Stormpath returned an email ' + req.user.email + ' for which we dont have a matching user object';
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                }
                user = users[0];
                cb(null);
            });
        },
        function verifyFeed(cb) {
            if (-1 == user.subs.indexOf(feedID)) {
                errStr = 'User not subscribed to feed ' + feedID;
                resultStatus = 404;
                resultJSON = { error : errStr };
                _logger.debug(errStr);
                return cb(new Error(errStr));
            }
            cb(null);
        },
        function searchFeedEntries(cb) {
            var elasticClient = req.app.get('elasticClient');
            var config = req.app.get('config');
            var query = {
                'index' : config.es.indexName,
                'type' : config.es.feedEntryTypeName,
                'body' : {
                    'query' : {
                        'bool' : {
                            'should' : {
                                'simple_query_string' : {
                                    'query': searchQuery,
                                    // 'analyzer': 'snowball',
                                    'fields': ['title'],
                                    'default_operator': 'and',
                                    'boost' : TITLE_FIELD_BOOST_FACTOR
                                },
                            },
                            'should' : {
                                'simple_query_string' : {
                                    'query': searchQuery,
                                    // 'analyzer': 'snowball',
                                    'fields': ['description', 'content', 'summary'],
                                    'default_operator': 'and'
                                },
                            },
                            'filter' : [
                                {
                                    'term' : { 'feedID' : feedID }
                                }
                            ]

                        }
                    },
                    'from' : countPerPage * (pageIndex),
                    'size' : countPerPage,
                    'sort' : [
                        {
                            'publishedDate': {
                                'missing': '_last',
                                'unmapped_type': 'date',
                                'order': 'desc'
                            }
                        },
                        '_score'
                    ],
                    'track_scores' : true
                }
            };
            elasticClient.search(query, function (err, response) {
                if (err) {
                    errStr = 'Internal error with elasticClient.search on index' +
                        config.es.indexName + ', type ' + config.es.feedEntryTypeName +
                        ' for query "' + searchQuery + '": ' +
                        util.inspect(err, false, null);
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    return cb(new Error(errStr));
                }
                // console.log(util.inspect(response, false, null));
                esResponse = response;
                esResponse['_id'] = esResponse['mongoID'];
                console.log('response size: ' + esResponse.hits.hits.length);
                delete esResponse['mongoID'];
                return cb(null);
            });
        },
        function formResponse(cb) {
            var feedsProcessed = 0;

            resultJSON = {
                'feedID' : feedID,
                'searchQuery' : searchQuery,
                'pageIndex' : pageIndex,
                'entries' : esResponse.hits.hits.map(function(obj) {
                    return obj['_source'];
                })
            };
            cb(null);
        }
    ]

    async.series(getFeedSearchTasks, function finalizer(err, results) {
        if (null == resultStatus) {
            res.status(200);
        } else {
            res.status(resultStatus);
        }
        res.json(resultJSON);
    });
};

FeedController.prototype.unsubscribe = function(req, res) {
    var feedID = req.params.feedID;

    var resultStatus = null;
    var resultJSON = [];

    var user = null;
    var errStr = null;
    var resultStatus = null;
    var resultJSON = {user : null};

    _logger.debug('Router for DELETE /feeds/' + feedID);

    var unsubFeedTasks = [
        function findUser(cb) {
            _UserModel.find({'email' : req.user.email}, function(err, users) {
                if (err && null == resultStatus) {
                    errStr = 'Internal error with mongoose looking user ' + req.user.email;
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                    return;
                }

                if (users.length == 0) {
                    errStr = 'Stormpath returned an email ' + req.user.email + ' for which we dont have a matching user object';
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                    return;
                }
                user = users[0];
                cb(null);
            });
        },
        function unsubscribeFeed(cb) {
            if (-1 == user.subs.indexOf(feedID)) {
                errStr = 'User not subscribed to feed ' + feedID;
                resultStatus = 404;
                resultJSON = { error : errStr };
                _logger.debug(errStr);
                cb(new Error(errStr));
                return;
            }
            user.subs.pull(feedID);
            user.save(function(err, user) {
                if (err && null == resultStatus) {
                    errStr = 'Error saving user ' + user.email
                             + ' ' + JSON.stringify(err);
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                    return;
                } else {
                    _logger.debug("Successfully unsubscribed user " + user.email +
                                 " from feed " + feedID);
                    resultJSON = {'user' : user};
                    cb(null);
                }
            });
        }
    ]

    async.series(unsubFeedTasks, function finalizer(err, results) {
        if (null == resultStatus) {
            res.status(200);
        } else {
            res.status(resultStatus);
        }
        res.json(resultJSON);
    });
};

FeedController.prototype.getFeedEntries = function(req, res) {
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

    _logger.debug('Router for GET /feeds/' + feedID + '/entries');

    if (undefined == req.param('unreadOnly')) {
        errStr = "Undefined unreadOnly parameter";
        _logger.debug(errStr);
        res.status(400);
        res.json({error: errStr});
        return;
    } else {
        unreadEntryIDStr = req.param('unreadEntryIDs');
        if (undefined != unreadEntryIDStr) {
            if (unreadEntryIDStr.length > MAX_UNREAD_ENTRY_ID_STR_LENGTH) {
                errStr = "unreadEntryIDs parameter must be shorter than "
                         + MAX_UNREAD_ENTRY_ID_STR_LENGTH + " bytes";
                _logger.debug(errStr);
                res.status(400);
                res.json({error: errStr});
                return;
            }
            unreadEntryIDs = unreadEntryIDStr.split(',');
            if (unreadEntryIDs.length > MAX_UNREAD_ENTRY_ID_ARR_LENGTH) {
                errStr = "unreadEntryIDs parameter must be fewer than "
                         + MAX_UNREAD_ENTRY_ID_ARR_LENGTH + " entries";
                _logger.debug(errStr);
                res.status(400);
                res.json({error: errStr});
                return;
            }
            if ('true' != req.param('unreadOnly')) {
                errStr = "unreadOnly parameter must be true if unreadEntryIDs is set";
                _logger.debug(errStr);
                res.status(400);
                res.json({error: errStr});
                return;
            }
        }
        if (('true' != req.param('unreadOnly')) && ('false' != req.param('unreadOnly'))) {
            errStr = "unreadOnly parameter must be either true or false";
            _logger.debug(errStr);
            res.status(400);
            res.json({error: errStr});
            return;
        }
    }

    var getUserFeedEntryTasks = [
        function findUser(cb) {
            _UserModel.find({'email' : req.user.email}, function(err, users) {
                if (err) {
                    errStr = 'Internal error with mongoose looking user ' + req.user.email;
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                    return;
                }

                if (users.length == 0) {
                    errStr = 'Stormpath returned an email ' + req.user.email + ' for which we dont have a matching user object';
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
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
                _logger.debug(errStr);
                cb(new Error(errStr));
                return;
            }
            _FeedModel.find().where({'_id': feedID}).lean().exec(function getFeeds(err, feeds) {
                if (err || (0 == feeds.length)) {
                    // I'm not sure if this could ever happen, maybe if a
                    // user was subscribed to a sub that got deleted?
                    // We'll handle it anyway because we rock.
                    errStr = 'Error finding feedID ' + feedID;
                    resultStatus = 404;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
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
            _UserFeedEntryModel.find({'userID' : user._id,
                                     'feedID' : state.feed._id,
                                     'read' : true}, function getFeedEntries(err, ufes) {
                if (err) {
                    errStr = 'Error finding true read UFEs for ' + user.email;
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
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

            var query = _FeedEntryModel.find()
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
                    _logger.debug(errStr);
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

            _FeedEntryModel.find()
                .where({'feedID' : state.feed._id})
                .where('_id').in(state.feed.readEntryIDs)
                .lean()
                .exec(function getFeedEntries(err, entries) {
                    if (err) {
                        errStr = 'Error getting feed entries for feedID' + feedID;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        _logger.debug(errStr);
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
};

FeedController.prototype.updateFeedReadStatus = function(req, res) {
    var feedID = req.params.feedID;
    var user = null;
    var errStr = null;
    var resultStatus = null;
    var resultJSON = null;
    var readParam = req.param('read');
    var state = { };

    _logger.debug('Router for PUT /feeds/' + feedID);

    if (undefined == readParam) {
        errStr = "Undefined read parameter";
        _logger.debug(errStr);
        res.status(400);
        res.json({error: errStr});
        return;
    } else {
        if (('true' != readParam)) {
            errStr = "read parameter must be true";
            _logger.debug(errStr);
            res.status(400);
            res.json({error: errStr});
            return;
        }
    }

    var markUserFeedReadTasks = [
        function findUser(cb) {
            _UserModel.find({'email' : req.user.email}, function(err, users) {
                if (err) {
                    errStr = 'Internal error with mongoose looking user ' + req.user.email;
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                    return;
                }

                if (users.length == 0) {
                    errStr = 'Stormpath returned an email ' + req.user.email + ' for which we dont have a matching user object';
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
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
                _logger.debug(errStr);
                cb(new Error(errStr));
                return;
            }
            _FeedModel.find().where({'_id': feedID}).lean().exec(function getFeeds(err, feeds) {
                if (err || (0 == feeds.length)) {
                    // I'm not sure if this could ever happen, maybe if a
                    // user was subscribed to a sub that got deleted?
                    // We'll handle it anyway because we rock.
                    errStr = 'Error finding feedID ' + feedID;
                    resultStatus = 404;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
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
            _UserFeedEntryModel.find({'userID' : user._id,
                                     'feedID' : state.feed._id,
                                     'read' : true}, function getFeedEntries(err, ufes) {
                if (err) {
                    errStr = 'Error finding true read UFEs for ' + user.email;
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
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

            _FeedEntryModel.find()
                .where({'feedID' : state.feed._id})
                .where('_id').nin(state.feed.readEntryIDs)
                .exec(function getFeedEntries(err, entries) {
                    if (err) {
                        errStr = 'Error getting feed entries for feedID ' + feedID;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        _logger.debug(errStr);
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
                _UserFeedEntryModel.update({ 'userID' : user._id,
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
                        _logger.debug(errStr);
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
};

FeedController.prototype.updateFeedEntryReadStatus = function(req, res) {
    var feedID = req.params.feedID;
    var entryID = req.params.entryID;
    var readParam = req.param('read');
    var user = null;
    var errStr = null;
    var resultStatus = null;
    var resultJSON = null;
    var state = { };
    var markRead = null;

    _logger.debug('Router for PUT /feeds/' + feedID + '/entries/' + entryID);

    if (undefined == readParam) {
        errStr = "Undefined read parameter";
        _logger.debug(errStr);
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
            _logger.debug(errStr);
            res.status(400);
            res.json({error: errStr});
            return;
        }
    }

    var markUserFeedEntryReadTasks = [
        function findUser(cb) {
            _UserModel.find({'email' : req.user.email}, function(err, users) {
                if (err) {
                    errStr = 'Internal error with mongoose looking user ' + req.user.email;
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                    return;
                }

                if (users.length == 0) {
                    errStr = 'Stormpath returned an email ' + req.user.email + ' for which we dont have a matching user object';
                    resultStatus = 400;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
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
                _logger.debug(errStr);
                cb(new Error(errStr));
                return;
            }
            _FeedModel.find().where({'_id': feedID}).lean().exec(function getFeeds(err, feeds) {
                if (err || (0 == feeds.length)) {
                    // I'm not sure if this could ever happen, maybe if a
                    // user was subscribed to a sub that got deleted?
                    // We'll handle it anyway because we rock.
                    errStr = 'Error finding feedID ' + feedID;
                    resultStatus = 404;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
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
            _FeedEntryModel.find().where({'_id': entryID}).exec(function getFeeds(err, entryArray) {
                if (err || (0 == entryArray.length)) {
                    errStr = 'Error finding entryID ' + entryID;
                    resultStatus = 404;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                    return;
                }
                state.entry = entryArray[0];
                if (state.entry.feedID != feedID) {
                    errStr = 'Entry ' + entryID + ' is part of feed '
                              + state.entry.feedID + ' not part of feed ' + feedID;
                    resultStatus = 404;
                    resultJSON = { error : errStr };
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                    return;
                }
                cb(null);
            });
        },
        function markEntry(cb) {
            _UserFeedEntryModel.update({ 'userID' : user._id,
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
                    _logger.debug(errStr);
                    cb(new Error(errStr));
                    return;
                }
                cb(null);
            });
        },
        function findFeedEntryCount(cb) {
            _FeedEntryModel.find()
                .where({'feedID' : feedID})
                .count()
                .exec(function getFeeds(err, count) {
                    if (err) {
                        errStr = 'Error getting feed count ' + feedID;
                        resultStatus = 400;
                        resultJSON = { error : errStr };
                        _logger.debug(errStr);
                        cb(new Error(errStr));
                        return;
                    }
                    state.feed.entryCount = count;
                    cb(null);
                });
        },
        function findTrueReadUFECount(cb) {
            _UserFeedEntryModel.find()
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
                        _logger.debug(errStr);
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
};
