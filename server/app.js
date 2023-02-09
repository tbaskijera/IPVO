// app.js
const express = require('express');
const fs = require('fs')
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');
// api.js for the routes
const api = require('./api');
const app = express();
// body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// all routes are falling back into api.js
app.use('/', api);
// HTTP port setting
const port = process.env.PORT || '3000';
app.set('port', port);
// HTTP server creation

//const server = http.createServer(app);
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    fs.createReadStream('index.html').pipe(res)
  })
// listening all incoming requests on the set port
server.listen(port, () => console.log(`Server running on port:${port}`));