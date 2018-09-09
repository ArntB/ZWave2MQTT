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
var zwave;
var config = require('../config');
exports.init = function(module,_zwave) {
	logger = module.logger;
	zwaveBus = module;
	zwave = _zwave;
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

function publishSensorEvent(nodeid,value, action, comclass){
	var message = JSON.stringify(
	{
		id:Guid.raw(), source: `${config.deviceId}/${nodeid}/${comclass}/${value.index}`, 
		hubid: config.deviceId,
		nodeid:nodeid,
		comclass:comclass,
		index:value.index,
		
		label: value.label, 
		value: value.value, 
		
		event_type: action, timestamp: Date.now()
	});
	logger.debug("Publishing : " + message);
	zwaveBus.publish(message);
}

function registerSensorHub(node){
	var registerSensorHub = JSON.stringify({
		id: Guid.raw(), source: `${config.deviceId}`, 
		hubid: config.deviceId,

		node:node,
		
		event_type:'RegisterHub', 
		timestamp: Date.now()
	});
	zwaveBus.publish(registerSensorHub);
}

exports.onEvent = function(nodeid, value) {
	// publishEvent(nodeid,value,"Event");
};

/*
 * When a new value is added.
 */
exports.onValueAdded = function(nodeid, comclass, value) {
	if (!nodes[nodeid].classes[comclass]) {
		nodes[nodeid].classes[comclass] = {};
	}
	nodes[nodeid].classes[comclass][value.index] = value;
	
	logger.debug('value added - node %d/%d/%d: %s:%s', nodeid, comclass, value.index, value.label, value.value);
	// Add new value to sensor registry:
	publishSensorEvent(nodeid,value,'AddValue',comclass);
	// var addValueMessage = JSON.stringify({
	// 	id: Guid.raw(),source:`${config.deviceId}/${nodeid}/${comclass}/${value.index}`,
	// 	hubid: config.deviceId,
	// 	label: value.label,
	// 	value: value.value,
	// 	event_type:'AddValue', timestamp: Date.now()
	// });
	// zwaveBus.publish(addValueMessage);
};

/*
 * When a value changed.
 */
exports.onValueChanged = function(nodeid, comclass, value) {
	publishSensorEvent(nodeid, value, "ValueChanged",comclass);
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
	
	registerSensorHub(nodes[nodeid]);	

	for (var comclass in nodes[nodeid].classes) {
		switch (comclass) {
		case 0x25: // COMMAND_CLASS_SWITCH_BINARY
		case 0x26: // COMMAND_CLASS_SWITCH_MULTILEVEL
			zwave.enablePoll(nodeid, comclass);
			break;
		}
		var values = nodes[nodeid].classes[comclass];
		logger.debug('node%d: class %d', nodeid, comclass);
		for (var idx in values){
			logger.debug('node %d>/%d/%d:   %s=%s', nodeid,comclass,idx, values[idx].label,
					values[idx].value);
		}
	}
//	for(var comclass in nodex[3].classes){
//		var values = nodes[nodeid].classes[comclass];
//		logger.debug('node%d: class %d', 3, comclass);

//		for (var idx in values){
//			logger.debug('node%d:   %s=%s', nodeid, values[idx].label,
//					values[idx].value);
//		}
//
//	}
	// console.log(nodes[3]);
	// if(true){
	// 	logger.debug("Setting config---------------------------------");
	// 	var stats = zwave.getNodeStatistics('3');
	// 	logger.debug(stats);
	// 	//zwave.setValue('03', '112', '40', '40', '1');
	// 	zwave.setConfigParam(3, 64, 1,1);
	// 	zwave.setConfigParam(3, 40, 1,1);
	// 	zwave.setConfigParam(3, 41, 0x000A0100,4);
	// }
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


