var schema = require('./schema')
var crypto = require('crypto')
var gameState = null

var Player = {
    handle: null,
    email:null,
    socket : null,
    hash : null,
    currentScore : 0,
    joining : false,
    active : false,
    answered:false,
}


//public exports
module.exports = {
    createPlayer : function(handle,email,socket){return _createPlayer(handle,email,socket)},
    initialize:function(socket,data,gs){_initializePlayer(socket,data,gs)},
    saveGame:function(player,callback){_saveGame(player,callback);}
}


var _saveGame = function(player,callback){
    score = new schema.Score({date:new Date(),hash:player.hash,handle:player.handle,
			      email:player.email,score:player.currentScore})
    score.save(function(err){
	if(err)
	    console.error("error saving score into mongo")
	callback()
    })
}


var _createPlayer = function(handle,email,socket){
    play = Object.create(Player)
    play.handle = handle
    play.email = email
    play.socket = socket
    play.hash = crypto.createHash('md5').update((handle+email).toLowerCase()).digest('hex')
    return play
}


var _initializePlayer = function(socket,data,gs){
    gameState = gs;
    var badPlayer = function(){
	   socket.emit('token create',{error:'error creating token',token:null})
    }
    if(data.email == null || data.handle == null)
	   badPlayer()

    var player = _createPlayer(data.handle,data.email,socket)
    
    gameState.addPlayer(player,function(result){
    	if(!result)
    	    badPlayer()
    	else{
        	socket.on('request join',function(data){
        	    requestJoin(socket,data)
        	})
        	socket.on('answer question',function(data){
        	    answerQuestion(socket,data)
        	})
            socket.on('disconnect', function(){
		gameState.removePlayer(player,function(){})
                
            })
        	socket.emit('token create',{token:player.hash})
    	}
    })
}

var requestJoin = function(socket,data){
    if(data != null && data.hash != null)
	gameState.playerRequests(data.hash)
}

var answerQuestion = function(socket,data){
    if(data != data.hash != null || data.answer != null)
	gameState.playerAnswers(data.hash,data.answer)
}
