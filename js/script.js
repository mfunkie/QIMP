function GameScript()
{
    var $$this = this;
    $$this.socket = io.connect(document.baseURI.substring(0,document.baseURI.indexOf('/',7)),{
	'reconnect': false,
	'max reconnection attempts': 0
    });
    $$this.adminSocket = io.connect(document.baseURI.substring(0,document.baseURI.indexOf('/',7)),{
	'reconnect': false,
	'max reconnection attempts': 0
    });

    $$this.adminSocket.on('authenticate successful', function(data){
	console.log("authentication successful for admin");
	console.log('start game',{});
	$$this.adminSocket.emit('start game',{});
    });

    $$this.adminSocket.on('game starting', function(data){
	console.log("game starting");
	console.log('start question');
	$$this.adminSocket.emit('start question',{});
    });
    
    $$this.socket.on('token create', function(data){
	console.log('token create %s', data.token);
	$$this.token = data.token;
	console.log('request join');
	$$this.socket.emit('request join', {hash:$$this.token});
    });
    
    $$this.socket.on('update current board', function(data){
	console.log('update current board', data);
    });
    
    $$this.socket.on('update global board', function(data){
	console.log('update global board', data);
    });
    
    $$this.socket.on('question start', function(data){
	console.log('question start', data);
	console.log('answer question',{answer:0, hash:$$this.token});
	$$this.socket.emit('answer question',{answer:0, hash:$$this.token});
    });
    
    $$this.socket.on('question over', function(data){
	console.log('question over', data);
	setTimeout(function() {
	    $$this.adminSocket.emit('start question',{});
	    console.log('start question');
	},5000);
    });
    
    $$this.socket.on('game over', function(data){
	console.log('game over', data);
    });

    $$this.adminSocket.on('player connected',function(data){
	console.log('player connected',data)
	});

    $$this.adminSocket.on('player disconnected',function(data){
	console.log('player disconnecting',data)
    });

    $$this.socket.on('disconnect', function(){
	//TODO: change screen to disconnected message
	console.log('server disconnected');
    })

    $$this.adminSocket.on('disconnect', function(){
	//TODO: change screen to disconnected message
	console.log('server disconnected');
    })

    $$this.socket.emit('request token', {handle:'Jake Coogle', email:'jake+script@boomtownroi.com'});
    $$this.adminSocket.emit('authenticate',{});

    return $$this;
}
