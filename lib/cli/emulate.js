/*!
 * Module dependencies.
 */

var tester = require('../main');

/**
 * $ tester emulate
 *
 * Emulate a specific platform. Eventually, it should support emulating multiple
 * platforms.
 *
 * Options:
 *
 *   - `argv` {Object} is an optimist object.
 *   - `callback` {Function} is a completion callback.
 *     - `e` {Error} is null unless there was an error.
 *     - `data` {Object} describes the built app.
 */

module.exports = function(argv, callback) {
    // display help on $ tester emulate
    /*if (argv._.length <= 1) {
        argv._.unshift('help');
        this.argv(argv, callback);
        return;
    }*/

    // emulate data
    var data = {
        platforms: [argv._[1]]
    };

    // emulate
    tester.emulate(data, function(e, data) {
        callback(e, data);
    });
};
