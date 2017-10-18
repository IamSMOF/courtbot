const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;
const Transport = require('winston-transport');
const Rollbar = require('rollbar');

const rollbar = new Rollbar({
    accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
    captureUncaught: false,
    captureUnhandledRejections: false
});

/* Logging with level of error will send notification to Rollbar */
class rollbarTransport extends Transport {
    constructor(opts) {
      super(opts)
    }
    log(error, callback) {
        setImmediate(() => this.emit('logged', "rollbar"));
        rollbar.error(error, function(err2) {
            if (err2) console.log("error reporting to rollbar: ", err2)
            callback()
        })
    }
}

const logger = createLogger({
    format: combine(
        colorize(),
        timestamp(),
        printf(info =>  `${info.level}: ${info.timestamp} ${info.message}`)
    ),
    transports: [
        new transports.Console({level: 'debug'}),
        new rollbarTransport({level: 'error'})
    ]
})

module.exports = logger
