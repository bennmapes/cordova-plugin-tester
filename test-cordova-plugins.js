#!/usr/bin/env node
/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

var path  = require('path'),
    fs    = require('fs'),
    shell = require('shelljs'),
    platforms = require('./platforms'),
    plugins   = require('./plugins'),
    cwd       = process.cwd(),
    results   = path.join(__dirname, 'results.json'),
    temp_dir  = path.join(__dirname, 'temp'),
    platforms_dir = path.join(temp_dir, 'platforms'),
    plugins_dir   = path.join(temp_dir, 'plugins'),
    projects_dir  = path.join(temp_dir, 'projects'),
    mobile_spec_dir = path.join(temp_dir, 'cordova-mobile-spec');

var ms_url  = 'https://git-wip-us.apache.org/repos/asf/cordova-mobile-spec.git';

/*
Temp Directory Structure
temp_dir
    - platforms
        - Contains source of all platforms
    - projects
        - Contains folders for each platform
            - Contains the plugin projects for that platform
    - plugins
        - Contains source of all plugins
    - cordova-mobile-spec
        - Contains mobile spec source

*/  

//clean();
var result_obj = {};
if(!fs.existsSync(temp_dir)) {
    shell.mkdir(temp_dir);
}
clone_platforms();
clone_plugins()
create_test_projects();
install_plugins();
add_mobile_spec();
fs.writeFileSync(results, JSON.stringify(result_obj));

function clean() {
    shell.rm('-rf', temp_dir);
}

function clone_platforms() {
    if(!fs.existsSync(platforms_dir)) {
        shell.mkdir(platforms_dir);
    }
    process.chdir(path.join(platforms_dir));
    for(platform in platforms) {
        result_obj[platform] = {};
        if(fs.existsSync(path.join(platforms_dir, 'cordova-' + platform))) {
            console.log('Skipping Cordova ' + platform + ' download');
        } else {
            console.log('Cloning ' + platform + '...');
            var cmd = 'git clone ' + platforms[platform].url;
            var result = shell.exec(cmd, {silent:true, async:false});
            if(result.code > 0) {
                console.log('Failed to clone ' + platform + '.');
                console.log(result.output);
                process.exit();
            }
            process.chdir(path.join(platforms_dir, 'cordova-' + platform));
            cmd = 'git fetch && git checkout 3.0.0';
            result = shell.exec(cmd, {silent:true, async:false});
            if(result.code > 0) {
                console.log('Failed to checkout 3.0.0 branch of ' + platform + '.');
                console.log(result.output);
                process.exit();
            }
        }
    }
}

function clone_plugins() {
    if(!fs.existsSync(plugins_dir)) {
        shell.mkdir(plugins_dir);
    }
    process.chdir(path.join(plugins_dir));
    for(plugin in plugins) {
        if(fs.existsSync(path.join(plugins_dir, plugin))) {
            console.log('Skipping Plugin ' + plugin + ' download');
        } else {
            console.log('Cloning plugin ' + plugins[plugin].name + '.');
            var cmd = 'git clone ' + plugins[plugin].url;
            var result = shell.exec(cmd, {silent:true, async:false});
            if(result.code > 0) {
                console.log('Failed to clone ' + plugin + '.');
                console.log(result.output);
                process.exit();
            }
        }
    }
}

function clone_mobile_spec() {
    if(!fs.existsSync(mobile_spec_dir)) {
        console.log('Cloning Mobile Spec...');
        process.chdir(temp_dir);
        var cmd = 'git clone ' + ms_url;
        var result = shell.exec(cmd, {silent:true, async:false});
        if(result.code > 0) {
            console.log('Failed to clone cordova-mobile-spec.');
            console.log(result.output);
            process.exit();
        }
    }
}

function create_test_projects() {
    if(!fs.existsSync(projects_dir)) {
        shell.mkdir(projects_dir);
    }
    // go through the plugins and create a project for each plugin on each platform
    for(plugin in plugins) {
        var plugin_name = plugin.replace(/\-/g, '_');
        for(platform in platforms) {
            if(!fs.existsSync(path.join(projects_dir, platform))) {
                shell.mkdir(path.join(projects_dir, platform));
            }
            //create plugin project if it doesn't exist
            var plugin_proj_path = path.join(projects_dir, platform, plugin);
            if(fs.existsSync(plugin_proj_path)) {
                console.log('Skipping plugin project ' + plugin_name + ' for platform ' + platform + '.');
            } else {
                console.log('Creating plugin project ' + plugin_name + ' for platform ' + platform + '.');
                var create_script = path.join(platforms_dir, 'cordova-' + platform, 'bin', 'create');
                var cmd = create_script + ' ' + plugin_proj_path + ' ' + plugins[plugin].name + ' ' + plugin_name;
                var result = shell.exec(cmd, {silent:true, async:false});
                if(result.code > 0) {
                    console.log('Failed to create plugin project ' + plugin_name + ' for platform ' + platform + '.');
                    console.log(result.output);
                    process.exit();
                } else {
                    console.log('Plugin Project ' + plugin_name + ' created for ' + platform);
                }
            }
        }
    }
}

function install_plugins() {
    //TODO : check plugman version??
    var result = shell.exec('plugman', {silent:true, async:true}).code;
    if(result > 0) {
       console.log('Missing Plugman? "npm install -g plugman"');
       process.exit(1);
    }

    for(plugin in plugins) {
        var plugin_name = plugin.replace(/\-/g, '_');
        for(platform in platforms) {
            console.log('Installing ' + plugin + ' plugin for ' + platform);
            var cmd = 'plugman --platform ' + platform + ' --project ' + path.join(projects_dir, platform, plugin) + ' --plugin ' + path.join(plugins_dir, plugin);
            result = shell.exec(cmd, {silent:true, async:false});
            if(result.code > 0) {
                result_obj[platform][plugin] = "Failed : " + result.output;
                console.log('Failed to install ' + plugin + ' plugin for ' + platform + '.');
                console.log(result.output);
                process.exit();
            } else {
                console.log('Plugman successfully installed ' + plugin + ' for ' + platform);
                result_obj[platform][plugin] = "Success";
            }
        }
    }
}

function add_mobile_spec() {
    clone_mobile_spec();
    for(plugin in plugins) {
        for(platform in platforms) {
            if(result_obj[platform][plugin]) {
                var project_www = platforms[platform].www(path.join(projects_dir, platform, plugin));
                console.log('Adding mobile spec to ' + plugin + ' for ' + platform);
                // remove default www files except for cordova.js
                var www_files = fs.readdirSync(project_www) ;
                for(element in www_files) {
                    if(www_files[element] != 'cordova.js') {
                        shell.rm('-rf', path.join(project_www, www_files[element]));
                    }
                }

                // add mobile spec files to www
                var mobile_spec_files = fs.readdirSync(mobile_spec_dir);
                for(element in mobile_spec_files) {
                    if(mobile_spec_files[element] != 'cordova.js') {
                        shell.cp('-r', path.join(mobile_spec_dir, mobile_spec_files[element]), project_www);
                    }
                }
            }
        }
    }
}