/**
 * Main application file
 */

'use strict';

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var express = require('express');
var mongoose = require('mongoose');
var config = require('./config/environment');
var logger = require("./logger");
var bodyParser = require('body-parser')

// Connect to database
mongoose.connect(config.mongo.uri, config.mongo.options);
mongoose.set('debug', true);

// Setup server
var app = express();

//var morgan = require('morgan')('combined', { "stream": logger.stream });
var morgan = require('morgan');
app.use(morgan('combined'));
// parse application/json
app.use(bodyParser.json())

var allowCrossDomain = function(req, res, next) {
    //console.dir(req);
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Headers', 'Authorization');

    next();
}
app.use(allowCrossDomain);
app.set('readerLogger', logger);

var server = require('http').createServer(app);
var socketio = require('socket.io')(server, {
  serveClient: (config.env === 'production') ? false : true,
  path: '/socket.io-client'
});
require('./config/socketio')(socketio);
require('./config/express')(app);
require('./routes')(config, app, mongoose);

//app.use(function(req, res, next){
//  res.status(404);
//  res.json({ error: 'Invalid URL' });
//});

// Start server
server.listen(config.port, config.ip, function () {
  console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
});

// Expose app
exports = module.exports = app;
