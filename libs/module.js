/**
 * ZWave2MQTT v1.1 https://github.com/ltoinel/ZWave2MQTT
 * 
 * Copyright 2015 Released under the Apache License 2.0 (Apache-2.0)
 * 
 * @desc: Abstract module implementation
 * @author: ltoinel@free.fr
 */

// Loading MQTT 
var mqtt = require('mqtt');

// Global module vars
function Module(path,cfg) {
	
	// Path of this module
	this.path = path;
	
	// Package that describes this module
	this.pjson = require(path + '/package.json');
	
	// Package that describes this module
	this.config = cfg;//require(path + '/config');
	
	// The logger for this module
	this.logger = require('./logger').getLogger(this.pjson.name, this.config.debug);

	// The MQTT Client
	this.client = null;
	
}

Module.prototype = {
		
	start: function(callback){

		// Starting the service
		console.info("-> Starting %s v%s", this.pjson.name, this.pjson.version);
		var self = this;
		// this.client = {
		// 	publish: function(cmd,msg){
		// 		self.logger.info("CMD: " + cmd + " msg: " + msg);

		// 	},
		// 	end: function(){
		// 		self.logger.info("end");
		// 	}
		// };//MOCK
		// Create an MQTT client
		this.client = mqtt.connect(this.config.mqtt.uri, this.config.mqtt.options);
		console.info("Connecting to the MQTT Server : %s", this.config.mqtt.uri);
		
		// // MQTT Connection
		this.client.on('connect', function(){
			console.info("Connected to the MQTT broker");
			var topic = `devices/${self.config.mqtt.options.clientId}/messages/devicebound/`;
			self.client.subscribe(topic);
		});
	
		// On message received on "command"	
		this.client.on('message', function (topic, message) {
			var command = JSON.parse(message.toString());
			console.log("Command received : %s %s %s %s %s", command.nodeid, command.commandclass, command.instance, command.index, command.value);
			callback(command);
		});

		// MQTT Close connection
		this.client.on('close', function(){
			console.warn("Disconnected from the MQTT broker");
		});

		// MQTT Offline
		this.client.on('offline', function(){
			console.warn("Going offline ...");
		});

		// MQTT error
		this.client.on('error', function(error){
			console.error(error);
		});
		
		var self = this;
		
		// Cleaning resources on SIGINT
		process.on('SIGINT', function(){
			self.stop();
		});
	
	},

	stop: function(){
		
		// Stopping the service
		console.info("-> Stopping %s v%s", this.pjson.name, this.pjson.version);
		
		// Disconnecting the client
		this.client.end();
	
		// Stopping the process
		process.exit();
	},

	publish: function(topic, message){
		var topic = `devices/${self.config.mqtt.options.clientId}/messages/events/zwave`;
		console.log("publishing to topic:" + topic);
		this.client.publish(topic, message);
	}
};

// export the class
module.exports = Module;
