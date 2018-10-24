'use strict';

const express = require('express');
const router = express.Router();

const MIN_PASSWORD_LENGTH = 8;

var _ = require('lodash');
var validator = require('validator');
var _UserModel = require('dynamoose').model('User');
var _logger = null;

module.exports.addUserAPIRouter = function(app) {
    var router = express.Router();

    _logger = app.get("readerLogger");
    router.route('/user/enroll').post(userEnroll);

    return router;
}

var userEnroll = function(req, res) {
    var errStr = undefined;

    if (undefined == req.body['fullName']) {
        errStr = "Undefined Full Name";
        _logger.debug(errStr);
        res.status(400);
        res.json({error: errStr});
        return;
    } else if (undefined == req.body['email']) {
        errStr = "Undefined Email";
        _logger.debug(errStr);
        res.status(400);
        res.json({error: errStr});
        return;
    } else if (undefined == req.body['password']) {
        errStr = "Undefined Password";
        _logger.debug(errStr);
        res.status(400);
        res.json({error: errStr});
        return;
    } else if (req.body['password'].length < MIN_PASSWORD_LENGTH) {
        errStr = "Password must be " + MIN_PASSWORD_LENGTH + " characters or longer";
        _logger.debug(errStr);
        res.status(400);
        res.json({error: errStr});
        return;
    }
    if (!validator.isEmail(req.body['email'])) {
        res.status(400);
        res.json({error: 'Invalid email format'})
        return;
    }
    _UserModel.queryOne('email').eq(req.body['email']).exec(
        function(err, user) {
            if (err) {
                _logger.debug("Error from dupeEmail check");
                console.dir(err);
                res.status(400);
                res.json(err);
                return;
            }
            if (!user) {
                // no user was found, lets create a new one
                _logger.debug("No existing user was found with email " + req.body['email']);
                _UserModel.upsertCognitoUser(
                    req.body['email'],
                    req.body['fullName'],
                    req.body['password'], function(error, savedUser) {
                        if (error) {
                            console.log(error);
                            _logger.error('Error saving user ' + req.body['email']);
                            res.status(400);
                            res.json({error: 'Error saving user ' + req.body['email']});
                            return;
                        }
                        _logger.error('Done saving new user ' + req.body['email']);
                        res.status(201);
                        res.json({'email' : req.body['email'], 'fullName' : req.body['fullName']})
                        return;
                    });
            } else {
                _logger.info("existing user was found with email " + req.body['email']);
                res.status(400);
                res.json({error: 'Account with that email already exists.  Please choose another email.'});
                return;
            }
        }
    );
};
