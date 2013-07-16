/*!
 * Module dependencies.
 */

var Command = require('./util/command'),
    shell = require('shelljs'),
    fs = require('fs'),
    path = require('path'),
    platforms = require('./platforms'),
    plugins   = require('./plugins'),
    et = require('elementtree'),
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
        //this.result_obj[platform] = {};
        if(fs.existsSync(path.join(paths.platforms_dir, platforms[platform].repo.name))) {
            this.tester.emit('warn', 'Skipping Cordova ' + platform + ' download');
        } else {
            this.tester.emit('log', 'Cloning ' + platform + '...');
            var cmd = 'git clone ' + platforms[platform].repo.url;
            var result = shell.exec(cmd, {silent:true, async:false});
            if(result.code > 0) {
                callback('error', 'Failed to clone ' + platform + '. ' + result.output);
                process.exit();
            }
            if(platforms[platform].repo.branch) {
                process.chdir(path.join(paths.platforms_dir, platforms[platform].repo.name));
                cmd = 'git fetch && git checkout ' + platforms[platform].repo.branch;
                result = shell.exec(cmd, {silent:true, async:false});
                if(result.code > 0) {
                    callback('error', 'Failed to checkout ' + platforms[platform].repo.branch + ' branch of ' + platform + '.' + result.output);
                } else {
                    callback(null);
                }
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
        //this.result_obj[plugin] = {};
        if(fs.existsSync(path.join(paths.plugins_dir, plugin))) {
            this.tester.emit('warn', 'Skipping Plugin ' + plugin + ' download');
        } else {
            this.tester.emit('log', 'Cloning plugin ' + plugins[plugin].url + '.');
            var cmd = 'git clone ' + plugins[plugin].url;
            var result = shell.exec(cmd, {silent:true, async:false});
            if(result.code > 0) {
                callback('error', 'Failed to clone ' + plugin + '.' + result.output);
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
            callback('error', 'Failed to clone cordova-mobile-spec.' + result.output);
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
            callback('error', 'Failed to clone cordova-mobile-spec.' + result.output);
        }
        process.chdir(paths.cordova_js_dir);
        cmd = 'git fetch && git checkout 3.0.0';
        result = shell.exec(cmd, {silent:true, async:false});
        if(result.code > 0) {
            callback('error', 'Failed to checkout 3.0.0 branch of cordova-js.' + result.output);
        }
    }
}

CreateCommand.prototype.create_project = function(paths, platform, plugin, callback) {
    if(!fs.existsSync(path.join(paths.projects_dir, platform))) {
        shell.mkdir(path.join(paths.projects_dir, platform));
    }
    //create plugin project if it doesn't exist
    var plugin_proj_path = path.join(paths.projects_dir, platform, plugin);
    // name of the plugin to be used as project name
    var plugin_name = plugin.replace(/\-/g, '_');
    var output = ['Creating Plugin Project : ',
                    '\t\tProject : ' + plugin_name,
                    '\t\tPlatform : ' + platform,
                    '\t\tPlugin : ' + plugin];
    this.tester.emit('log', output.join('\n'));
    // path to repository
    var repository_path = path.join(paths.platforms_dir, platforms[platform].repo.name);
    // path to bin/create
    var create_script = path.join(platforms[platform].repo.bin(repository_path), 'create');
    // package name for project
    var package_name;
    if(plugins[plugin]) {
        var filename = path.join(paths.plugins_dir, plugin, 'plugin.xml');
        var contents = fs.readFileSync(filename, 'utf-8').replace("\ufeff", "");
        var pluginXML = new et.ElementTree(et.XML(contents));
        package_name = pluginXML.getroot().attrib.id;
    } else {
        package_name = 'master.test.project';
    }
    // create command
    var cmd = create_script + ' ' + plugin_proj_path + ' ' + package_name + ' ' + plugin_name;
    var result = shell.exec(cmd, {silent:true, async:false});
    if(result.code > 0) {
        console.log('error', 'Failed to create plugin project ' + plugin_name + ' for platform ' + platform + '.');
        this.tester.emit('error', 'Failed to create plugin project ' + plugin_name + ' for platform ' + platform + '.');
        callback('error', 'Failed to create plugin project ' + plugin_name + ' for platform ' + platform + '.');
    } else {
        this.tester.emit('log', 'Plugin Project ' + plugin_name + ' created for ' + platform);
    }
}

CreateCommand.prototype.create_cli_project = function(paths, plugin, callback) {
    //create plugin project if it doesn't exist
    var plugin_proj_path = path.join(paths.projects_dir, plugin);

    if(!fs.existsSync(plugin_proj_path)) {
        shell.mkdir(plugin_proj_path);
    }
    // name of the plugin to be used as project name
    var plugin_name = plugin.replace(/\-/g, '_');
    var output = ['Creating CLI Plugin Project : ',
                    '\t\tProject : ' + plugin_name,
                    '\t\tPlugin : ' + plugin];
    this.tester.emit('log', output.join('\n'));

    // package name for project
    var package_name;
    if(plugins[plugin]) {
        var filename = path.join(paths.plugins_dir, plugin, 'plugin.xml');
        var contents = fs.readFileSync(filename, 'utf-8').replace("\ufeff", "");
        var pluginXML = new et.ElementTree(et.XML(contents));
        package_name = pluginXML.getroot().attrib.id;
    } else {
        package_name = 'master.test.project';
    }
    // corodva create command
    var cmd = 'cordova create ' + plugin_proj_path + ' ' + package_name + ' ' + plugin_name;
    var result = shell.exec(cmd, {silent:true, async:false});
    if(result.code > 0) {
        console.log('error', 'Failed to create plugin cli project ' + plugin_name + '.');
        this.tester.emit('error', 'Failed to create plugin cli project ' + plugin_name + '.');
        callback('error', 'Failed to create plugin cli project ' + plugin_name + '.');
    } else {
        this.tester.emit('log', 'Plugin Project ' + plugin_name + '.');
    }
    // change directory and add all the platforms
    process.chdir(plugin_proj_path);
    for(platform in platforms) {
        cmd = 'cordova platform add ' + platform;
        result = shell.exec(cmd, {silent:true, async:false});
        if(result.code > 0) {
            callback('error', 'Failed to add ' + platform + ' to the plugin cli project ' + plugin + '.' + result.output);
        } else {
            callback(null);
        }
    }
}

CreateCommand.prototype.create_test_projects = function(paths, callback) {
    if(!fs.existsSync(paths.projects_dir)) {
        shell.mkdir(paths.projects_dir);
    }
    if(paths.cli) {
        //create a project directory with one Cordova Project for each plugin
        this.tester.emit('warn', 'Creating CLI test proejcts.');
        for(plugin in plugins) {
            //this.result_obj[plugin][plugin] = {};
            if(fs.existsSync(path.join(paths.projects_dir, plugin))) {
                this.tester.emit('warn', 'Skipping cli plugin project ' + plugin + '.');
                //this.result_obj[plugin][plugin].built = false;
            } else {
                //this.result_obj[plugin][plugin].built = true;
                this.create_cli_project(paths, plugin, callback);
            }
        }
    } else {
        // go through the plugins and create a project for each plugin grouped by platform
        for(plugin in plugins) {
            for(platform in platforms) {
                //this.result_obj[platform][plugin] = {};
                if(fs.existsSync(path.join(paths.projects_dir, platform, plugin))) {
                    this.tester.emit('warn', 'Skipping plugin project ' + plugin + ' for platform ' + platform + '.');
                    //this.result_obj[platform][plugin].built = false;
                } else {
                    //this.result_obj[platform][plugin].built = true;
                    this.create_project(paths, platform, plugin, callback);
                }
            }
        }
    }
}

CreateCommand.prototype.install_plugin_plugman = function(paths, project_path, platform, plugin, callback) {
    var output = ['Installing Plugin : ',
                    '\t\tProject : ' + project_path.replace(/^.*[\\\/]/, ''),
                    '\t\tPlatform : ' + platform,
                    '\t\tPlugin : ' + plugin];
    this.tester.emit('log', output.join('\n'));
    var cmd = 'plugman --platform ' + platform + ' --project ' + project_path + ' --plugin ' + path.join(paths.plugins_dir, plugin);
    result = shell.exec(cmd, {silent:true, async:false});
    if(result.code > 0) {
        //this.result_obj[platform][plugin].status = "Failed : " + result.output;
        callback('error', 'Failed to install ' + plugin + ' plugin for ' + platform + '.' + result.output);
    } else {
        this.tester.emit('log', result.output);
        //this.result_obj[platform][plugin].status = "Success";
    }
}

CreateCommand.prototype.install_plugin_cli = function(paths, project_path, plugin) {
    process.chdir(project_path);
    var cmd = 'cordova plugin add ' + path.join(paths.plugins_dir, plugin);
    var result = shell.exec(cmd, {silent:true, async:false});
    if(result.code > 0) {
        //this.result_obj[plugin].status = "Failed : " + result.output;
        callback('error', 'Failed to install ' + plugin + ' plugin in ' + plugin  + '.' + result.output);
    } else {
        this.tester.emit('log', plugin + ' installed in test CLI project.' + result.output);
        //this.result_obj[plugin].status = "Success";
    }
}

CreateCommand.prototype.install_plugins = function(paths, callback) {
    if(paths.cli) {
        for(plugin in plugins) {
            var plugin_proj_path = path.join(paths.projects_dir, plugin);
            this.install_plugin_cli(paths, plugin_proj_path);
        }
    } else {
        for(plugin in plugins) {
            for(platform in platforms) {
                //if(this.result_obj[platform][plugin].built) {
                    // install the specified plugin
                    this.install_plugin_plugman(paths, path.join(paths.projects_dir, platform, plugin), platform, plugin, callback);
                //}
            }
        }
    }
}

CreateCommand.prototype.add_plugin_tests = function(paths, callback) {
    if(paths.cli) {
        for(plugin in plugins) {
            var plugin_proj_www = path.join(paths.projects_dir, plugin, 'www');
            // remove default www files except for cordova.js, cordova_plugins.json and the plugins folder
            var www_files = fs.readdirSync(plugin_proj_www);
            for(element in www_files) {
                if(www_files[element] != 'cordova.js' && www_files[element] != 'cordova_plugins.js' && www_files[element] != 'plugins') {
                    shell.rm('-rf', path.join(plugin_proj_www, www_files[element]));
                }
            }
            // add plugin test files to www
            var plugin_test_dir = fs.readdirSync(path.join(paths.plugins_dir, plugin, 'test'));
            for(element in plugin_test_dir) {
                shell.cp('-r', path.join(paths.plugins_dir, plugin, 'test', plugin_test_dir[element]), plugin_proj_www);
            }

            //Prepare cordova project
            var plugin_proj_path = path.join(paths.projects_dir, plugin);
            process.chdir(plugin_proj_path);
            var cmd = 'cordova prepare';
            var result = shell.exec(cmd, {silent:true, async:false});
            if(result.code > 0) {
                callback('error', 'Failed to prepare master cordova test project' + result.output);
            }
        }
    } else {
        for(plugin in plugins) {
            for(platform in platforms) {
                //if(this.result_obj[platform][plugin].built) {
                    if(!fs.existsSync(path.join(paths.plugins_dir, plugin, 'test'))) {
                        this.tester.emit('warn', 'No tests found for ' + plugin + '.');
                    } else {
                        this.tester.emit('log', 'Adding plugin tests to ' + plugin + ' for ' + platform);
                        // remove default www files except for cordova.js, cordova_plugins.json and the plugins folder
                        var project_www = platforms[platform].www(path.join(paths.projects_dir, platform, plugin));
                        var www_files = fs.readdirSync(project_www);
                        for(element in www_files) {
                            if(www_files[element] != 'cordova.js' && www_files[element] != 'cordova_plugins.js' && www_files[element] != 'plugins') {
                                shell.rm('-rf', path.join(project_www, www_files[element]));
                            }
                        }
                        // add plugin test files to www
                        var plugin_test_dir = fs.readdirSync(path.join(paths.plugins_dir, plugin, 'test'));
                        for(element in plugin_test_dir) {
                            shell.cp('-r', path.join(paths.plugins_dir, plugin, 'test', plugin_test_dir[element]), project_www);
                        }
                    }
                //}
            }
        }
    }
}

CreateCommand.prototype.create_master_mobile_specs = function(paths, callback) {
    if(!fs.existsSync(paths.mobile_spec_dir)) {
        this.clone_mobile_spec(paths, callback);
    }
    if(paths.cli) {
        //this.result_obj['master'] = {};
        var master_dir = path.join(paths.projects_dir, 'master');
        if(fs.existsSync(master_dir)) {
            shell.rm('-rf', master_dir);
        }
        this.tester.emit('log', 'Creating cli master project.');
        this.create_cli_project(paths, 'master', callback);

        this.tester.emit('log', 'Installing plugins to master CLI project.');
        process.chdir(master_dir);
        for(plugin in plugins) {
            //this.result_obj['master'][plugin] = {};
            var cmd = 'cordova plugin add ' + path.join(paths.plugins_dir, plugin);
            var result = shell.exec(cmd, {silent:true, async:false});
            if(result.code > 0) {
                //this.result_obj['master'][plugin].status = "Failed : " + result.output;
                callback('error', 'Failed to install ' + plugin + ' plugin in ' + plugin  + '.' + result.output);
            } else {
                this.tester.emit('log', plugin + ' installed in master test CLI project.' + result.output);
                //this.result_obj['master'][plugin].status = "Success";
            }
        }

        this.tester.emit('log', 'Adding mobile spec to master test for ' + platform);
        var project_www = path.join(paths.projects_dir, 'master', 'www');
        // remove default www files except for cordova.js, cordova_plugins.json and the plugins folder
        var www_files = fs.readdirSync(project_www);
        for(element in www_files) {
            if(www_files[element] != 'cordova.js' && www_files[element] != 'cordova_plugins.js' && www_files[element] != 'plugins') {
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

        //Prepare cordova project
        var cmd = 'cordova prepare';
        var result = shell.exec(cmd, {silent:true, async:false});
        if(result.code > 0) {
            callback('error', 'Failed to prepare master cordova test project' + result.output);
        }

    } else {
        for(platform in platforms) {
            //this.result_obj[platform]['master'] = {};
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
            // remove default www files except for cordova.js, cordova_plugins.json and the plugins folder
            var www_files = fs.readdirSync(project_www);
            for(element in www_files) {
                if(www_files[element] != 'cordova.js' && www_files[element] != 'cordova_plugins.js' && www_files[element] != 'plugins') {
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

/*!
 * Execute.
 */

CreateCommand.prototype.execute = function(options, callback) {
    // create tester project
    try {
        //this.result_obj = {};
        if(!fs.existsSync(options.path) && options.path != "--cli") {
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
        if(options.cli) {
            paths.cli = true;
            //TODO : check cli version??
            var result = shell.exec('cordova', {silent:true, async:true}).code;
            if(result > 0) {
                callback('error', 'Missing Cordova-CLI? "npm install -g cordova"');
            }
            this.tester.emit('warn', 'Creating tester project using the cordova CLI.' + paths.cli);
            this.clone_plugins(paths, callback);
            this.create_test_projects(paths, callback);
            this.install_plugins(paths, callback);
            this.add_plugin_tests(paths, callback);
            this.create_master_mobile_specs(paths, callback);
        } else {
            //TODO : check plugman version??
            var result = shell.exec('plugman', {silent:true, async:true}).code;
            if(result > 0) {
                callback('error', 'Missing Plugman? "npm install -g plugman"');
            }
            this.clone_platforms(paths, callback);
            this.clone_plugins(paths, callback);
            this.create_test_projects(paths, callback);
            this.install_plugins(paths, callback);
            this.add_plugin_tests(paths, callback);
            this.create_master_mobile_specs(paths, callback);
        }

        //fs.writeFileSync(path.join(options.path, 'results.json'), JSON.stringify(this.result_obj));

        this.tester.emit('log', 'plugin tester project created at', options.path);
        callback(null);
    }
    catch(e) {
        callback(e);
    }
};
