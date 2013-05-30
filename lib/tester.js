/*!
 * Module dependencies.
 */

var events = require('events'),
    util = require('util');

/**
 * PluginTester object.
 *
 * Events:
 *
 *   - `error` {Event} triggered with info compatible with console.error.
 *     - `e` {Error} describes the error.
 *   - `log` {Event} triggered with info compatible with console.log.
 *   - `warn` {Event} triggered with info compatible with console.warn.
 *   - `raw` {Event} trigger with info that should not be formatted.
 *   - `login` {Event} triggered when login credentials are needed.
 *     - `callback` {Function} is triggered with user credentials
 *       - `username` {String}
 *       - `password` {String}
 */

function PluginTester() {
    // initialize PluginTester
    initialize.call(this);

    // initialize each command and inject the `tester` dependency.
    this.create = require('./tester/create').create(this);
    this.emulate = require('./tester/emulate').create(this);
}

util.inherits(PluginTester, events.EventEmitter);

/*!
 * PluginTester prototype chain.
 */


/*!
 * Initialize PluginTester.
 */

function initialize() {
    var self = this;

    // error events must always have a listener.
    self.on('error', function(e) {});

    // reset the listeners on the a new PluginTester instance

    // map events to PluginTester
}

/*!
 * Expose the PluginTester object.
 */

module.exports = PluginTester;
