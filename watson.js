var watson = require('watson-developer-cloud');
var fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
var CALLS_DATABASE = './db/calllogs.db';

var speechToText = new watson.SpeechToTextV1({
  username: process.env.WATSON_USERNAME,
  password: process.env.WATSON_PWD,
  url: 'https://stream.watsonplatform.net/speech-to-text/api/'
});

var transcribe = function(res, id, srcFile){
  var thisRes = res
  var thisId = id
  var params = {
    model: 'en-US_NarrowbandModel',
    audio: fs.createReadStream(srcFile),
    content_type: 'audio/mp3',
    timestamps: true,
    interim_results: false,
    word_alternatives_threshold: 0.9,
    max_alternatives:1
  };

  speechToText.recognize(params, function(err, res) {
    if (err)
      console.log(err);
    else{
      var recogText = ""
      for (var result of res.results){
        recogText += result.alternatives[0].transcript + " ";
      }
      var text = recogText.replace(/"/, "'")
      text = text.replace(/%HESITATION /g, "")
      var query = "UPDATE calls SET transcript=\"" + text.trim() + "\" WHERE id=" + thisId;
      let db = new sqlite3.Database(CALLS_DATABASE);
      db.run(query, function(err, result) {
        if (err){
          console.error(err.message);
        }
      });
      var response = {}
      response['status'] = "ok"
      response['result'] = text
      thisRes.send(JSON.stringify(response))
    }
  });
}
module.exports.transcribe = transcribe
