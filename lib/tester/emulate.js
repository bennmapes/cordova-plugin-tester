/*!
 * Module dependencies.
 */

var Command = require('./util/command'),
    shell = require('shelljs'),
    path = require('path'),
    platforms = require('./platforms'),
    fs = require('fs'),
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
    if (!options.path) {
        this.tester.emit('warn', 'No path provided, emulating master projects.');
        options.path = path.join(__dirname, '..', '..', 'temp');
    }

    // optional callback
    callback = callback || function() {};

    // build app
    this.execute(options, callback);

    return this.tester;
};

EmulateCommand.prototype.shell_out_to_run = function(project_path, callback) {
    this.tester.emit('log', 'Running project at ' + project_path);
    var cmd = path.join(project_path, 'cordova', 'run');
    shell.exec(cmd, {silent:true, async:true}, function(code, output) {
        if(code > 0) {
            this.tester.emit('error', output);
        }
        callback(null);
    });

}

EmulateCommand.prototype.emulate_master_projects = function(paths, callback) {
    for(platform in platforms) {
        if(fs.existsSync(path.join(paths.projects_dir, platform, 'master'))) {
            this.shell_out_to_run(path.join(paths.projects_dir, platform, 'master'), callback);
        }
        else {
            this.tester.emit('error', 'No master project found for ' + platform);
        }
    }
}

/*!
 * Execute.
 */

EmulateCommand.prototype.execute = function(options, callback) {
    // build project structure and add mobile spec
    var paths = {
        project       : options.path,
        platforms_dir : path.join(options.path, 'platforms'),
        plugins_dir   : path.join(options.path, 'plugins'),
        projects_dir  : path.join(options.path, 'projects'),
        mobile_spec_dir : path.join(options.path, 'cordova-mobile-spec'),
        cordova_js_dir  : path.join(options.path, 'cordova-js')
    }

    this.emulate_master_projects(paths, callback);
};
