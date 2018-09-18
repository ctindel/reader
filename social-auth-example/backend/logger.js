// var expressWinston = require('express-winston');
// var winston = require('winston');
// var path = require('path');
// // winston.emitErrs = true;
//
// //var logger = expressWinston.logger({
// var logger = new winston.Logger({
//     transports: [
//         //new winston.transports.File({
//             //level: 'info',
//             //filename: './logs/all-logs.log',
//             //handleExceptions: true,
//             //json: true,
//             //maxsize: 5242880, //5MB
//             //maxFiles: 5,
//             //colorize: false
//         //}),
//         new winston.transports.Console({
//             level: 'debug',
//             handleExceptions: false,
//             json: false,
//             colorize: true
//         })
//     ],
//     exitOnError: false
// });
// //expressWinston.requestWhitelist = null;
// //expressWinston.bodyWhitelist = null;
// //expressWinston.bodyBlacklist = null;
// //expressWinston.responseWhitelist = null;
//
// module.exports = logger;
// module.exports.stream = {
//     write: function(message, encoding){
//         // Stolen from
//         // https://github.com/baryon/tracer/blob/master/lib/console.js
//         data = {};
//         data.method = data.path = data.line = data.pos = data.file = '';
//
//         //if (needstack) {
//         if (true) {
//             // get call stack, and analyze it
//             // get all file,method and line number
//             var stacklist = (new Error()).stack.split('\n').slice(3);
//             // Stack trace format :
//             // http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
//             // DON'T Remove the regex expresses to outside of method, there is a BUG in
//             // node.js!!!
//             var stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/gi;
//             var stackReg2 = /at\s+()(.*):(\d*):(\d*)/gi;
//             //var s = stacklist[config.stackIndex] || stacklist[0],
//             var s = stacklist[0],
//             sp = stackReg.exec(s) || stackReg2.exec(s);
//             if (sp && sp.length === 5) {
//                 data.method = sp[1];
//                 data.path = sp[2];
//                 data.line = sp[3];
//                 data.pos = sp[4];
//                 data.file = path.basename(data.path);
//                 data.stack = stacklist.join('\n');
//             }
//         }
//         logger.info(data.method + ":" + data.line + " " + message);
//     }
// };


var appRoot = require('app-root-path');
var winston = require('winston');

var options = {
  // file: {
  //   level: 'info',
  //   filename: `${appRoot}/logs/app.log`,
  //   handleExceptions: true,
  //   json: true,
  //   maxsize: 5242880, // 5MB
  //   maxFiles: 5,
  //   colorize: false,
  // },
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

var logger = winston.createLogger({
  transports: [
    // new winston.transports.File(options.file),
    new winston.transports.Console(options.console)
  ],
  exitOnError: false, // do not exit on handled exceptions
});

logger.stream = {
  write: function(message, encoding) {
    logger.info(message);
  },
};

module.exports = logger;
