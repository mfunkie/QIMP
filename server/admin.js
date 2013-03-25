var gameState = null
//Exports

var Admin = {
    socket:null
}

module.exports = {
    initializeAdmin:function(socket,data, gs){_initializeAdmin(socket,data,gs)},
    gamestarted:function(socket,data){socket.emit('game started',data)},
    sendAnswer:function(admin,answer){admin.socket.emit('question over',answer)},
    playerConnected:function(admin,players){admin.socket.emit('player connected',players)},
    playerDisconnected:function(admin,players){admin.socket.emit('player disconnected',players)}
}


var _initializeAdmin = function(socket,data,gs){
    gameState = gs;
    var admin = Object.create(Admin)
    admin.socket=socket
    gameState.addAdmin(admin)
    socket.on('start game',function(data){
        gameState.startGame(function(){
            socket.emit('game starting')
        })
    })

    socket.on('start question',function(data){
        gameState.startQuestion();
    })

    socket.on('disconnect',function(){
	gameState.removeAdmin(admin)
	})

    socket.emit('authenticate successful',{})
}
