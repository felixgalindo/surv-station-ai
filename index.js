const http = require('http');
const url = require('url');
const request = require('request');
const moment = require('moment-timezone');
const fs = require('fs');
const config = require('./config.js')
var sid = "";
var recDebounce = false;
var motionDebounce = false;

console.log("\n\nStarting surv-station-ai");

const requestListener = function (req, res) {
  console.log("Request Url :" ,req.url )
  res.writeHead(200);
  res.end();
  var q = url.parse(req.url, true);
  console.log("Path Name" ,q.pathname);
  if(motionDebounce == true) {
  	console.log("Motion Debounced");
  	return;
  }
	motionDebounce = true;
	startMotionDebounceTimer();
	try{
  		getSnapshot(sid, function(res, snapshot){
			getDeepStackPredictions(snapshot, function(res, err, predictions){
				var objectFound = false;
				if (res && predictions !== undefined){
					console.log('Predictions' , res, " ", predictions);
					predictions.forEach(function(item, index){
						if(item.confidence !== undefined &&
							item.label !== undefined && (item.label == 'person') && objectFound == false ){
							objectFound = true;
							console.log('Found ' + item.label + ' with ' , item.confidence, ' confidence ');
							console.log('Saving to: ' , snapshot);
							triggerRecording();
							fs.copyFile(__dirname + "/snapshots/" + snapshot, __dirname + "/captures/" + snapshot, function(err) { 
							  if (err) { 
							    console.log("Error Copying Snapshot Found:", err); 
							  } 
							  else { 
							    console.log("Snapshot copy complete"); 
							  } 
							}); 
							return;
						}
					});
				}
				console.log('Complete');
			});
		})
	}
	catch(err){
		console.log("Error: " , err);
	}
}

var authenticate = function() {
	console.log("Authencating with Surveillance Station ")
	sid = "";
	request(config.survStationUrl + '/webapi/auth.cgi?api=SYNO.API.Auth&method=Login&version=2&account=' + config.survStationUser + '&passwd='+ config.survStationPass +'&session=SurveillanceStation',
	 { json: true }, (err, res, body) => {
	  if (err) { return console.log(err); }
	  if(body.data !== undefined & body.data.sid !== undefined){
	  	sid = body.data.sid;
	  	console.log("SID: ", sid)
	  }
	  // console.log(body.url);
	  // console.log(body.explanation);
	});

}

var triggerRecording = function() {
    if(recDebounce == true) {
	  	console.log("Record Trigger Debounced");
	  	return;
  	}
	var triggerUrl = config.survStationUrl + "/webapi/entry.cgi?api=SYNO.SurveillanceStation.Webhook&method=Incoming&version=1&token=DHcehiGTX39WeGJKcwqchAVSKEPW0cJKsMRIWsi6twVpvdBYh95oGYCX079pQZUr";
	console.log("Trigerring recording")
	recDebounce = true;
	startRecDebounceTimer();
	request(triggerUrl, { json: true }, (err, res, body) => {
	  if (err) { return console.log(err); }
	  if(body !== undefined ){
			console.log("Trigger Recording resp: ", body);
		}
	 
	  // console.log(body.explanation);
	});
}
var getSnapshot = function(sid, cb){
	if(sid == ""){
		authenticate();
	}
    var now = new Date();
    var snapshot = "snapshot-" + moment(now).tz('America/Chicago').format('YYYY-MM-DD_THH-mm-ss_SSS') + ".jpg"
	var writeStream = fs.createWriteStream(__dirname + "/snapshots/" + snapshot);
	console.log("Getting snapshot with sid", sid);
	request.get(config.survStationUrl + '/webapi/entry.cgi?camStm=1&version=2&cameraId=1&api=%22SYNO.SurveillanceStation.Camera%22&method=GetSnapshot&_sid='+sid)
	.on('error', function(err) {
	    console.log("Error getting snapshot: ", err)
	    if(cb){
		    if(cb) cb(false,err);
		    return;
	    }
	})
	.on('response', function(res) {
	    console.log("getSnapshot res: ", res.statusCode)
	})
	.pipe(writeStream)
	.on('close', function (err) {
        console.log("Snapshot retrieved: ", snapshot)
	    if(cb) cb(true, snapshot);
	    return;
  
    })
	.on('error', function (err) {
        if (err){
        	console.log("Error piping file: ", err)
		    if(cb) cb(false,err);
		    return;
        }  
    });
}

var startRecDebounceTimer = function(){
	setTimeout(function(){
	recDebounce = false;
	console.log("Rec Trigger Debounce cleared");},config.recDebounceTime);
}

var startMotionDebounceTimer = function(){
	setTimeout(function(){
	motionDebounce = false;
	console.log("Motion Debounce cleared");},config.motionDebounceTime);
}

var getDeepStackPredictions = function (snapshot, cb){
	console.log("Getting Deep Stack Predictions for " , snapshot);
	var readStream = fs.createReadStream(__dirname + "/snapshots/" + snapshot);
	var options = {
    	image: readStream
	}
	request.post({url: config.deepVisionUrl, formData: options}, function (err, resp, body) {
		if (err) {
			console.log('Error!' , err);
			if(cb) cb(false,err);
			return;
		} else {
			console.log('Predictions for' , snapshot, " : " , body);
			if(cb) {
				if(JSON.parse(body).predictions == undefined) cb(false,"Error retrieving predictions");
				else cb(true,false,JSON.parse(body).predictions);
			}
		}
	});
}

// const server = https.createServer({
//   // key: fs.readFileSync('key.pem'),
//   // cert: fs.readFileSync('cert.pem')
// }, requestListener);
const server = http.createServer(requestListener);
server.listen(config.httpServerPort);

authenticate();