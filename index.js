var path = require('path')

if('production' !== process.env.LOCAL_ENV )
  require('dotenv').load();

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var urlencoded = bodyParser.urlencoded({extended: false})

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.use(urlencoded);

var port = process.env.PORT || 3000

var server = require('http').createServer(app);
server.listen(port);
console.log("listen to port " + port)
var rc_engine = require('./engine');
app.get('/', function (req, res) {
  rc_engine.login(req, res)
})

app.post('/readlogs', function (req, res) {
  rc_engine.readCallLogsAsync(req, res)
})

app.get('/recordedcalls', function (req, res) {
  rc_engine.loadCallsFromDB(req, res)
})
app.post('/search', function (req, res) {
  rc_engine.searchCallsFromDB(req, res)
})

app.post('/transcribe', function (req, res) {
  rc_engine.transcriptCallRecording(req, res)
})
