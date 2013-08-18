var gameState = null,
    _initializeAdmin;

_initializeAdmin = function(socket,data,gs){
    gameState = gs;

    gameState.addAdmin({ socket: socket });
    
    socket.on('start game',function(data){
        gameState.startGame(function(){
            socket.emit('game starting')
        });
    })

    socket.on('start question',function(data){
        gameState.startQuestion();
    });

    socket.on('disconnect',function(){
        gameState.removeAdmin(admin)
    });

    socket.emit('authenticate successful',{});
}

module.exports = {
    initializeAdmin: function(socket,data, gs){
        _initializeAdmin(socket,data,gs);
    },
    gamestarted: function(socket,data){
        socket.emit('game started',data);
    },
    sendAnswer: function(admin,answer){
        admin.socket.emit('question over',answer);
    },
    playerConnected: function(admin,players){
        admin.socket.emit('player connected',players);
    },
    playerDisconnected: function(admin,players){
        admin.socket.emit('player disconnected',players)
    }
}