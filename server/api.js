const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const mysql = require('mysql');
const fs = require('fs')

router.use(bodyParser.json());

const con = mysql.createConnection({
    host: "database",
    user: "root",
    port: '3306',
    password: "somePassword",
    database: "db",
    charset  : 'utf8'
});

con.connect(function(err) {
    if(err) throw err;
    console.log("Connected to MYSQL");

    con.query('SELECT * FROM predictions', function (err, rows, fields) {
        if (err) throw err;
        console.log(rows);
      });
});

router.get('/',(req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    fs.createReadStream('index.html').pipe(res)
    
});

router.get('/predict',(req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    fs.createReadStream('predict.html').pipe(res)
    
});

router.get('/db',(req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    fs.createReadStream('db.html').pipe(res)
    
});

router.post('/db/post', (req, res) => {
   console.log(req.body)
    const data = {
        request: req.body.request,
        response: req.body.response,
        time_of_request: req.body.time_of_request,
        time_of_response: req.body.time_of_response,
        time_elapsed: req.body.time_elapsed
        
    };
   
    con.query(`INSERT INTO predictions (request, response, time_of_request, time_of_response, time_elapsed) VALUES (?, ?, ?, ?, ?);`, [req.body.request, req.body.response, req.body.time_of_request, req.body.time_of_response, req.body.time_elapsed], (error, results, fields) => {
        if (error) {
            console.error('Error inserting data: ' + error.stack);
            res.status(500).send('Error inserting data');
        } else {
            console.log('Inserted data with ID ' + results.insertId);
            res.send('Data inserted successfully');
        }
    });
});

router.get('/db/get',(req, res) => {
    con.query("SELECT * FROM predictions", function (err, result, fields) {
        if (err) res.send(err);
        res.send(result);
        console.log(result);
        
        
    });
});

module.exports = router;