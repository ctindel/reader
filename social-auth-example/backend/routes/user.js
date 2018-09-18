'use strict';

const express = require('express');
const router = express.Router();

var _ = require('lodash');
var validator = require('validator');
var _mongoose = null;
var _models = null;
var _UserModel = null;
var _logger = null;

module.exports.addUserAPIRouter = function(app) {
    var router = express.Router();

    _logger = app.get("readerLogger");
    router.route('/user/enroll').post(userEnroll);

    return router;
}

var userEnroll = function(req, res) {
    var errStr = undefined;

    // Structure required by Stormpath API
    var account = {};
    account.givenName = account.surname = account.username = account.email
        = account.password = undefined;

    if (undefined == req.params['firstname']) {
        errStr = "Undefined First Name";
        _logger.debug(errStr);
        res.status(400);
        res.json({error: errStr});
        return;
    } else if (undefined == req.param('lastName')) {
        errStr = "Undefined Last Name";
        _logger.debug(errStr);
        res.status(400);
        res.json({error: errStr});
        return;
    } else if (undefined == req.param('email')) {
        errStr = "Undefined Email";
        _logger.debug(errStr);
        res.status(400);
        res.json({error: errStr});
        return;
    } else if (undefined == req.param('password')) {
        errStr = "Undefined Password";
        _logger.debug(errStr);
        res.status(400);
        res.json({error: errStr});
        return;
    }
    if (!validator.isEmail(req.param('email'))) {
        res.status(400);
        res.json({error: 'Invalid email format'})
        return;
    }
    _UserModel.find({'email' : req.param('email')}, function dupeEmail(err, results) {
        if (err) {
            _logger.debug("Error from dupeEmail check");
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

            _logger.debug("Calling stormPath createAccount API");
            req.app.get('stormpathApplication').createAccount(account, function(err, acc) {
                if (err) {
                    _logger.debug("Stormpath error: " + err.developerMessage);
                    res.status(400);
                    res.json({error: err.userMessage});
                } else {
                    console.dir(acc);
                    acc.createApiKey(function(err,apiKey) {
                        if (err) {
                            _logger.debug("Stormpath error: " + err.developerMessage);
                            res.status(400);
                            res.json({error: err.userMessage});
                        } else {
                            _logger.debug(apiKey);
                            _logger.debug("Successfully created new SP account for "
                                        + "firstName=" + acc.givenName
                                        + ", lastName=" + acc.surname
                                        + ", email=" + acc.email);
                            var newUser = new _UserModel(
                                {
                                  active: true,
                                  email: acc.email,
                                  firstName: acc.givenName,
                                  lastName: acc.surname,
                                  spApiKeyId: apiKey.id,
                                  spApiKeySecret: apiKey.secret
                                });
                            newUser.save(function (err, user) {
                                if (err) {
                                    _logger.error("Mongoose error creating new account for " + user.email);
                                    _logger.error(err);
                                    res.status(400);
                                    res.json({error: err});
                                } else {
                                    _logger.debug("Successfully added User object for " + user.email);
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
};
