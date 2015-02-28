// modules =================================================

//var logger = require("./logger");
var express        = require('express');
require('pretty-error').start();
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var mongoose       = require('mongoose');

//logger.debug("Overriding 'Express' logger");

    //var expressWinston = require('express-winston');
    //var winston = require('winston'); // for transports.Console

var stormpath = require('express-stormpath');
var routes = require("./app/routes");

var app            = express();

//var morgan = require('morgan')('combined', { "stream": logger.stream });
//app.use(morgan);

// config files
var db = require('./config/db');
var security = require('./config/security');
var errorhandler = require('errorhandler');

app.use(stormpath.init(app, {
    apiKeyFile: './config/stormpath_apikey.properties',
    application: 'https://api.stormpath.com/v1/applications/6TuQV4SKxQNGE2YegGEeoj',
    secretKey: security.stormpath_secret_key
}));

// set our port
//var port = process.env.PORT || 8080; 
var port = 8000; 

// connect to our mongoDB database 
mongoose.connect(db.url); 
mongoose.set('debug', true);

//app.use(function logBody(req, res, next) {
//    console.dir(req);
//    next()
//});
 
// get all data/stuff of the body (POST) parameters
// parse application/json 
app.use(bodyParser.json({strict:false}));

// parse application/vnd.api+json as json
//app.use(bodyParser.json({ type: 'application/vnd.api+json' })); 

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true })); 

// override with the X-HTTP-Method-Override header in the request. simulate
// DELETE/PUT
app.use(methodOverride('X-HTTP-Method-Override')); 

//app.use(function logBody(req, res, next) {
    //console.dir(req);
    //next()
//});

// set the static files location /public/img will be /img for users
app.use(express.static(__dirname + '/public')); 

routes.addAPIRouter(app, mongoose, stormpath);

// !!! Only use in development/debug mode
//app.use(errorhandler)

app.use(function(req, res, next){
  res.status(404);
  res.json({ error: 'Invalid URL' });
});

// start app ===============================================
// startup our app at http://localhost:8080
app.listen(port);               

// shoutout to the user                     
console.log('Magic happens on port ' + port);

// expose app           
exports = module.exports = app;                    
