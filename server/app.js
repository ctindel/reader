/**
 * Main application file
 */

'use strict';

const assert = require('assert');
assert(
    process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'prod',
    'You must set the NODE_ENV variable to dev or prod'
);

var express = require('express');
var mongoose = require('mongoose');

var elasticsearch = require('elasticsearch');
var fs = require('fs');

// Connect to Elastic Search
// var elasticClient = new elasticsearch.Client({
//     host: config.es.host,
//     log: config.es.logLevel,
//     sniffOnStart: true,
//     sniffInterval: config.es.sniffInterval
// });

// Setup server
var app = express();

require('./config/express')(app);

// Connect to database
mongoose.connect(
    app.get('config').mongo.uri + '/' + app.get('config').mongo.db,
    app.get('config').mongo.options
);

if (process.env.NODE_ENV === 'dev') {
    mongoose.set('debug', true);
}

app.set('mongoose', mongoose);
// app.set('elasticClient', elasticClient);


var server = require('http').createServer(app);
require('./routes')(app.get('config'), app, mongoose);

//app.use(function(req, res, next){
//  res.status(404);
//  res.json({ error: 'Invalid URL' });
//});

// Start server
server.listen(app.get('config').port, app.get('config').ip, function () {
  console.log('Express server listening on %d, in %s mode', app.get('config').port, app.get('env'));
});

// Expose app
exports = module.exports = app;
