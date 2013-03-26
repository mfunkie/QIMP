var schema = require('./schema'),
    crypto = require('crypto');

var Player = function(handle, email, socket){
    this.handle = handle;
    this.email = email;
    this.socket = socket;
    this.hash = crypto.createHash('md5').update((handle+email).toLowerCase()).digest('hex');
    this.currentScore = 0;
    this.joining = false;
    this.active = false;
    this.answered = false;
    return this;
};

var _saveGame = function(player,callback){
    score = new schema.Score({
        date: new Date(),
        hash: player.hash,
        handle: player.handle,
        email: player.email,
        score: player.currentScore
    });

    score.save(function(err){
        if(err)
           console.error("error saving score into mongo");
        callback();
    });
};

var _createPlayer = function(handle, email, socket){
    return new Player(handle, email, socket);
}

var _initializePlayer = function(socket, data, gs){
    var badPlayer = function(){
        socket.emit('token create',{error:'error creating token',token:null});
    }

    if(data.email == null || data.handle == null)
        badPlayer();

    var player = _createPlayer(data.handle,data.email,socket)
    
    gs.addPlayer(player, function(result){
        if(!result)
            badPlayer();
        else {
            socket.on('request join',function(data){
                if(data != null && data.hash != null)
                    gs.playerRequests(data.hash);
            });

            socket.on('answer question',function(data){
                if(data != data.hash != null || data.answer != null)
                    gs.playerAnswers(data.hash, data.answer);
            });

            socket.on('disconnect', function(){
                gs.removePlayer(player,function(){});
            });

            socket.emit('token create',{token:player.hash});
        }
    });
}

//public exports
module.exports = {
    createPlayer: function(handle, email, socket){
        return _createPlayer(handle, email, socket);
    },
    initialize: function(socket,data,gs){
        _initializePlayer(socket, data, gs);
    },
    saveGame: function(player,callback){
        _saveGame(player, callback);
    }
}