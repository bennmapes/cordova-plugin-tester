/*!
 * Module dependencies.
 */

var tester = require('./main'),
    console = require('./cli/util/console');

/**
 * Command line interface object.
 */

function CLI() {
    // This can be prevented by using dependency injection
    this.cli = this;
}

/**
 * Command line commands.
 */

CLI.prototype.argv = require('./cli/argv');
CLI.prototype.create = require('./cli/create');
CLI.prototype.emulate = require('./cli/emulate');
CLI.prototype.help = require('./cli/help');
CLI.prototype.unknown = require('./cli/unknown');
CLI.prototype.version = require('./cli/version');


/*!
 * CLI messages.
 */

tester.on('log', function() {
    console.log.apply(this, arguments);
});

tester.on('warn', function() {
    console.warn.apply(this, arguments);
});

tester.on('error', function(e) {
    console.error.call(this, e.message);
});

tester.on('raw', function() {
    console.raw.apply(this, arguments);
});

/*!
 * Expose the CLI object.
 */

module.exports = CLI;
