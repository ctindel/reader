'use strict';

var express = require('express');
var UserController = require('./user/user.controller');
var FeedController = require('./feed/feed.controller');
var stormpath = require('stormpath-sdk-express');

module.exports.addAPIRouter = function(config, app, mongoose) { 

    var router = express.Router();
    var models = require('./models/models')(mongoose);
    app.set('readerModels', models);

    var spConfig = {
        appHref: config.sp.STORMPATH_APP_HREF,
        apiKeyId: config.sp.STORMPATH_API_KEY_ID,
        apiKeySecret: config.sp.STORMPATH_API_KEY_SECRET,
        writeAccessTokenResponse: true,
        //writeAccessTokenResponse: false,
        //endOnError: false,
        allowedOrigins: ['http://localhost:3000', 
                         'https://localhost:3000', 
                         'http://localhost']
    };
    var spMiddleware = stormpath.createMiddleware(spConfig);

    var uc = new UserController(app, spMiddleware, mongoose);
    var fc = new FeedController(app, spMiddleware, mongoose);

    spMiddleware.attachDefaults(router);

    router.use(function(req, res, next) {
        res.contentType('application/json');
        next();
    });

//    app.post('/api/*', function(req, res, next) {
//        res.contentType('application/json');
//        next();
//    });
//
//    app.put('/api/*', function(req, res, next) {
//        res.contentType('application/json');
//        next();
//    });
//
//    app.delete('/api/*', function(req, res, next) {
//        res.contentType('application/json');
//        next();
//    });

    router.get('/', function(req, res) {
        res.json({ message: 'hooray! welcome to our api!' });
    });

    router.post('/user/enroll', uc.enroll);

    router.get('/feeds', 
               spMiddleware.authenticate, fc.getFeeds);
    router.put('/feeds/subscribe', spMiddleware.authenticate, fc.subscribe);
    router.delete('/feeds/:feedID', 
        spMiddleware.authenticate, fc.unsubscribe);
    router.get('/feeds/:feedID/entries', 
               spMiddleware.authenticate, fc.getFeedEntries);
    router.put('/feeds/:feedID', 
               spMiddleware.authenticate, fc.updateFeedReadStatus);
    router.put('/feeds/:feedID/entries/:entryID',
        spMiddleware.authenticate, fc.updateFeedEntryReadStatus);

    app.use('/api/v1.0', router);
}
