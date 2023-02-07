const express = require("express");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { OAuth2Client } = require("google-auth-library");
const passportJWT = require("passport-jwt");
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;
const jwt = require("jsonwebtoken");
const jwt_decode = require("jwt-decode");

module.exports = AuthController;

var _app = undefined;
var _mongoose = undefined;
var _models = undefined;
var _UserModel = undefined;
var _logger = undefined;

function AuthController(app, mongoose) {
    _app = app;
    _mongoose = mongoose;
    _models = app.get("readerModels");
    _UserModel = _models.UserModel;
    _logger = app.get("readerLogger");
}

var createToken = function (email) {
    return jwt.sign(
        {
            email: email,
        },
        _app.get("config").jwt.secret,
        {
            expiresIn: 60 * 120,
        }
    );
};

var generateToken = function (req, res, next) {
    req.token = createToken(req.user.email);
    return next();
};

var sendToken = function (req, res) {
    res.setHeader("Access-Control-Expose-Headers", "x-auth-token");
    res.setHeader("x-auth-token", req.token);
    return res.status(200).send(JSON.stringify(req.user));
};

AuthController.prototype.addAuthAPIRouter = function (app) {
    var router = express.Router();
    var errStr;

    const oAuth2Client = new OAuth2Client(
        app.get("config").googleAuth.clientID,
        app.get("config").googleAuth.clientSecret,
        "postmessage"
    );

    /*     passport.use(new GoogleTokenStrategy({
            clientID: app.get('config').googleAuth.clientID,
            clientSecret: app.get('config').googleAuth.clientSecret,
            callbackURL: app.get('config').googleAuth.callbackURL
        },
        function (accessToken, refreshToken, profile, done) {
            _UserModel.upsertGoogleUser(accessToken, refreshToken, profile, function(err, user) {
                return done(err, user);
            });
        }
    )); */

    if (process.env.NODE_ENV == "dev") {
        console.log(
            "NODE_ENV=" +
                process.env.NODE_ENV +
                ", Adding passport LocalStrategy"
        );
        passport.use(
            new LocalStrategy(
                {
                    usernameField: "email",
                    passwordField: "password",
                    session: false,
                },
                function (email, password, done) {
                    _UserModel.findOne({ email: email }, function (err, user) {
                        if (err) {
                            return done(err);
                        }
                        if (!user) {
                            return done(null, false);
                        }
                        if (user.localProvider.password != password) {
                            return done(null, false);
                        }
                        return done(err, user);
                    });
                }
            )
        );
    }

    passport.use(
        new JWTStrategy(
            {
                jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
                secretOrKey: app.get("config").jwt.secret,
            },
            function (jwtPayload, cb) {
                console.log(jwtPayload);
                _UserModel.findOne(
                    { email: jwtPayload.email },
                    function (err, user) {
                        if (err) {
                            return cb(err);
                        }
                        if (!user) {
                            return cb(null, false);
                        }
                        return cb(err, user);
                    }
                );
            }
        )
    );

    router.route("/auth/google").post(
        async (req, res, next) => {
            _logger.info(
                "/auth/google request body: " + JSON.stringify(req.body)
            );
            var decodedJwt = jwt.decode(
                req.body.credential,
                app.get("config").googleAuth.clientSecret
            );
            _logger.info(
                "/auth/google decodedJWT: " + JSON.stringify(decodedJwt)
            );

            try {
                const ticket = await oAuth2Client.verifyIdToken({
                    idToken: req.body.credential,
                    audience: app.get("config").googleAuth.clientID,
                });
                // Get the JSON with all the user info
                const payload = ticket.getPayload();
                _logger.info(
                    "Google oAuth Ticket info: " + JSON.stringify(payload)
                );
                if (payload.aud != app.get("config").googleAuth.clientID) {
                    errStr = `Payload audience {payload.aud} does not match clientID {app.get('config').googleAuth.clientID}`;
                    _logger.info(errStr);
                    return res.status(401).send(errStr);
                }
                if (!payload.email_verified) {
                    errStr = `User {payload.email} has not validated their email address with Google`;
                    _logger.info(errStr);
                    return res.status(401).send(errStr);
                }
                req.user = await _UserModel.upsertGoogleUser(
                    req.body.credential,
                    payload
                );
            } catch (err) {
                _logger.error("auth/google error: " + err);
                return res
                    .status(401)
                    .send(
                        "Error Validating Google OAuth Token for " +
                            decodedJwt.email
                    );
            }

            if (!req.user) {
                return res.status(401).send("User Not Authenticated");
            }

            next();
        },
        generateToken,
        sendToken
    );

    if (process.env.NODE_ENV == "dev" || process.env.NODE_ENV == "qa") {
        router.route("/auth/local").post(
            passport.authenticate("local", { session: false }),
            function (req, res, next) {
                if (!req.user) {
                    return res.status(401).send("User Not Authenticated");
                }

                next();
            },
            generateToken,
            sendToken
        );
    }

    return router;
};
