/*!
 * Module dependencies.
 */

var Command = require('./util/command'),
    util = require('util');

/*!
 * Command setup.
 */

module.exports = {
    create: function(tester) {
        return new EmulateCommand(tester);
    }
};

function EmulateCommand(tester) {
    return Command.apply(this, arguments);
}

util.inherits(EmulateCommand, Command);

/**
 * Emulate Test Projects
 *
 * Automatically detects if local SDK exists.
 *  - true: build application on the local system.
 *  - false: build the application remotely.
 *
 * Options:
 *
 *   - `options` {Object}
 *     - `platforms` {Array} is a list of platforms (limited to 1).
 *   - [`callback`] {Function} is triggered after completion.
 *     - `e` {Error} is null unless there is an error.
 *
 * Returns:
 *
 *   {PluginTester} for chaining.
 */

EmulateCommand.prototype.run = function(options, callback) {
    // require options
    if (!options) throw new Error('requires option parameter');
    if (!options.platforms) throw new Error('requires option.platforms parameter');
    if (!options.plugin) throw new Error('requires option.plugin parameter');

    // optional callback
    callback = callback || function() {};

    // build app
    this.execute(options, callback);

    return this.tester;
};

/*!
 * Execute.
 */

EmulateCommand.prototype.execute = function(options, callback) {

};
