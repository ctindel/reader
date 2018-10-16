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
