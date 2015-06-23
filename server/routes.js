/**
 * Main application routes
 */

'use strict';

var errors = require('./components/errors');

module.exports = function(config, app, mongoose) {

    //var apiRoutes = require('./api')(mongoose);
    var apiRoutes = require('./api');

    apiRoutes.addAPIRouter(config, app, mongoose);

    // Insert routes below
    //app.use('/api/things', spMiddleware.authenticate, require('./api/thing'));
      
    // All undefined asset or api routes should return a 404
    app.route('/:url(api|auth|components|app|bower_components|assets)/*')
    .get(errors[404]);

    // All other routes should redirect to the index.html
    app.route('/*') .get(function(req, res) {
        res.sendfile(app.get('appPath') + '/index.html');
    });
};
