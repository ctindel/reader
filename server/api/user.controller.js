var express = require('express');
var validator = require('validator');
var passwordValidator = require('password-validator');

module.exports = UserController;

var _app = undefined;
var _mongoose = undefined;
var _models = undefined;
var _UserModel = undefined;
var _logger = undefined;

function UserController(app, mongoose) {
    _app = app;
    _mongoose = mongoose;
    _models = app.get('readerModels');
    _UserModel = _models.UserModel;
    _logger = app.get('readerLogger');
}

UserController.prototype.addUserAPIRouter = function (app) {
    var router = express.Router();

    router.post('/user/enroll', this.enroll);

    return router;
}

UserController.prototype.enroll = function (req, res) {
    var account = {};
    account.username = account.email = account.password = undefined;

    var pv = new passwordValidator()
        .min(8, 'Password requires minimum 8 characters')
        .has().uppercase(1, 'Password requires at least 1 uppercase character')
        .has().lowercase(1, 'Password requires at least 1 lowercase character')
        .has().digits(1, 'Password requires at least 1 number character')

    if (undefined == req.body.name) {
        errStr = "Undefined Name";
        _logger.debug(errStr);
        res.status(400);
        res.json({ error: errStr });
        return;
    } else if (undefined == req.body.email) {
        errStr = "Undefined Email";
        _logger.debug(errStr);
        res.status(400);
        res.json({ error: errStr });
        return;
    } else if (!validator.isEmail(req.body.email)) {
        errStr = "Invalid email format";
        res.status(400);
        res.json({ error: errStr });
        return;
    } else if (undefined == req.body.password) {
        errStr = "Undefined Password";
        _logger.debug(errStr);
        res.status(400);
        res.json({ error: errStr });
        return;
    } else if (!pv.validate(req.body.password)) {
        console.dir(pv.validate(req.body.password, { details: true }));
        errStr = "Invalid password format: " + pv.validate(req.body.password, { list: true }).map(value => value.message).join(', ');
        _logger.debug(errStr);
        res.status(400);
        res.json({ error: errStr });
        return;
    }
    _UserModel.find({ 'email': req.body.email }, function dupeEmail(err, results) {
        if (err) {
            _logger.debug("Error from dupeEmail check: " + err.toString());
            res.status(500);
            res.json('Internal error checking for duplicate email address');
            return;
        }
        if (results.length > 0) {
            errStr = `Account with email ${req.body.email} already exists.  Please choose another email.`;
            _logger.debug(errStr);
            res.status(400);
            res.json({ error: errStr });
            return;
        } else {
            var newUser = new _UserModel(
                {
                    active: true,
                    email: req.body.email,
                    name: req.body.name,
                    localProvider: {password: req.body.password}
                }
            );
            newUser.save(function (err, user) {
                if (err) {
                    errStr = `Mongoose error creating new account for ${user.email}`;
                    _logger.error(errStr);
                    _logger.error(err);
                    res.status(500);
                    res.json({ error: err });
                } else {
                    _logger.debug("Successfully added User object for " + user.email);
                    res.status(201);
                    res.json(user);
                }
            });
        }
    });
}
