'use strict';

// Development specific configuration
// ==================================
module.exports = {
  // MongoDB connection options
    mongo: {
        uri: 'mongodb://127.0.0.1',
        db: 'reader-dev',
        options: {
            useNewUrlParser: true,
            keepAlive: true,
            keepAliveInitialDelay: 300000,
        }
    },

    // Elastic Search
    //  sniffInterval is set to 5 minutes
    es: {
        host: '192.168.93.197:9200',
        logLevel: 'debug',
        sniffInterval: 300000,
        indexName: 'reader',
        feedEntryTypeName: 'feedEntry'
    },

    jwt : {
        'secret' : 'reader-jwt-secret'
    },

    googleAuth : {
        'clientID'      : '104972086559-jdn01f6df88cne9ip3qduc205u1p1p3r.apps.googleusercontent.com',
        'clientSecret'     : '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',
        'callbackURL'      : 'http://localhost:9000/api/v1.0/auth/google'
    },

    test: {
        apiServer: 'localhost',
        apiServerPort: '9000',
        apiServerURI: 'http://localhost:9000/api/v1.0'
    },

    seedDB: true
};
