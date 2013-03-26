//imports
var schema = require('./schema'),
	async = require('async'),
	vm = require('vm'),
	playerModule = require('./player'),
	adminModule = require('./admin'),
	universalModule = require('./universal');

//Module Exports
module.exports = {
	createGameState: function(){
		var gs = Object.create(GameState);
		gs.init();
		return gs;
	}
}

var GameState = (function(){
	var self = {};

	//Object's Public Interface
	self.startGame = function(callback){
		self.deffer(async.apply(self._startGame,callback));
	};

	self.addPlayer = function(player,callback){
		self.deffer(async.apply(self._addPlayer,player,callback));
	};

	self.addAdmin = function(a){
		self.deffer(function(){
			self.admins.push(a);
		});
	};

	self.getPlayers = function(callback){
		self.deffer(async.apply(callback,self.players));
	};

	self.playerRequests = function(hash){
		self.deffer(async.apply(self._playerRequests,hash));
	};

	self.playerAnswers = function(hash,answerIndex,callback){
		self.deffer(async.apply(self._playerAnswers,hash,answerIndex,callback));
	};

	self.startQuestion = function(){
		self._startQuestion();
	};

	self.removePlayer = function(hash,callback){
		self.deffer(async.apply(self._removePlayer,hash,callback));
	};

	self.removeAdmin = function(admin){
		self.deffer(function(){
			for(var i = 0; i < self.admins.length; ++i){
				if(self.admins[i] == admin){
					self.admins.splice(i, 1);
					console.log("admin removed");
					return;
				}
			}
		});
	};

	self.init = function(){
		self._init()
	};

	//module internal objects and state
	self.players = []
	self.questionSet = null
	self.settings = null
	self.questions = null
	self.initialized = false
	self.gameRunning = false
	self.questionRunning = false
	self.currentQuestion = null
	self.questionTime = null
	self.admins = []

	var GameQuestion = function(body, bodyIndex, questionsIndex) {
		this.body = body;
		this.bodyIndex = bodyIndex;
		this.questionsIndex = questionsIndex;
		return this;
	}

	var QuestionBody = function(inputs, correctOutput, timePerQuestion){
		this.input = inputs;
		this.output = correctOutput;
		this.duration = self.settings.timePerQuestion;
		this.textQuestions = [];
		this.questionIndex = -1;
		this.questionCount = -1;
		return this;
	}

	//internal functions and logic

	//All calls must deffer until we've initialized
	self.deffer = function(callback){
		if(!self.initialized){
			async.nextTick(function(){self.deffer(callback)});
		} else{
			callback();
		}
	}

	self._getPlayers =  function(){
		return self.players.map(function(pl,idx,arr){
		    return {handle:pl.handle}
		})
	}

	self._getExternalPlayers = function(player){
		return {
			player: player.handle,
			players: self._getPlayers()
		};
	}

	self._removePlayer = function(player, callback){
		len = self.players.length
		var removedPlayer = null
		for(i=0;i<self.players.length;++i){
			if(self.players[i].hash == player.hash)
			{
				removedPlayer = self.players[i];
				self.players.splice(i, 1);
			}
		}

		if(removedPlayer != null){
			async.each(self.admins,function(admin,cb){
				adminModule.playerDisconnected(admin,self._getExternalPlayers(player));
				cb();
			});
		}

		callback();
	};

	//After finishing a question
	self._updateLocalLeaderboard = function(callback){
		leaderboard = self.players.map(function(vl,idx,pl){
			return {handle:vl.handle,score:vl.currentScore};
		});
	
		leaderboard.sort(function(a,b){
			return b.score - a.score;
		});
	
		async.each(self.players.concat(self.admins),
			function(person,cb){
				universalModule.updateLocalBoard(person,leaderboard);
				cb(null);
			},
			function(err){
				if(err)
					console.error("Error updating leaderboard")
				callback(null)
		});
	}

	//After finishing a game
	self._updateGlobalLeaderboard = function(callback){

		schema.getTopScores(10,function(scores){
			leaderboard = scores.map(function(vl,idx,arr){
				return {handle:vl.handle,score:vl.score}
			})
			//send it to every person
			async.each(self.players.concat(self.admins),
				function(person,cb){
					universalModule.updateGlobalBoard(person,leaderboard);
					cb(null);
				},
				function(err){
					if(err)
						console.error("error sending global leaderboard update")
					callback()
				}
			);
		});
	};

	//After the game finishes
	self._gameOver = function(terminateEarly){
		if(terminateEarly){
			//Do some cleanup here
			return
		}

		plys = self.players.filter(function(vl,idx,arr){return vl.active})

		//update the player scores
		async.each(
			plys,
			function(player, callback){
				playerModule.saveGame(player, function(){
					player.currentScore = 0;
					player.active = false;
					callback();
				});
			},
			function(error){
				if(error)
					console.error("Error saving players into mongo")
			}
		);

		//save the questions to update their statistics
		async.parallel(
			self.questions.map(function(vl,idx,arr){
				return function(callback){
					vl.save(function(error){
						if(error){
							console.error("error saving question")
							console.error(error)
						}
						callback()
					})
				}
			}),
			function(err){
				if(err)
					console.error("error parallel saving questions")
				self._updateGlobalLeaderboard(function(){
					self.currentQuestion = null;
					self.questionSet = null;
					self.gameRunning = false;
					async.each(plys.concat(self.admins),
						function(person,cb){
							universalModule.gameOver(person,{})
						}
					);
				});
			}
		);
	}

	self._finishQuestion = function(){
		var answerObj = {answer:self.currentQuestion.bodyIndex};
		pls = self.players.filter(function(vl,idx,arr){return vl.active});
		async.series(
			[
				//async each the answer to each player
				function(callback){
					async.each(pls.concat(self.admins),
						function(person,callback){
							universalModule.questionOver(person,answerObj);
							callback();
						},
						function(err){
							if(err)
								console.error("error sending finish question");
							callback(null);
						}
					);
				},
				//update the leaderboard asyhnc
				function(callback){
					self._updateLocalLeaderboard(callback);
				}
			],
			function(err,reults){
				//finish off cleaning up and fixing statuses
				self.currentQuestion = null;
				self.questionRunning = false;
				//If we're out of questions, this game is over
				if(self.questionSet.length == 0)
					self._gameOver(false);
			}
		);
	}

	self._startQuestion = function(){
		console.log("starting question");
		//If we're running a question, don't do anything
		if(self.questionRunning)
			return;

		//If we're out of questions, ignore this
		if(self.questionSet == null)
			return;

		self.currentQuestion = self.questionSet.pop()
		if(self.currentQuestion == null)
			return;

		self.questionRunning = true;

		pls = self.players.filter(function(vl,idx,arr){
			if(vl.active){
				vl.answered = false;
				return true;
			}
			return false;
		});

		//distribute the question
		async.each(pls.concat(self.admins),
			function(person,callback){
				universalModule.questionStart(person,self.currentQuestion.body);
				callback();
			},
			function(err){
				if(err)
					console.error("error sending the question");
			}
		);

		self.questionTime = new Date();

		//wait the appropriate amount of time
		setTimeout(self._finishQuestion, self.settings.timePerQuestion * 1000)
	}

	self._addPlayer = function(player,callback){
		for(var i = 0 ; i < self.players.length;++i){
			if(self.players[i].hash == player.hash){
				self.players.splice(i,1);
				break;
			}
		}

		self.players.push(player);
		schema.getTopScores(10,function(scores){
			leaderboard = scores.map(function(vl,idx,arr){
				return {handle:vl.handle,score:vl.score}
			});
			universalModule.updateGlobalBoard(player,leaderboard);
		});
		async.each(self.admins,
			function(admin,cb){
				adminModule.playerConnected(admin,self._getExternalPlayers(player));
				cb(null)
			},
			function(error){
				if(error)
					console.error("error sending admin update")
				callback(true)
			}
		);
	};

	self._playerRequests = function(hash){
		var player = self._getPlayer(hash);
		if(player != null){
			player.joining = true;
			console.log("Player joined: " + player.handle);
		}
	}

	self._startGame = function(callback){
		if(self.gameRunning){
			callback(false);
			return;
		}
		self.gameRunning = true;

		async.series(
			[self._createQuestionSet, self._initializePlayers],
			function(err,obj){
				if(err)
					console.error("failed to start game");
				callback();
			}
		);
	}

	//Loop through all the players and include them in the game
	self._initializePlayers = function(callback){
		async.each(self.players,
			function(player,callback){
				if(player.joining){
					player.joining = false;
					player.active = true;
					player.currentScore = 0;
				}
				callback(null);
			},
			function(err){
				console.log("initialized players");
				if(err){
					console.error("Failed to start player game");
					callback('Error in initialize players');
				}
				callback();
			}
		);
	}

	//This generates a set of questions
	self._createQuestionSet =  function(callback){
		console.log("start generating questions");

		//http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
		//In place fisher yates shuffle
		var shuffle= function(arr){
			for(i = 0;i<arr.length;++i){
				var j = Math.floor(i*Math.random(i+1));
				var a = arr[i];
				arr[i] = arr[j];
				arr[j] = a;
			}
		}

		//Get a random set of questions to be our correct answers
		var getCorrectIndexes = function(){
			indexes = [];
			for(i=0;i<self.questions.length;++i){
				indexes.push(i);
			}
			shuffle(indexes);
			return indexes.splice(0,self.settings.questionsPerSet);
		}

		//Takes a correct index, generates an output
		var generateQuestions = function(index, cb){
			console.log("generating question %s", index)

			//temporary, we need to decide how many inputs/outputs
			inputs = [];
			for (i = Math.max(Math.floor(Math.random()*11),2);i > 0; --i)
				inputs.push(Math.floor(Math.random()*10+1));

			console.log("Inputs look like this:");
			console.log(inputs);

			//contexted needed for the VM call
			var context = vm.createContext({input:inputs});
			var functionTemplate = "(function(input) { middle })";
			var renderedFunction = eval(functionTemplate.replace("middle",self.questions[index].code));
			var correctOutput = renderedFunction(inputs);

			totalQuestions = self.questions.length;
			body = new QuestionBody(inputs, correctOutput, self.settings.timePerQuestion);
			tempArray = [];
			for(i = 0;i<3;++i){
				var j = Math.floor(Math.random() * totalQuestions);
				var subRenderedFunction = eval(functionTemplate.replace("middle",self.questions[j].code));
				//We can't repeat the question 
				//we also can't have the outputs be ambiguous
				if(j != index &&
					subRenderedFunction(inputs) != correctOutput &&
					tempArray.indexOf(j) < 0
				){
					tempArray.push(j)
					body.textQuestions.push(self.questions[j].formatted)
					continue
				}
				i -=1
			}

			//we need to randomly insert the correct question into the body
			correctPosition = Math.floor(Math.random()*4)
			body.textQuestions.splice(correctPosition, 0, self.questions[index].formatted);
			var gameQuestion = new GameQuestion(body, correctPosition, index);

			console.log("done generating question %s", index);

			cb(null, gameQuestion);
		}

		console.log("still generating questions");

		var indexes = getCorrectIndexes();
		async.map(indexes, generateQuestions, function(err,newSet){
			console.log("generated questions nearly complete");
			if(err)
				console.error("failed to generate questions");
			len = newSet.length;
			for(i = 0; i < len; ++i){
				newSet[i].body.questionIndex = len-i-1;
				newSet[i].body.questionCount = len;
			}

			self.questionSet = newSet;

			console.log("generated questions");
			callback(null);
		});
	}

	self._getPlayer = function(hash){
		for(var i = 0; i < self.players.length; ++i){
			if(self.players[i].hash == hash){
				return self.players[i];
			}
		}
		return null;
	}

	self._playerAnswers = function(hash,answerIndex){
		//no sense in searching for a player if the question isn't valid anymore
		if(self.questionSet == null || !self.questionRunning)
			return

		var currentTime = new Date();

		var points = 0;
		var player = self._getPlayer(hash);
		if(player == null || player.answered)
			return;

		player.answered = true;
		if(answerIndex == self.currentQuestion.bodyIndex){
			//100 points per question, decreasing with every second that passes by
			var timeDiff = (currentTime.getTime() - self.questionTime.getTime()) / (1000 * self.settings.timePerQuestion)
			points = (Math.round(100 * (1 - timeDiff)))

			self.questions[self.currentQuestion.questionsIndex].timesCorrect += 1
			player.currentScore += points
		}
		else{
			self.questions[self.currentQuestion.questionsIndex].timesIncorrect += 1;
		}
	}

	//self initialise and load settings and question collection

	self._init = function(){
		universalModule = require('./universal');
		//these need to complete before the module is initialized
		async.parallel(
			[
				function(callback){
					schema.loadSettings(function(settingsObj){
						self.settings = settingsObj;
						callback(null);
					});
				},
				function(callback){
					schema.loadQuestions(function(questionsArr){
						self.questions = questionsArr;
						callback(null);
					});
				}
			],
			function(err){
				if(err)
					console.error("error initializing game state")
				self.initialized = true;
			}
		);
	};

	return self;

})();

