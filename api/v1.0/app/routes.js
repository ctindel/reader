var express = require('express');
var logger = require('../logger');     
var security = require('../config/security');

exports.addAPIRouter = function(app, mongoose, stormpath) {

    var router = express.Router();
    router.use(stormpath.init(app, {
        apiKeyFile: './config/stormpath_apikey.properties',
        application:
    'https://api.stormpath.com/v1/applications/6TuQV4SKxQNGE2YegGEeoj',
        secretKey: security.stormpath_secret_key
    }));

    var userSchema = new mongoose.Schema({
        active: Boolean,
        email: { type: String, trim: true, lowercase: true },
        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },
        sp_api_key_id: { type: String, trim: true },
        sp_api_key_secret: { type: String, trim: true },
        subs: { type: [mongoose.Schema.Types.ObjectId], default: []},
        created: { type: Date, default: Date.now },
        lastLogin: { type: Date, default: Date.now },
    }, 
    { collection: 'user' }
    );
    var UserModel = mongoose.model( 'User', userSchema );

    // GET
    app.get('/*', function(req, res, next) {
        res.contentType('application/json');
        next();
    });

    // POST
    app.post('/*', function(req, res, next) {
        res.contentType('application/json');
        next();
    });

    // PUT
    app.put('/*', function(req, res, next) {
        res.contentType('application/json');
        next();
    });

    // DELETE
    app.delete('/*', function(req, res, next) {
        res.contentType('application/json');
        next();
    });

    // test route to make sure everything is working (accessed at GET
    // http://localhost:8080/api/v1.0)
    router.get('/', function(req, res) {
        res.json({ message: 'hooray! welcome to our api!' });
    });

    router.post('/user/enroll', function(req, res) {
        err_str = undefined;

        // Structure required by Stormpath API
        account = {};
        account.givenName = account.surname = account.username = account.email
            = account.password = undefined;

        if (undefined == req.param('firstName')) {
            err_str = "Undefined First Name";
            logger.debug(err_str);
            res.status(400);
            res.json({error: err_str});
        } else if (undefined == req.param('lastName')) {
            err_str = "Undefined Last Name";
            logger.debug(err_str);
            res.status(400);
            res.json({error: err_str});
        } else if (undefined == req.param('email')) {
            err_str = "Undefined Email";
            logger.debug(err_str);
            res.status(400);
            res.json({error: err_str});
        } else if (undefined == req.param('password')) {
            err_str = "Undefined Password";
            logger.debug(err_str);
            res.status(400);
            res.json({error: err_str});
        } else {
            account.givenName = req.param('firstName');
            account.surname = req.param('lastName');
            account.username = req.param('email');
            account.email = req.param('email');
            account.password = req.param('password');

            logger.debug("Calling stormPath createAccount API");
            app.get('stormpathApplication').createAccount(account, function(err, acc) {
                if (err) { 
                    logger.debug("Stormpath error: " + err.developerMessage);
                    res.status(400);
                    res.json({error: err.userMessage});
                } else {
                    acc.createApiKey(function(err,apiKey) {
                        if (err) { 
                            logger.debug("Stormpath error: " + err.developerMessage);
                            res.status(400);
                            res.json({error: err.userMessage});
                        } else {
                            //logger.debug(apiKey);
                            logger.debug("Successfully created new SP account for "
                                        + "firstName=" + acc.givenName
                                        + ", lastName=" + acc.surname
                                        + ", email=" + acc.email);
                            var newUser = new UserModel(
                                { 
                                  active: true, 
                                  email: acc.email,
                                  firstName: acc.givenName,
                                  lastName: acc.surname,
                                  sp_api_key_id: apiKey.id,
                                  sp_api_key_secret: apiKey.secret
                                });
                            newUser.save(function (err, user) {
                                if (err) {
                                    logger.error("Mongoose error creating new account for " + user.email);
                                    logger.error(err);
                                    res.status(400);
                                    res.json({error: err}); 
                                } else {
                                    logger.debug("Successfully added User object for " + user.email);
                                    res.status(200);
                                    res.json(user); 
                                }
                            });
                        }
                    });
                }
            });
        }
    });

    router.get('/feeds', stormpath.apiAuthenticationRequired, function(req, res) {
        logger.debug('Router for /feeds');
        var user = req.user;
        req.status(200);
        res.json({fn: user.givenName, email: user.email});
    });

    app.use('/api/v1.0', router);
}
