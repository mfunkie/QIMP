var player = require('./player'),
    admin = require('./admin');
//Exports

module.exports = {
    initialize:function(socket,gameState){
        _initializeUniversal(socket,gameState);
    },
    questionStart:function(person,question){
        person.socket.emit('question start',question);
    },
    updateLocalBoard:function(person,boardData){
        person.socket.emit('update current board',boardData);
    },
    updateGlobalBoard:function(person,boardData){
        person.socket.emit('update global board',boardData);
    },
    questionOver:function(person,answer){
        person.socket.emit('question over',answer);
    },
    gameOver:function(person,gameData){
        person.socket.emit('game over',gameData);
    }
}

var _initializeUniversal = function(socket,gameState){
    socket.on('request token',function(data){
        player.initialize(socket,data,gameState)
    });
    socket.on('authenticate',function(data){
        admin.initializeAdmin(socket,data,gameState)
    });
};

