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
var path  = require('path');

module.exports = {
    'wp7' : {
        url : 'https://git-wip-us.apache.org/repos/asf/cordova-wp7.git',
        www : function(project_path) {
            return path.join(project_path, 'www');
        }
    }/*,
    'wp8' : {
        url : 'https://git-wip-us.apache.org/repos/asf/cordova-wp8.git',
        www : function(project_path) {
            return path.join(project_path, 'www');
        }
    },
    'android' : {
        url : 'https://git-wip-us.apache.org/repos/asf/cordova-android.git',
        www : function(project_path) {
            return path.join(project_path, 'assets', 'www');
        }
    },
    'ios' : {
        url : 'https://git-wip-us.apache.org/repos/asf/cordova-ios.git',
        www : function(project_path) {
            return path.join(project_path, 'www');
        }
    }*/
};
