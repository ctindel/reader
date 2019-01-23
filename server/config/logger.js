var appRoot = require('app-root-path');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, prettyPrint } = format;
var path = require('path');

var options = {
  file: {
    level: 'debug',
    //filename: `${appRoot}/logs/app.log`,
    filename: '/Users/ctindel/reader.log',
    handleExceptions: false,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 1,
    colorize: false,
    format: combine(timestamp(), format.json())
  },
  console: {
    level: 'debug',
    handleExceptions: false,
    json: false,
    colorize: true,
    format: combine(timestamp(), format.simple()),
  },
};

var logger = createLogger({
    format: combine(timestamp(), format.json()),
    transports: [
        new transports.File(options.file),
        new transports.Console(options.console)
    ],
    exitOnError: false, // do not exit on handled exceptions
});

module.exports = logger;
