'use strict';

var express = require('express');
var AuthController = require('./auth.controller');
var UserController = require('./user.controller');
var FeedController = require('./feed.controller');
var passport = require('passport');

module.exports.addAPIRouter = function(config, app, mongoose) {

    //var router = express.Router();
    var models = require('./models')(mongoose);
    app.set('readerModels', models);

    var ac = new AuthController(app, mongoose);
    var uc = new UserController(app, mongoose);
    var fc = new FeedController(app, mongoose);

    app.use('/api/v1.0/', ac.addAuthAPIRouter(app));
    app.use('/api/v1.0/', uc.addUserEnrollAPIRouter(app));
    app.use('/api/v1.0/', passport.authenticate('jwt', {session: false}), fc.addFeedAPIRouter(app));

    // router.use(function(req, res, next) {
    //     res.contentType('application/json');
    //     next();
    // });

    // router.get('/', function(req, res) {
    //     res.json({ message: 'hooray! welcome to our api!' });
    // });
    //
    // router.post('/user/enroll', uc.enroll);
    //
    // router.get('/feeds',
    //            exSp.loginRequired, fc.getFeeds);
    // router.put('/feeds/subscribe', exSp.loginRequired, fc.subscribe);
    // router.get('/feeds/:feedID/search',
    //            exSp.loginRequired, fc.getFeedEntrySearch);
    // router.delete('/feeds/:feedID',
    //     exSp.loginRequired, fc.unsubscribe);
    // router.get('/feeds/:feedID/entries',
    //            exSp.loginRequired, fc.getFeedEntries);
    // router.put('/feeds/:feedID',
    //            exSp.loginRequired, fc.updateFeedReadStatus);
    // router.put('/feeds/:feedID/entries/:entryID',
    //     exSp.loginRequired, fc.updateFeedEntryReadStatus);
    //
    // app.use('/api/v1.0', router);
}
