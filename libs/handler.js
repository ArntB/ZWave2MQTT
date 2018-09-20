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
var myHomeid = null;
exports.init = function(module,_zwave) {
	logger = module.logger;
	zwaveBus = module;
	zwave = _zwave;
};

/*
 * When the driver is ready. @param homeid: the home id. 0xc0e9c710
 */
exports.onDriverReady = function(homeid) {
	logger.info('Scanning homeid=0x%s...', homeid.toString(16));
	//zwave.addNode(homeid,true);

	myHomeid = homeid;
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
	console.log("Node Added " + nodeid);
};

exports.addNode = function(){
	if(!myHomeid) {
		logger.error("Trying to add nodes before driver initialized");
	}
	logger.info("Ready to add device to homeid=0x%s...",myHomeid.toString(16));
	zwave.addNode(myHomeid, true);
	stopModeAfterTimeout("Stop add mode");
};
exports.removeNode = function(){
	if(!myHomeid) {
		logger.error("Trying to add nodes before driver initialized");
	}
	zwave.removeNode(myHomeid);
	logger.info("Ready to remove device to homeid=0x%s...",myHomeid.toString(16));
	stopModeAfterTimeout("Stop remove mode");
};
exports.removeFailedNode = function(nodeid){
	if(!myHomeid) {
		logger.error("Trying to add nodes before driver initialized");
	}
	var result = zwave.removeFailedNode(myHomeid, nodeid);
	logger.info("Remove failed device to homeid=0x%s nodeid=%s result %s", myHomeid.toString(16),nodeid,result);
	
};

function stopModeAfterTimeout(message) {
	setTimeout(() => {
		zwave.cancelControllerCommand(myHomeid);
		logger.info(message);
	}, 60000);
}

function publishSensorEvent(nodeid,value, action, comclass){
	var message = JSON.stringify(
	{
		id:Guid.raw(), source: `${config.deviceId}/${nodeid}/${comclass}/${value.index}`, 
		hubid: config.deviceId,
		nodeid:nodeid,
		event_type: action, 
		timestamp: Date.now(),
		message_type: "zwave_sensor",

		comclass:comclass,
		index:value.index,
		label: value.label, 
		value: value.value
	});
	logger.debug("Publishing : " + message);
	zwaveBus.publish(message);
}

function registerSensor(nodeid){
	var node = nodes[nodeid];
	var registerSensorHub = JSON.stringify({
		id: Guid.raw(), source: `${config.deviceId}/${nodeid}`, 
		hubid: config.deviceId,
		nodeid:nodeid,
		event_type:'RegisterNode', 
		timestamp: Date.now(),
		message_type: "zwave_sensor",

		node:node
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

// manufacturer: 'FIBARO System',
// manufacturerid: '0x010f',
// product: 'Unknown: type=0702, id=1000',
// producttype: '0x0702',
// productid: '0x1000',
// type: 'Access Control Sensor',
// name: '',
// loc: '' }

var deviceConfig = {
	2: [
		[3, 50,  60, 2],
		[3, 51,   5, 2],
		[3, 52, 300, 2],
	],
	3: [
		[3, 50,  60, 2],
		[3, 51,   5, 2],
		[3, 52, 300, 2],
	],
	5: [
		[5, 62,  60, 2],
		[5, 64,   60, 2]
	],
	// 3: [
	// 	[3, 64,          1, 1],
	// 	[3, 40,          1, 1],
	// 	[3, 41, 0x000A0100, 4]
	// ]
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
	
	registerSensor(nodeid);	

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
	// console.log(nodes[3]);
	// if(true){
	// 	logger.debug("Setting config---------------------------------");
	// 	var stats = zwave.getNodeStatistics('3');
	// 	logger.debug(stats);
	// 	zwave.setConfigParam(3, 64,          1, 1);
	// 	zwave.setConfigParam(3, 40,          1, 1);
	// 	zwave.setConfigParam(3, 41, 0x000A0100, 4);
	// }


	if(deviceConfig[nodeid] ){
		var config = deviceConfig[nodeid];
		config.forEach(confItem => {
			zwave.setConfigParam(confItem[0], confItem[1], confItem[2], confItem[3]);	
		});
		// zwave.setConfigParam(3, 50,  60, 2);
		// zwave.setConfigParam(3, 51,   5, 2);
		// zwave.setConfigParam(3, 52, 300, 2);
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


