var argv,
	port,
	mongoose,
	universalSocket,
	connect,
	urlrouter,
	http,
	io,
	app,
	server,
	sockets,
	gamestate;

argv = require('optimist').argv;

try{
	port = parseInt(argv.p, 10);
} finally {
	port = port || 8088;
}

//MongoDB Code
mongoose = require('mongoose');
universalSocket = require('./server/universal');

mongoose.connect('localhost','qimp')

//Connect middleware handles static file handling
connect = require('connect');
urlrouter = require('urlrouter');
http = require('http');
io = require('socket.io');

var app = connect()
	.use(connect.static(__dirname + '/html'))
	.use(connect.static(__dirname + '/js'))
	.use(connect.static(__dirname + '/css'))
	.use(connect.static(__dirname + '/img'));

//Socket.IO 
server = http.createServer(app).listen(port);
sockets = io.listen(server).sockets;

gamestate = require('./server/gamestate').createGameState();

sockets.on('connection',function(socket){
	universalSocket.initialize(socket,gamestate)
});

