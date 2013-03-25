var mongoose = require('mongoose')

//schema

//schema
var scoreSchema = mongoose.Schema({date:'Date',hash:'String',handle:'String',email:'String',score:'Number'})
var questionSchema = mongoose.Schema({
    code:'String',
    formatted:'String',
    timesCorrect:'Number',
    timesIncorrect:'Number'
})
var settingsSchema = mongoose.Schema({
    advanceManually:'Boolean',
    questionsPerSet:'Number',
    timePerQuestion:'Number',
    timeBetweenSets:'Number',
    
})


var _Score = mongoose.model('score',scoreSchema)
var _Question = mongoose.model('question',questionSchema)
var _Settings = mongoose.model('settings',settingsSchema)

//Public constructors
module.exports = {
    Score:_Score,
    Question:_Question,
    Settings:_Settings,
    loadQuestions:function(callback){_loadQuestions(callback)},
    loadSettings:function(callback){_loadSettings(callback)},
    getTopScores:function(numberScores,callback){_getTopScores(numberScores,callback)}
    }


var _getTopScores = function(numberScores,callback){
    _Score.find({})
	.limit(numberScores)
	.sort({'score':-1})
	.exec(function(err,scores){
	    if(err){
    		console.error("Error loading leaderboard")
    		callback([])
	    }
	   callback(scores)
	})

}

var _loadQuestions = function(callback){
    _Question.find().exec(function(err,questions){
        if(err)
            console.log("error loading questions from mongo")
        callback(questions)
    })
}
 
var _loadSettings = function(callback){
    _Settings.find(function(err,questions){
	if(err)
	    console.log('error loading settings from mongo')
	//there should be only one game settings in the DB so load it
	callback(questions[0])
    })
}


