

var argv = require('optimist').argv

var port = null

try{
    port = parseInt(argv.p)
    if(isNaN(port))
	port = 8088
}catch(err){
    port =8088
}


//MongoDB Code
var mongoose = require('mongoose')
var universalSocket = require('./server/universal')

mongoose.connect('localhost','qimp')


//Connect middleware handles static file handling
var connect = require('connect')
, urlrouter = require('urlrouter')
, http = require('http') 
, io = require('socket.io')
var app = connect()
    .use(connect.static(__dirname + '/html'))
    .use(connect.static(__dirname + '/js'))
    .use(connect.static(__dirname + '/css'))
    .use(connect.static(__dirname + '/img'));

//Socket.IO 
var server = http.createServer(app).listen(port)
var sockets = io.listen(server).sockets;

var gamestate = require('./server/gamestate').createGameState()
 
sockets.on('connection',function(socket){
    universalSocket.initialize(socket,gamestate)
})

