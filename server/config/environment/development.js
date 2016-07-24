'use strict';

// Development specific configuration
// ==================================
module.exports = {
  // MongoDB connection options
    mongo: {
        uri: 'mongodb://localhost/reader-dev'
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

    sp: {
        STORMPATH_API_KEY_ID: '2XWKBCBT8JXO4PE4OFM6RLZIQ',
        STORMPATH_API_KEY_SECRET: 'TimVflOwd7zkVH6wOLdRg0p7cVU+MhQRgSu3mI3nJkc',
        STORMPATH_APP_HREF: 'https://api.stormpath.com/v1/applications/6TuQV4SKxQNGE2YegGEeoj'
    },

    test: {
        apiServer: 'localhost',
        apiServerPort: '9000',
        apiServerURI: 'http://localhost:9000/api/v1.0'
    },

    seedDB: true
};
