//api.js
const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const cors = require('cors');
var con = mysql.createConnection({
    host: "database",
    user: "root",
    port: '3306',
    password: "somePassword",
    database: "db",
    charset  : 'utf8'
});
var corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200
}
// initial connection
con.connect(function(err) {
    if(err) throw err;
    console.log("Connected to MYSQL");

    con.query('SELECT * FROM predictions', function (err, rows, fields) {
        if (err) throw err;
        console.log(rows);
      });
});

con.query("INSERT INTO predictions (request, response, time_of_request, time_of_response) VALUES ('request', 'response', TIME (NOW()), TIME (NOW()))", function (err, result) {
    if (err) throw err;
    console.log("Data written to the database!");
  });


// our simple get /jobs API
router.get('/jobs', cors(corsOptions), (req, res) => {
    con.query("SELECT * FROM predictions", function (err, result, fields) {
        if (err) res.send(err);
        res.send(result);
        console.log(result);
    });
});

module.exports = router;