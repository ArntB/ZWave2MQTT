/**
 * ZWave2MQTT v1.1 https://github.com/ltoinel/ZWave2MQTT
 * 
 * Copyright 2015 Released under the Apache License 2.0 (Apache-2.0)
 * 
 * @desc: Event handler for the ZwaveBus
 * @author: ltoinel@free.fr
 */

var constants = require('./constants');
var Guid = require('guid');
// Initialize the node array
var nodes = [];

//The logger for this module
var logger;
var zwaveBus;
var config = require('../config');
exports.init = function(module) {
	logger = module.logger;
	zwaveBus = module;
};

/*
 * When the driver is ready. @param homeid: the home id.
 */
exports.onDriverReady = function(homeid) {
	logger.info('Scanning homeid=0x%s...', homeid.toString(16));
};

/*
 * When a node is discovered and added.
 */
exports.onNodeAdded = function(nodeid) {
	nodes[nodeid] = {
		manufacturer : '',
		manufacturerid : '',
		product : '',
		producttype : '',
		productid : '',
		type : '',
		name : '',
		loc : '',
		classes : {},
		ready : false
	};
};

function publishEvent(nodeid,value, action){
	var message = JSON.stringify({id:Guid.raw(), source: `${config.deviceId}/${nodeid}/${value.index}`, label: value.label, 
		value: value.value, event_type : action, timestamp: Date.now()});
		logger.debug("Publishing : " + message);
	zwaveBus.publish(message);
}

exports.onEvent = function(nodeid, value) {
	publishEvent(nodeid,value,"Event");
};

/*
 * When a new value is added.
 */
exports.onValueAdded = function(nodeid, comclass, value) {
	if (!nodes[nodeid].classes[comclass]) {
		nodes[nodeid].classes[comclass] = {};
	}
	nodes[nodeid].classes[comclass][value.index] = value;

	logger.debug('node %d/%s: value added: %d:%s:%s', nodeid,value.index, comclass, value.label, value.value);
	// Add new value to sensor registry:
	var addValueMessage = JSON.stringify({id:`${config.deviceId}/${nodeid}/${value.index}`, hubid:config.deviceId,
	comclass:comclass, label:value.label, value:value.value, timestamp: Date.now(),event_type:'AddValue'});
	zwaveBus.publish(addValueMessage);
};

/*
 * When a value changed.
 */
exports.onValueChanged = function(nodeid, comclass, value) {
	publishEvent(nodeid, value, "ValueChanged");
	if (nodes[nodeid].ready) {
		logger.debug('node%d: value changed: %d:%s:%s->%s', nodeid, comclass,
						value.label,
						nodes[nodeid].classes[comclass][value.index].value,
						value.value);
	} else {
		logger.debug('node%d: value changed: %d:%s:%s', nodeid, comclass,
				value.label, value.value);
	}
	nodes[nodeid].classes[comclass][value.index] = value;
};

/*
 * When a value is removed.
 */
exports.onValueRemoved = function(nodeid, comclass, index) {
	if (nodes[nodeid].classes[comclass] && 
			nodes[nodeid].classes[comclass][index]){
		delete nodes[nodeid].classes[comclass][index];
	}
};

function registerSensorHub(){
	var registerSensorHub = JSON.stringify({id:config.deviceId, type:"sensor_hub",timestamp: Date.now(),event_type:'RegisterHub'});
	zwaveBus.publish(registerSensorHub);
}
/*
 * When a node is ready.
 */
exports.onNodeReady = function(nodeid, nodeinfo) {
	nodes[nodeid].manufacturer = nodeinfo.manufacturer;
	nodes[nodeid].manufacturerid = nodeinfo.manufacturerid;
	nodes[nodeid].product = nodeinfo.product;
	nodes[nodeid].producttype = nodeinfo.producttype;
	nodes[nodeid].productid = nodeinfo.productid;
	nodes[nodeid].type = nodeinfo.type;
	nodes[nodeid].name = nodeinfo.name;
	nodes[nodeid].loc = nodeinfo.loc;
	nodes[nodeid].ready = true;
	
	
	logger.debug('node%d: name="%s", type="%s", location="%s"', nodeid,
			nodeinfo.name, nodeinfo.type, nodeinfo.loc);
	console.log("NODEINFO :::::::::::::::::::::::::::::  ");
	console.log(nodeinfo);
	
	registerSensorHub();	

	for (var comclass in nodes[nodeid].classes) {
		switch (comclass) {
		case 0x25: // COMMAND_CLASS_SWITCH_BINARY
		case 0x26: // COMMAND_CLASS_SWITCH_MULTILEVEL
			zwave.enablePoll(nodeid, comclass);
			break;
		}
		var values = nodes[nodeid].classes[comclass];
		logger.debug('node%d: class %d', nodeid, comclass);
		for (var idx in values)
			logger.debug('node%d:   %s=%s', nodeid, values[idx].label,
					values[idx].value);
	}
};

/*
 * When a notification is received.
 */
exports.onNotification = function(nodeid, notif) {
	switch (notif) {
	case 0:
		logger.debug('node%d: message complete', nodeid);
		break;
	case 1:
		logger.debug('node%d: timeout', nodeid);
		break;
	case 2:
		logger.debug('node%d: nop', nodeid);
		break;
	case 3:
		logger.debug('node%d: node awake', nodeid);
		break;
	case 4:
		logger.debug('node%d: node sleep', nodeid);
		break;
	case 5:
		logger.debug('node%d: node dead', nodeid);
		break;
	case 6:
		logger.debug('node%d: node alive', nodeid);
		break;
	default:
		logger.debug('node%d: unknown notification %s', nodeid, notif);
	}
};

/*
 * When the network scan is complete.
 */
exports.onScanComplete = function() {
	logger.info('Scan complete, hit ^C to finish.');
};


