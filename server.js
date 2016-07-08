'use strict';

const createApp = require('./lib/app');
const argv = require('minimist')(process.argv.slice(2));

let options = argv;

// Load credentials if they weren't supplied
if (!(options.consumerKey && options.consumerSecret)) {
    const fs = require('fs');
    if (!fs.existsSync('./credentials.json')) {
        throw new Error('Missing credentials.json!');
    }
    let credentials = require('./credentials.json');
    options.consumerKey = credentials.consumerKey || credentials.consumer_key;
    options.consumerSecret = credentials.consumerSecret || credentials.consumer_secret;
}

createApp(options);
