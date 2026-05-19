#!/usr/bin/env node
'use strict';

const { readFileSync, existsSync } = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

console.log('Running deploy script!');

const { APP_FILE_NAME, XP_INSTALL_API, XP_USER, XP_PASSWORD } = process.env;

function requireEnv(name, value, redact = false) {
    if (!value) {
        console.error(`${name} must be specified`);
        process.exit(1);
    }
    console.log(`${name}: ${redact ? '***' : value}`);
}

requireEnv('APP_FILE_NAME', APP_FILE_NAME);
requireEnv('XP_USER', XP_USER);
requireEnv('XP_PASSWORD', XP_PASSWORD, true);
requireEnv('XP_INSTALL_API', XP_INSTALL_API);

const boundary = `FormBoundary${Date.now()}`;
const fileName = path.basename(APP_FILE_NAME);
const fileContent = readFileSync(APP_FILE_NAME);

const body = Buffer.concat([
    Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`
    ),
    fileContent,
    Buffer.from(`\r\n--${boundary}--\r\n`),
]);

const url = new URL(XP_INSTALL_API);
const isHttps = url.protocol === 'https:';
const lib = isHttps ? https : http;
const credentials = Buffer.from(`${XP_USER}:${XP_PASSWORD}`).toString('base64');

const caPath = '/etc/pki/tls/cacert.pem';
const ca = existsSync(caPath) ? readFileSync(caPath) : undefined;

const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
    },
    ...(isHttps && {
        rejectUnauthorized: false, // equivalent to curl -k
        ...(ca && { ca }),
    }),
};

const req = lib.request(options, (res) => {
    console.log(`Response status: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log(`Response body: ${data}`);
        if (res.statusCode >= 400) {
            process.exit(1);
        }
    });
});

req.on('error', (err) => {
    console.error('Request failed:', err.message);
    process.exit(1);
});

req.write(body);
req.end();
console.log('Request sent, waiting for response...');
