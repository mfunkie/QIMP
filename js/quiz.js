function QuizController($scope)
{
    $scope.currentSection = "join";
    $scope.scores = null;
    $scope.leader_board = null;
    $scope.socket = io.connect(document.baseURI);
    $scope.email_regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    $scope.email = "";
    $scope.handle = "";
    $scope.gameStarting = false;
    $scope.remember_creds = false;
    $scope.valid_token = false;
    $scope.try_to_join = false;
    $scope.time_expired = false;
    window.scope = $scope; //TODO: remove this before release

    $scope.join_clicked = function() {
        if($scope.valid_token)
        {
            $scope.limbo_init();
            $scope.socket.emit("request join", {hash: $scope.token});
        }
        else if($scope.credentials_are_valid())
        {
            $scope.limbo_init();
            $scope.try_to_join = true;
            $scope.socket.emit("request token",{email:$scope.email, handle:$scope.handle});
        }
    }

    $scope.leader_board_clicked = function() {
        if($scope.credentials_are_valid())
        {
            $scope.currentSection = "scores";
            $scope.socket.emit("request token",{email:$scope.email, handle:$scope.handle});
        }
    }

    $scope.credentials_are_valid = function() {
        var valid = true;
        if($scope.handle.length < 3) valid = false;
        if(!$scope.email_regex.test($scope.email)) valid = false;
        return valid;
    }

    $scope.option_selected = function(index) {
    	if($scope.selectedIndex == -1 && !$scope.time_expired)
    	{
    		$scope.selectedIndex = index;
            $scope.socket.emit("answer question",{answer:index, hash:$scope.token});
    	}
    }

    $scope.option_is_selected =  function(index, invert) {
        if($scope.selectedIndex == -1) return false; //nothing is selected
        if(invert)
        {
            return index != $scope.selectedIndex;
        } else {
            return index == $scope.selectedIndex;
        }
    }

    $scope.option_is_correct =  function(index, invert) {
        if(-1 == $scope.correctAnswer) return false; //we don't know the answer
        if(invert)
        {
            return (index != $scope.correctAnswer);
        } else {
            return index==$scope.correctAnswer;
        }
    }

    $scope.show_current_scores = function() {
        return ($scope.scores != null) && ($scope.scores.length > 0);
    }

    $scope.is_current_section = function(name) {
        //The only point of this function is to
        //  remove the logic from the UI
        return name == $scope.currentSection;
    }

    $scope.question_init = function(question) {
        $scope.currentSection = "question";
        $scope.question = question;
        $scope.selectedIndex = -1;
        $scope.correctAnswer = -1;
        $scope.time_expired = false;
        $scope.timer_init(new Date());
    }

    $scope.timer_init = function(startTime) {
        $scope.startTime = startTime;
        $scope.progressBar = $("#progressbar");
        $scope.progressBarLabel = $("#progressbarlabel");

        if(typeof($scope.timer_interval) == "undefined")
        {
            $scope.timer_interval = setInterval($scope.timer_callback,100);
        }
    }

    $scope.timer_callback = function() {
        var currentTime = new Date();
        var timeDiff = ($scope.startTime - currentTime);
        var timeout = $scope.question.duration * 1000;
        var timeRemaining = timeout+timeDiff;

        if(timeRemaining < 0) {
            $scope.time_expired = true;
            return; //time expired, stop updating both
        }

        percentRemaining = Math.round((timeRemaining * 100)/timeout);

        $scope.progressBarLabel.text(Math.round(timeRemaining / 1000) + " seconds remaining")
        
        if($scope.selectedIndex != -1) return; //option selected, stop bar
        $scope.progressBar.progressbar({value:percentRemaining});
    }

    $scope.limbo_init = function() {
        $scope.currentSection = "limbo";
        if(typeof($scope.limbo_interval) != "undefined") return; //only need to set once
        //Cycle through boxes. Possibly over complex but we can change the text w/out
        //  changing the code.
        $scope.limbo_current = $(".limbobox").first();
        $scope.limbo_interval = setInterval(function(){
            $scope.limbo_current.fadeOut().fadeIn();
            var next = $scope.limbo_current.next();
            if(next.length == 0) next = $scope.limbo_current.siblings().first();
            $scope.limbo_current = next;
        }, 1000);
    }

    /*   There are guides out there that describe how to properly wrap the socket
     *   code for Angular but the only thing that really needs to happen differently
     *   is that apply get's called at the end. Hopefully this code is a little more
     *   readable than that stuff.
     */
    $scope.on = function(eventName, callback) {
        $scope.socket.on(eventName, function(data) {
            callback(data);
            $scope.$apply();
        })
    }

    $scope.on("token create",function(data) {
        $scope.token = data.token;
        $scope.valid_token = true;
        if($scope.try_to_join)
        {
            $scope.try_to_join = false;
            $scope.socket.emit("request join", {hash: $scope.token});
        }     
    });

    $scope.on("question start", function(data){
        $scope.question_init(data);
    });

    $scope.on("question over", function(data){
        $scope.correctAnswer = data.answer;
    });

    $scope.on("game starting", function(data){
        $scope.gameStarting = true;
    });

    $scope.on("game over", function(data){
        $scope.gameStarting = false;
        $scope.currentSection = "scores";
    });

    $scope.on("update global board", function(data){
        $scope.leader_board = data;
    });

    $scope.on("update current board", function(data){
        $scope.scores = data;
    });

    $scope.on("disconnect", function(data){
        alert("You've been disconnected from the server, please refresh the page to attempt to reconnect");
        $("body").css("opacity",0.5);
    });

    if(typeof(window.localStorage) != 'undefined')
    {
        if(localStorage.getItem("remember_creds")) {
            $scope.handle = localStorage.getItem("handle");
            $scope.email = localStorage.getItem("email");
            $scope.remember_creds = true;
        }
        $scope.$watch('remember_creds', function(newValue,oldValue) {
            localStorage.setItem("remember_creds", newValue);
        });

        $scope.$watch('handle', function(newValue,oldValue) {
            localStorage.setItem("handle", newValue);
        });
        $scope.$watch('email', function(newValue,oldValue) {
            localStorage.setItem("email", newValue);
        });
    }
}