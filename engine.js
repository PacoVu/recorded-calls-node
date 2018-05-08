var RC = require('ringcentral')
var fs = require('fs')
var async = require("async");
const sqlite3 = require('sqlite3').verbose();
var CALLS_DATABASE = './db/calllogs.db';
var watson = require('./watson');
require('dotenv').load()

var rcsdk = null
if (process.env.PROD == "production"){
  rcsdk = new RC({
    server:RC.server.production,
    appKey: process.env.CLIENT_ID_PROD,
    appSecret:process.env.CLIENT_SECRET_PROD
  })
}else{
  rcsdk = new RC({
      server:RC.server.sandbox,
      appKey: process.env.CLIENT_ID_SB,
      appSecret:process.env.CLIENT_SECRET_SB
    })
}
var platform = rcsdk.platform()
createTable()

var engine = module.exports = {
    login: function(req, res){
      var un = ""
      var pwd = ""
      if (process.env.PROD == "production"){
        un= process.env.USERNAME_PROD,
        pwd= process.env.PASSWORD_PROD
      }else{
        un= process.env.USERNAME_SB,
        pwd= process.env.PASSWORD_SB
      }
      platform.login({
        username:un,
        password:pwd
      })
      .then(function(resp){
        res.render('index')
      })
      .catch(function(e){
        throw e
      })
    },
    transcriptCallRecording(req, res){
      var audioSrc = "./recordings/" + req.body.audioSrc + ".mp3"
      watson.transcribe(res, req.body.audioSrc, audioSrc)
    },
    // use async
    readCallLogsAsync(req, res){
      var endpoint = ""
      if (req.query.access == "account")
        endpoint = '/account/~/call-log'
      else
        endpoint = '/account/~/extension/~/call-log'
      if (process.env.PRINT_LOG == "yes"){
        console.log(req.body)
      }
      var recordArr = []
      platform.get(endpoint, req.body)
      .then(function(resp){
        var json = resp.json()
        let db = new sqlite3.Database(CALLS_DATABASE);
        async.each(json.records,
          function(record, callback){
            if (record.hasOwnProperty("recording")){
              var item = {}
              if (record.from.hasOwnProperty('phoneNumber'))
                item['fromRecipient'] = record.from.phoneNumber
              else if (record.from.hasOwnProperty('name'))
                item['fromRecipient'] = record.from.name
              if (record.to.hasOwnProperty('phoneNumber'))
                item['toRecipient'] = record.to.phoneNumber
              else if (record.to.hasOwnProperty('name'))
                item['toRecipient'] = record.to.name

              item['duration'] = record.duration
              item['id'] = record.recording.id
              item['recordingUrl'] = record.recording.contentUri
              item['processed'] = true
              var recordedFile = item.id + ".mp3"
              item['localAudio'] = "http://localhost:3002/recordings/" + recordedFile
              recordArr.push(item)
              var query = "INSERT or IGNORE into calls VALUES (" + item['id'] + ",'" + item['fromRecipient'] + "','" + item['toRecipient'] + "','" + item['recordingUrl'] + "'," + item['duration'] + ",'" + item['localAudio'] + "','')";
              db.run(query, function(err, result) {
                if (err){
                  console.error(err.message);
                }else{
                  callback()
                }
              });
            }
          }
        );
        saveAudioFile(recordArr, res)
      })
      .catch(function(e){
        var errorRes = {}
        var err = e.toString();
        if (err.includes("ReadCompanyCallLog")){
          errorRes['calllog_error'] = "You do not have admin role to access account level. You can choose the extension access level."
          res.send(JSON.stringify(errorRes))
        }else{
          errorRes['calllog_error'] = "Cannot access call log."
          res.send(JSON.stringify(errorRes))
        }
        console.log(err)
      })
    },
    searchCallsFromDB(req, res){
      let db = new sqlite3.Database(CALLS_DATABASE);
      var query = "SELECT * FROM calls WHERE transcript LIKE '%" + req.body.search + "%'";
      db.all(query, function(err, result) {
        if (err){
          return console.error(err.message);
        }
        if (result != undefined && result.length > 0){
          res.render('recordedcalls', {
              calls: result
            })
        }else{
          res.render('recordedcalls', {
              calls: []
            })
        }
      });
    },
    loadCallsFromDB: function(req, res){
      if (!needLogin(res))
        return
      let db = new sqlite3.Database(CALLS_DATABASE);
      var query = "SELECT * FROM calls";
      db.all(query, function (err, result) {
        if (err){
          return console.error(err.message);
        }
        for (var i=0; i<result.length; i++){
          result[i].recordingUrl = platform.createUrl(result[i].recordingUrl, {addToken: true});
        }
        res.render('recordedcalls', {
            calls: result
          })
      });
    }
}

function saveAudioFile(recordArr, resObj){
  async.each(recordArr,
    function(record, callback){
      var recordingId = record.id
      platform.get(record.recordingUrl)
        .then(function(res) {
          return res.response().buffer();
        })
        .then(function(buffer) {
          var audioSrc = "./recordings/" + record.id + '.mp3'
          fs.writeFileSync(audioSrc, buffer);
          callback()
        })
        .catch(function(e){
          console.log(e)
          throw e
        })
    },
    function(err){
      resObj.send('{"result":"ok"}')
    }
  );
}

function needLogin(){
  if (!platform.auth().accessTokenValid()) {
    if (platform.auth().refreshTokenValid()){
      platform.refresh()
    }else{
      platform.login()
    }
    return false
  }
  return true
}
platform.on(platform.events.refreshSuccess, function(e){
    console.log("recall loadCallsFromDB")
    engine.loadCallsFromDB()
});
function createTable() {
  let db = new sqlite3.Database(CALLS_DATABASE);
  var query = 'CREATE TABLE if not exists calls (id DOUBLE PRIMARY KEY, fromRecipient VARCHAR(12) NOT NULL, toRecipient VARCHAR(12) NOT NULL, recordingUrl VARCHAR(256) NOT NULL, duration INT DEFAULT 0, localAudio VARCHAR(255) NOT NULL, transcript TEXT NOT NULL)'
  db.run(query);
}
