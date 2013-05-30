/*!
 * Module dependencies.
 */

var Command = require('./util/command'),
    shell = require('shelljs'),
    fs = require('fs'),
    path = require('path'),
    platforms = require('./platforms'),
    plugins   = require('./plugins'),
    util = require('util');

/*!
 * Command setup.
 */

module.exports = {
    create: function(tester) {
        return new CreateCommand(tester);
    }
};

function CreateCommand(tester) {
    return Command.apply(this, arguments);
}

util.inherits(CreateCommand, Command);

/**
 * Create a New App.
 *
 * Creates an project on the local filesystem.
 * This project is backwards compatible with Apache Cordova projects.
 *
 * Options:
 *
 *   - `options` {Object} is data required to create an app
 *     - `path` {String} is a directory path for the app.
 *   - [`callback`] {Function} is triggered after creating the app.
 *     - `e` {Error} is null unless there is an error.
 *
 * Returns:
 *
 *   {PluginTester} for chaining.
 */

CreateCommand.prototype.run = function(options, callback) {
    // require options
    if (!options) throw new Error('requires option parameter');
    if (!options.path) {
        this.tester.emit('warn', 'No path provided, creating testing project in temp directory.');
        options.path = path.join(__dirname, '..', '..', 'temp');
    }

    // optional callback
    callback = callback || function() {};

    // expand path
    options.path = path.resolve(options.path);

    // create app
    this.execute(options, callback);

    return this.tester;
};

/**
 * Replace Cordova Project with PluginTester Project.
 *
 * This function can be removed once cordova-cli supports external projects.
 *
 * Options:
 *
 *   - `options` {Object}
 *   - `options.path` {String} is the project path.
 */

CreateCommand.prototype.clone_platforms = function(paths, callback) {
    if(!fs.existsSync(paths.platforms_dir)) {
        shell.mkdir(paths.platforms_dir);
    }
    process.chdir(path.join(paths.platforms_dir));
    for(platform in platforms) {
        this.result_obj[platform] = {};
        if(fs.existsSync(path.join(paths.platforms_dir, 'cordova-' + platform))) {
            this.tester.emit('warn', 'Skipping Cordova ' + platform + ' download');
        } else {
            this.tester.emit('log', 'Cloning ' + platform + '...');
            var cmd = 'git clone ' + platforms[platform].url;
            var result = shell.exec(cmd, {silent:true, async:false});
            if(result.code > 0) {
                this.tester.emit('error', 'Failed to clone ' + platform + '.');
                callback( 'Failed to clone ' + platform + '. ' + result.output);
                process.exit();
            }
            process.chdir(path.join(paths.platforms_dir, 'cordova-' + platform));
            cmd = 'git fetch && git checkout 3.0.0';
            result = shell.exec(cmd, {silent:true, async:false});
            if(result.code > 0) {
                this.tester.emit('error', 'Failed to checkout 3.0.0 branch of ' + platform + '.');
                callback(result.output);
            }
        }
    }
}

CreateCommand.prototype.clone_plugins = function(paths, callback) {
    if(!fs.existsSync(paths.plugins_dir)) {
        shell.mkdir(paths.plugins_dir);
    }
    process.chdir(path.join(paths.plugins_dir));
    for(plugin in plugins) {
        if(fs.existsSync(path.join(paths.plugins_dir, plugin))) {
            this.tester.emit('warn', 'Skipping Plugin ' + plugin + ' download');
        } else {
            this.tester.emit('log', 'Cloning plugin ' + plugins[plugin].name + '.');
            var cmd = 'git clone ' + plugins[plugin].url;
            var result = shell.exec(cmd, {silent:true, async:false});
            if(result.code > 0) {
                this.tester.emit('error', 'Failed to clone ' + plugin + '.');
                callback(result.output);
            }
        }
    }
}

CreateCommand.prototype.clone_mobile_spec = function(paths, callback) {
    if(!fs.existsSync(paths.mobile_spec_dir)) {
        var ms_url  = 'https://git-wip-us.apache.org/repos/asf/cordova-mobile-spec.git';
        this.tester.emit('log', 'Cloning Mobile Spec...');
        process.chdir(paths.project);
        var cmd = 'git clone ' + ms_url;
        var result = shell.exec(cmd, {silent:true, async:false});
        if(result.code > 0) {
            this.tester.emit('error', 'Failed to clone cordova-mobile-spec.');
            callback(result.output);
        }
    }
}

