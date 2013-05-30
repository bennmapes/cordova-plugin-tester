/*!
 * Module dependencies.
 */

var tester = require('../main');

/**
 * $ tester create <path>
 *
 * Create test projects for all included plugins.
 *
 * Options:
 *
 *   - `argv` {Object} is an optimist object.
 *   - `callback` {Function} is a completion callback.
 *     - `e` {Error} is null unless there was an error.
 */

module.exports = function(argv, callback) {
    // display help on $ tester create
    /*if (argv._.length <= 1) {
        argv._.unshift('help');
        this.argv(argv, callback);
        return;
    }*/

    // project info
    var data = {};
    if (argv._.length == 1) {
        data.path = argv._[1];
    }

    // create the project
    tester.create(data, function(e) {
        callback(e);
    });
};
