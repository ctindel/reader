/**
 * Express configuration
 */

"use strict";

var express = require("express");
var favicon = require("serve-favicon");
var compression = require("compression");
var bodyParser = require("body-parser");
var methodOverride = require("method-override");
var cookieParser = require("cookie-parser");
var errorHandler = require("errorhandler");
var path = require("path");
var envConfig = require("./environment");
var expressWinston = require("express-winston");
var logger = require("./logger");
const aws = require("aws-sdk");
const ssm = new aws.SSM({ region: process.env.AWS_DEFAULT_REGION });

const getAllSecrets = async () => {
    let nextToken;
    let parameters = [];
    const paramNamePrefix = "/reader/" + envConfig.env;

    do {
        const result = await ssm
            .getParametersByPath({
                Path: paramNamePrefix,
                WithDecryption: true,
                NextToken: nextToken,
            })
            .promise();

        parameters = parameters.concat(result.Parameters);
        nextToken = result.NextToken;
    } while (nextToken);

    return parameters;
};

const parseSecrets = (secrets) => {
    secrets.forEach((secret) => {
        const key = secret.Name.split("/").pop();
        if (key === "googleAuthClientSecret") {
            envConfig.googleAuth.clientSecret = secret.Value;
        } else if (key === "jwtSecret") {
            envConfig.jwt.secret = secret.Value;
        } else {
            throw Error("Unknown secret: " + key);
        }
    });
};

var loadExpressConfig = async function (app) {
    var env = app.get("env");

    var secrets = await getAllSecrets();
    parseSecrets(secrets);

    console.log(envConfig);
    app.set("config", envConfig);
    app.set("readerLogger", logger);

    app.use(
        expressWinston.logger({
            winstonInstance: logger,
            meta: true, // optional: control whether you want to log the meta data about the request (default to true)
            msg: "HTTP {{req.method}} {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
            expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
            //colorize: true, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
            ignoreRoute: function (req, res) {
                return false;
            }, // optional: allows to skip some log messages based on request and/or response
        })
    );

    //app.set('views', config.root + '/server/views');
    //app.engine('html', require('ejs').renderFile);
    //app.set('view engine', 'html');
    app.use(compression());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(methodOverride());
    app.use(cookieParser());

    var cors = require("cors");
    // We return the user's token in the header after the auth controller, so we need to expose it
    const corsOptions = {
        exposedHeaders: ["x-auth-token"],
    };

    app.use(cors());
    /*   var allowCrossDomain = function(req, res, next) {
      //console.dir(req);
      res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.header('Access-Control-Allow-Headers', 'Authorization');

      next();
  }
  app.use(allowCrossDomain); */

    if ("prod" === env) {
        app.use(favicon(path.join(envConfig.root, "public", "favicon.ico")));
        app.use(express.static(path.join(envConfig.root, "public")));
        app.set("appPath", envConfig.root + "/public");
    }

    if ("dev" === env || "test" === env) {
        app.use(express.static(path.join(envConfig.root, ".tmp")));
        app.use(express.static(path.join(envConfig.root, "client")));
        app.set("appPath", "client");
        app.use(errorHandler()); // Error handler - has to be last
    }
};

module.exports = {
    loadExpressConfig: loadExpressConfig,
};
