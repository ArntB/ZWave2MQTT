/**
 * DomoGeeek v1.0
 * https://github.com/ltoinel/domogeeek
 *
 * Copyright 2014 ZWave2MQTT
 * Released under the Apache License 2.0 (Apache-2.0)
 * 
 * @desc: Configuration file for the ZwaveBus
 * @author: ltoinel@free.fr
 */

var config = require('./secret.js');
// MQTT Message Broker Config should be defined in secret.js
// https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-mqtt-support
// config.mqtt = {};
// config.mqtt.uri = "mqtts://{hub_url}";
// config.mqtt.options = {
//     username: '{hub_url}/{device_id}/api-version=2016-11-14',
//     password: '{sas_token}',
//     keepalive: 20,
//     clean: true,
//     clientId: '{device_id}'
// };

//Debug
config.debug = true;

// Zwavebus
config.saveconfig = false;
config.logging = false;
config.consoleoutput = true;
config.suppressrefresh = false;
config.device = '/dev/ttyS0';

module.exports = config;
