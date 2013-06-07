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
 * Create a New Test App.
 *
 * Creates test projects on the local filesystem.
 * These projects are Apache Cordova projects.
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
 * Clone platfroms into <project>/platforms if they don't already exist.
 *
 * Options:
 *
 *   - `paths` {Object}
 *   - `paths.platforms_dir` {String} is the <project>/platforms path.
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
            } else {
                callback(null);
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

CreateCommand.prototype.clone_cordova_js = function(paths, callback) {
    if(!fs.existsSync(paths.cordova_js_dir)) {
        var cjs_url  = 'https://git-wip-us.apache.org/repos/asf/cordova-js.git';
        this.tester.emit('log', 'Cloning Cordova Js...');
        process.chdir(paths.project);
        var cmd = 'git clone ' + cjs_url;
        var result = shell.exec(cmd, {silent:true, async:false});
        if(result.code > 0) {
            this.tester.emit('error', 'Failed to clone cordova-mobile-spec.');
            callback(result.output);
        }
        process.chdir(paths.cordova_js_dir);
        cmd = 'git fetch && git checkout 3.0.0';
        result = shell.exec(cmd, {silent:true, async:false});
        if(result.code > 0) {
            this.tester.emit('error', 'Failed to checkout 3.0.0 branch of cordova-js.');
            callback(result.output);
        }
    }
}

CreateCommand.prototype.create_project = function(paths, platform, plugin, callback) {
    if(!fs.existsSync(path.join(paths.projects_dir, platform))) {
        shell.mkdir(path.join(paths.projects_dir, platform));
    }
    //create plugin project if it doesn't exist
    var plugin_proj_path = path.join(paths.projects_dir, platform, plugin);
    var plugin_name = plugin.replace(/\-/g, '_');
    if(fs.existsSync(plugin_proj_path)) {
        this.tester.emit('warn', 'Skipping plugin project ' + plugin_name + ' for platform ' + platform + '.');
    } else {
        this.tester.emit('log', 'Creating plugin project ' + plugin_name + ' for platform ' + platform + '.');
        var create_script = path.join(paths.platforms_dir, 'cordova-' + platform, 'bin', 'create');
        var package_name = ( plugins[plugin] ? plugins[plugin].name : 'cordova.plugin.test' );
        var cmd = create_script + ' ' + plugin_proj_path + ' ' + package_name + ' ' + plugin_name;
        var result = shell.exec(cmd, {silent:true, async:false});
        if(result.code > 0) {
            this.tester.emit('error', 'Failed to create plugin project ' + plugin_name + ' for platform ' + platform + '.');
            callback('error', result.output);
        } else {
            this.tester.emit('log', 'Plugin Project ' + plugin_name + ' created for ' + platform);
        }
    }
}

CreateCommand.prototype.create_test_projects = function(paths, callback) {
    if(!fs.existsSync(paths.projects_dir)) {
        shell.mkdir(paths.projects_dir);
    }
    // go through the plugins and create a project for each plugin on each platform
    for(plugin in plugins) {
        for(platform in platforms) {
            this.create_project(paths, platform, plugin, callback);
        }
    }
}

CreateCommand.prototype.install_plugin = function(paths, project_path, platform, plugin, callback) {
    this.tester.emit('log', 'Installing ' + plugin + ' plugin for ' + platform);
    var cmd = 'plugman --platform ' + platform + ' --project ' + project_path + ' --plugin ' + path.join(paths.plugins_dir, plugin);
    result = shell.exec(cmd, {silent:true, async:false});
    if(result.code > 0) {
        this.result_obj[platform][plugin] = "Failed : " + result.output;
        this.tester.emit('error', 'Failed to install ' + plugin + ' plugin for ' + platform + '.');
        callback(result.output);
    } else {
        this.tester.emit('log', result.output);
        this.result_obj[platform][plugin] = "Success";
    }
}

CreateCommand.prototype.install_plugins = function(paths, callback) {
    //TODO : check plugman version??
    var result = shell.exec('plugman', {silent:true, async:true}).code;
    if(result > 0) {
       this.tester.emit('error', 'Missing Plugman? "npm install -g plugman"');
    }

    for(plugin in plugins) {
        for(platform in platforms) {
            this.install_plugin(paths, path.join(paths.projects_dir, platform, plugin), platform, plugin, callback);
        }
    }
}

CreateCommand.prototype.add_plugin_tests = function(paths, callback) {
    for(plugin in plugins) {
        for(platform in platforms) {
            this.tester.emit('log', 'Adding plugin tests to ' + plugin + ' for ' + platform);
            // remove default www files except for cordova.js
            var project_www = platforms[platform].www(path.join(paths.projects_dir, platform, plugin));
            var www_files = fs.readdirSync(project_www);
            for(element in www_files) {
                if(www_files[element] != 'cordova.js') {
                    shell.rm('-rf', path.join(project_www, www_files[element]));
                }
            }
            // add plugin test files to www
            var plugin_test_dir = fs.readdirSync(path.join(paths.plugins_dir, plugin, 'test'));
            for(element in plugin_test_dir) {
                shell.cp('-r', path.join(paths.plugins_dir, plugin, 'test', plugin_test_dir[element]), project_www);
            }
        }
    }
}

CreateCommand.prototype.create_master_mobile_specs = function(paths, callback) {
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
    for(platform in platforms) {
        var master_dir = path.join(paths.projects_dir, platform, 'master');
        if(fs.existsSync(master_dir)) {
            shell.rm('-rf', master_dir);
        }
        this.tester.emit('log', 'Creating master project for ' + platform);
        this.create_project(paths, platform, 'master', callback);

        this.tester.emit('log', 'Installing plugins to master project for ' + platform);
        for(plugin in plugins) {
            this.install_plugin(paths, master_dir, platform, plugin, callback);
        }

        this.tester.emit('log', 'Adding mobile spec to master test for ' + platform);
        var project_www = platforms[platform].www(path.join(paths.projects_dir, platform, 'master'));
        // remove default www files except for cordova.js
        var www_files = fs.readdirSync(project_www);
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
            mobile_spec_dir : path.join(options.path, 'cordova-mobile-spec'),
            cordova_js_dir  : path.join(options.path, 'cordova-js')
        }
        this.clone_platforms(paths, callback);
        this.clone_plugins(paths, callback)
        this.create_test_projects(paths, callback);
        this.install_plugins(paths, callback);
        this.add_plugin_tests(paths, callback);
        this.create_master_mobile_specs(paths, callback);

        fs.writeFileSync(path.join(options.path, 'results.json'), JSON.stringify(this.result_obj));

        this.tester.emit('log', 'plugin tester project created at', options.path);
        callback(null);
    }
    catch(e) {
        this.tester.emit('error', e);
        callback(e);
    }
};
