'use strict';

var express = require('express');
var UserController = require('./user/user.controller');
var FeedController = require('./feed/feed.controller');
var exSp = require('express-stormpath');

module.exports.addAPIRouter = function(config, app, mongoose) {

    var router = express.Router();
    var models = require('./models/models')(mongoose);
    app.set('readerModels', models);

// Old settings from before stormpath-sdk-express was deprecated
// Keeping here until everything works properly again
//    var spConfig = {
//        appHref: config.sp.STORMPATH_APP_HREF,
//        apiKeyId: config.sp.STORMPATH_API_KEY_ID,
//        apiKeySecret: config.sp.STORMPATH_API_KEY_SECRET,
//        writeAccessTokenResponse: true,
//        allowedOrigins: ['http://localhost:3000',
//                         'https://localhost:3000',
//                         'http://localhost']
//    };
//    var spMiddleware = stormpath.createMiddleware(spConfig);

    router.use(exSp.init(app, {
        apiKey : {
            id: config.sp.STORMPATH_API_KEY_ID,
            secret: config.sp.STORMPATH_API_KEY_SECRET
        },
        application: {
            href: config.sp.STORMPATH_APP_HREF
        }
    }));

    var uc = new UserController(app, mongoose);
    var fc = new FeedController(app, mongoose);

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
               exSp.loginRequired, fc.getFeeds);
    router.get('/feeds/search',
               exSp.loginRequired, fc.getFeedSearch);
    router.put('/feeds/subscribe', exSp.loginRequired, fc.subscribe);
    router.get('/feeds/:feedID/search', 
               exSp.loginRequired, fc.getFeedEntrySearch);
    router.delete('/feeds/:feedID',
        exSp.loginRequired, fc.unsubscribe);
    router.get('/feeds/:feedID/entries',
               exSp.loginRequired, fc.getFeedEntries);
    router.put('/feeds/:feedID',
               exSp.loginRequired, fc.updateFeedReadStatus);
    router.put('/feeds/:feedID/entries/:entryID',
        exSp.loginRequired, fc.updateFeedEntryReadStatus);

    app.use('/api/v1.0', router);
}
