var express = require('express');
var passport = require('passport');
var GoogleTokenStrategy = require('passport-google-token').Strategy;
var LocalStrategy = require('passport-local').Strategy;
const passportJWT = require("passport-jwt");
const JWTStrategy   = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;var jwt = require('jsonwebtoken');

module.exports = AuthController;

var _app = undefined;
var _mongoose = undefined;
var _models = undefined;
var _UserModel = undefined;
var _logger = undefined;

function AuthController(app, mongoose) {
    _app = app;
    _mongoose = mongoose;
    _models = app.get('readerModels');
    _UserModel = _models.UserModel;
    _logger = app.get('readerLogger');
}

var createToken = function(auth) {
    return jwt.sign({
            id: auth.id
        }, _app.get('config').jwt.secret,
        {
            expiresIn: 60 * 120
        }
    );
};

var generateToken = function(req, res, next) {
      req.token = createToken(req.auth);
      return next();
}

var sendToken = function(req, res) {
    res.setHeader('x-auth-token', req.token);
    return res.status(200).send(JSON.stringify(req.user));
}

AuthController.prototype.addAuthAPIRouter = function(app) {
    var router = express.Router();

    passport.use(new GoogleTokenStrategy({
            clientID: app.get('config').googleAuth.clientID,
            clientSecret: app.get('config').googleAuth.clientSecret,
            callbackURL: app.get('config').googleAuth.callbackURL
        },
        function (accessToken, refreshToken, profile, done) {
            _UserModel.upsertGoogleUser(accessToken, refreshToken, profile, function(err, user) {
                return done(err, user);
            });
        }
    ));

    if (process.env.NODE_ENV == 'dev') {
        console.log("NODE_ENV=" + process.env.NODE_ENV + ", Adding passport LocalStrategy");
        passport.use(new LocalStrategy(
            {
                usernameField: 'email',
                passwordField: 'password',
                session: false
            },
            function(email, password, done) {
                _UserModel.findOne({'email' : email}, function(err, user) {
                    if (err) { return done(err); }
                    if (!user) { return done(null, false); }
                    if (user.localProvider.password != password) { return done(null, false); }
                    return done(err, user);
                });
            }
        ));
    }

    passport.use(new JWTStrategy({
            jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
            secretOrKey   : app.get('config').jwt.secret
        },
        function (jwtPayload, cb) {
            return _UserModel.findById(jwtPayload.id)
            .then(user => {
                return cb(null, user);
            })
            .catch(err => {
                return cb(err);
            });
        }
    ));

    router.route('/auth/google')
        .post(passport.authenticate('google-token', {session: false}), function(req, res, next) {
            if (!req.user) {
                return res.send(401, 'User Not Authenticated');
            }
            req.auth = {
                id: req.user.id
            };

            next();
        }, generateToken, sendToken);

    if (process.env.NODE_ENV == 'dev' || process.env.NODE_ENV == 'qa' ) {
        router.route('/auth/local')
            .post(passport.authenticate('local', {session: false}), function(req, res, next) {
                if (!req.user) {
                    return res.send(401, 'User Not Authenticated');
                }
                req.auth = {
                    id: req.user.id
                };

                next();
            }, generateToken, sendToken);
        }

        return router;
}
