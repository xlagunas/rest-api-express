var express = require('express'),
  mongoskin = require('mongoskin'),
  bodyParser = require('body-parser'),
  schedule = require('node-schedule'),
  parser = require('./basquetParser');

var app = express();
var serverAddress = "http://localhost";
var serverPort = 3000;
app.use(bodyParser({limit: '50mb'}));

var db = mongoskin.db('mongodb://localhost:27017/uaa', {safe:true});

app.param('collectionName', function(req, res, next, collectionName){
  req.collection = db.collection(collectionName);
  return next()
});

app.get('/', function(req, res, next) {
  res.send('please select a collection, e.g., /collections/messages')
});

app.get('/collections/:collectionName', function(req, res, next) {
//  req.collection.find({} ,{limit: 10, sort: {'_id': -1}}).toArray(function(e, results){
  req.collection.find({} ,{sort: {'name': 1}}).toArray(function(e, results){
    if (e) return next(e);
    res.send(results)
  })
});

app.post('/collections/:collectionName', function(req, res, next) {
  req.collection.insert(req.body, {}, function(e, results){
    if (e) return next(e);
    res.send(results)
  })
});

app.get('/collections/:collectionName/:id', function(req, res, next) {
  req.collection.findById(req.params.id, function(e, result){
    if (e) return next(e);
    res.send(result)
  })
});

app.put('/collections/:collectionName/:id', function(req, res, next) {
  req.collection.updateById(req.params.id, {$set: req.body}, {safe: true, multi: false}, function(e, result){
    if (e) return next(e);
    res.send((result === 1) ? {msg:'success'} : {msg: 'error'})
  })
});

app.delete('/collections/:collectionName/:id', function(req, res, next) {
  req.collection.removeById(req.params.id, function(e, result){
    if (e) return next(e);
    res.send((result === 1)?{msg: 'success'} : {msg: 'error'})
  })
});

app.post('/collections/:collectionName/import', function(req, res, next) {
    var data = req.body;
    data.length;
    if (req.collection._collection_args[0] === 'franchise'){
        req.collection.remove({}, {}, function(e, results){
            if (e) return next(e);
            console.log(results);
        });
        req.collection.insert(data, {}, function(e, results){
           if (e) return next(e);
           res.send(results);
       })
    } else
        res.send('Can\'t import data to that collection');
});

app.listen(serverPort);

var rule = new schedule.RecurrenceRule();
rule.hour = 4;
rule.minute = 30;
rule.second = 25;

var j = schedule.scheduleJob(rule, function() {
    console.log("parsing data..." +new Date());
    parser.asyncRequests(serverAddress+":"+serverPort+'/collections/franchise/import');
    console.log("parse data..." +new Date());
});