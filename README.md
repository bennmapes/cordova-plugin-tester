We're breaking out the API surface of Cordova into discreet plugins. This script helps test the support tooling for that.

Run the test harness script, everything should pass and you can go run each project to test.

Run the clean script to clean out your working directory. 

Each plugin comes with its own docs + tests.

This script creates a ios and android project for every plugin and installs the plugin into the project. Once completed, a master project for ios and android is built that all of the plugins get installed into and mobile spec is copied into the www directories.