CreateCommand.prototype.create_test_projects = function(paths, callback) {
    if(!fs.existsSync(paths.projects_dir)) {
        shell.mkdir(paths.projects_dir);
    }
    // go through the plugins and create a project for each plugin on each platform
    for(plugin in plugins) {
        var plugin_name = plugin.replace(/\-/g, '_');
        for(platform in platforms) {
            if(!fs.existsSync(path.join(paths.projects_dir, platform))) {
                shell.mkdir(path.join(paths.projects_dir, platform));
            }
            //create plugin project if it doesn't exist
            var plugin_proj_path = path.join(paths.projects_dir, platform, plugin);
            if(fs.existsSync(plugin_proj_path)) {
                this.tester.emit('warn', 'Skipping plugin project ' + plugin_name + ' for platform ' + platform + '.');
            } else {
                this.tester.emit('log', 'Creating plugin project ' + plugin_name + ' for platform ' + platform + '.');
                var create_script = path.join(paths.platforms_dir, 'cordova-' + platform, 'bin', 'create');
                var cmd = create_script + ' ' + plugin_proj_path + ' ' + plugins[plugin].name + ' ' + plugin_name;
                var result = shell.exec(cmd, {silent:true, async:false});
                if(result.code > 0) {
                    this.tester.emit('error', 'Failed to create plugin project ' + plugin_name + ' for platform ' + platform + '.');
                    callback('error', result.output);
                } else {
                    this.tester.emit('log', 'Plugin Project ' + plugin_name + ' created for ' + platform);
                }
            }
        }
    }
}

CreateCommand.prototype.install_plugins = function(paths, callback) {
    //TODO : check plugman version??
    var result = shell.exec('plugman', {silent:true, async:true}).code;
    if(result > 0) {
       this.tester.emit('error', 'Missing Plugman? "npm install -g plugman"');
    }

    for(plugin in plugins) {
        var plugin_name = plugin.replace(/\-/g, '_');
        for(platform in platforms) {
            this.tester.emit('log', 'Installing ' + plugin + ' plugin for ' + platform);
            var cmd = 'plugman --platform ' + platform + ' --project ' + path.join(paths.projects_dir, platform, plugin) + ' --plugin ' + path.join(paths.plugins_dir, plugin);
            result = shell.exec(cmd, {silent:true, async:false});
            if(result.code > 0) {
                this.result_obj[platform][plugin] = "Failed : " + result.output;
                this.tester.emit('error', 'Failed to install ' + plugin + ' plugin for ' + platform + '.');
                callback(result.output);
            } else {
                this.tester.emit('log', 'Plugman successfully installed ' + plugin + ' for ' + platform);
                this.result_obj[platform][plugin] = "Success";
            }
        }
    }
}

CreateCommand.prototype.add_mobile_spec = function(paths, callback) {
    if(!fs.existsSync(paths.mobile_spec_dir)) {
        this.tester.emit('log', 'Cloning Mobile Spec...');
        var ms_url  = 'https://git-wip-us.apache.org/repos/asf/cordova-mobile-spec.git';
        process.chdir(paths.project);
        var cmd = 'git clone ' + ms_url;
        var result = shell.exec(cmd, {silent:true, async:false});
        if(result.code > 0) {
            this.tester.emit('error', 'Failed to clone cordova-mobile-spec.');
            callback(result.output);
        }
    }
    for(plugin in plugins) {
        for(platform in platforms) {
            if(this.result_obj[platform][plugin]) {
                var project_www = platforms[platform].www(path.join(paths.projects_dir, platform, plugin));
                this.tester.emit('log', 'Adding mobile spec to ' + plugin + ' for ' + platform)
                // remove default www files except for cordova.js
                var www_files = fs.readdirSync(project_www) ;
                for(element in www_files) {
                    if(www_files[element] != 'cordova.js') {
                        shell.rm('-rf', path.join(project_www, www_files[element]));
                    }
                }

                // add mobile spec files to www
                var mobile_spec_files = fs.readdirSync(paths.mobile_spec_dir);
                for(element in mobile_spec_files) {
                    if(mobile_spec_files[element] != 'cordova.js') {
                        shell.cp('-r', path.join(paths.mobile_spec_dir, mobile_spec_files[element]), project_www);
                    }
                }
            }
        }
    }
}

/*!
 * Execute.
 */

CreateCommand.prototype.execute = function(options, callback) {
    // create tester project
    try {
        this.result_obj = {};
        if(!fs.existsSync(options.path)) {
            shell.mkdir(options.path);
        }
        // build project structure and add mobile spec
        var paths = {
            project       : options.path,
            platforms_dir : path.join(options.path, 'platforms'),
            plugins_dir   : path.join(options.path, 'plugins'),
            projects_dir  : path.join(options.path, 'projects'),
            mobile_spec_dir : path.join(options.path, 'cordova-mobile-spec')
        }
        this.clone_platforms(paths, callback);
        this.clone_plugins(paths, callback)
        this.create_test_projects(paths, callback);
        this.install_plugins(paths, callback);
        this.add_mobile_spec(paths, callback);

        fs.writeFileSync(path.join(options.path, 'results.json'), JSON.stringify(this.result_obj));

        this.tester.emit('log', 'plugin tester project created at', options.path);
        callback(null);
    }
    catch(e) {
        this.tester.emit('error', e);
        callback(e);
    }
};
