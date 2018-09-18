var express = require('express');
var { generateToken, sendToken } = require('../utils/token.utils');
var passport = require('passport');
var config = require('../config');
var request = require('request');
require('../passport')();
var authRoutes = require('./auth');
var userRoutes = require('./user');
var feedRoutes = require('./feed');

module.exports.addAPIRouter = function(app) {

    app.use('/api/v1/', authRoutes.addSocialAuthAPIRouter(app));
    // app.use('/api/v1/', passport.authenticate('jwt', {session: false}), authRoutes.addAuthCheckAPIRouter(app));
    app.use('/api/v1/', userRoutes.addUserAPIRouter(app));
    // app.use('/api/v1/', passport.authenticate('jwt', {session: false}), feedRoutes.addFeedAPIRouter(app));

}
