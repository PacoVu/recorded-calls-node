window.onload = init;

function init() {
  $( "#fromdatepicker" ).datepicker({ dateFormat: "yy-mm-dd"});
  $( "#todatepicker" ).datepicker({dateFormat: "yy-mm-dd"});
  var pastMonth = new Date();
  var day = pastMonth.getDate()
  var month = pastMonth.getMonth() - 1
  var year = pastMonth.getFullYear()
  if (month < 0){
    month = 11
    year -= 1
  }
  $( "#fromdatepicker" ).datepicker('setDate', new Date(year, month, day));
  $( "#todatepicker" ).datepicker('setDate', new Date());
}

function displayOnTable(response){
  $("#records_list").empty()
  var jsonObj = JSON.parse(response)
  for (var item of jsonObj){
    var id = document.createElement("td");
    id.text(item.id)
    var uri = document.createElement("td");
    uri.text(item.uri)
    $("#records_list").append(id)
    $("#records_list").append(uri)
  }
}

function readCallLogs(){
  var configs = {}
  configs['recordingType'] = $('#recordingType').val()
  configs['dateFrom'] = $("#fromdatepicker").val() + "T00:00:00.000Z"
  configs['dateTo'] = $("#todatepicker").val() + "T23:59:59.999Z"
  configs['perPage'] = 1000

  var url = "readlogs?access=" + $('#access_level').val();
  var posting = $.post( url, configs );
  posting.done(function( response ) {
    var res = JSON.parse(response)
    if (res.result != "ok") {
      alert(res.calllog_error)
    }else{
      window.location = "recordedcalls";
    }
  });
  posting.fail(function(response){
    alert(response.statusText);
  });
}

function transcribe(audioId){
  var configs = {}
  configs['audioSrc'] = audioId
  var url = "transcribe"
  var posting = $.post( url, configs );
  posting.done(function( response ) {
    var res = JSON.parse(response)
    if (res.status == "error") {
      alert(res.calllog_error)
    }else{
      $('#tt_' + audioId).html(res.result)
      $('#tt_' + audioId).show()
      $('#te_' + audioId).hide()
    }
  });
  posting.fail(function(response){
    alert(response.statusText);
  });
}
