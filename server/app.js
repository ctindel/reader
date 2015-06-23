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

// Connect to database
mongoose.connect(config.mongo.uri, config.mongo.options);
mongoose.set('debug', true);

// Setup server
var app = express();

//var morgan = require('morgan')('combined', { "stream": logger.stream });
var morgan = require('morgan');
app.use(morgan('combined'));
app.set('readerLogger', logger);

var server = require('http').createServer(app);
var socketio = require('socket.io')(server, {
  serveClient: (config.env === 'production') ? false : true,
  path: '/socket.io-client'
});
require('./config/socketio')(socketio);
require('./config/express')(app);
require('./routes')(config, app, mongoose);

// Start server
server.listen(config.port, config.ip, function () {
  console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
});

// Expose app
exports = module.exports = app;
