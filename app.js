/**
 * ZWave2MQTT v1.1 https://github.com/ltoinel/ZWave2MQTT
 * 
 * Copyright 2014 DomoGeeek Released under the Apache License 2.0 (Apache-2.0)
 * 
 * @desc: ZwaveBus main app
 * @author: ltoinel@free.fr
 */

// Global require
var OpenZwave = require('openzwave-shared');

// Local require
var module = require("./libs/module");

//Local require
var config = require('./config');
var handler = require('./libs/handler');
var mqtt = require('mqtt');

// Initialize the module
var zwaveBus = new module( __dirname);


// Initialize the Zwave connector
var zwave = new OpenZwave({
	SaveConfig : config.saveconfig,
        Logging : config.logging,
        ConsoleOutput : config.consoleoutput,
        SuppressRefresh : config.suppressrefresh
});

// On new command handler
var onCommand = function(command){
        console.log(command);
        if(command.event_type == "config"){
                handler.setNodeConfig(command);
                //zwave.setConfigParam(command.nodeid, command.commandclass, command.value, command.size);
        }
        else if(command.event_type == "set_value"){
                zwave.setValue(command.nodeid, command.commandclass, command.instance, command.index, command.value);
        }
        else if(command.event_type == "addNode"){
                handler.addNode();      
        }
        else if(command.event_type == "removeNode"){
                handler.removeNode();      
        }
        else if(command.event_type == "removeFailedNode"){
                var result = handler.removeFailedNode(command.nodeid);      
        }
        // zwave.addNode(homeid,true);

}

handler.init(zwaveBus,zwave);
zwaveBus.start(onCommand);

// Event 
zwave.on('node event', handler.onEvent);

// The driver is ready
zwave.on('driver ready', handler.onDriverReady);

// The driver is failed
zwave.on('driver failed', process.exit);

// A node has been added to the network
zwave.on('node added', handler.onNodeAdded);

// A value has been added
zwave.on('value added', handler.onValueAdded);

// A value has been changed
zwave.on('value changed', handler.onValueChanged);

// A value has been removed
zwave.on('value removed', handler.onValueRemoved);

// A node is ready
zwave.on('node ready', handler.onNodeReady);

// A notification has been received
zwave.on('notification', handler.onNotification);

// The scan is complete
zwave.on('scan complete', function() {
	handler.onScanComplete();
});

process.removeAllListeners('SIGINT');

// Cleaning resources on SIGINT
process.on('SIGINT', function() {
        console.log('disconnecting...');
        zwave.disconnect(config.device);
        process.exit();
});

// Zwave connect
zwave.connect(config.device);

