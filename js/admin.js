function AdminController($scope)
{
    $scope.currentSection = "console";
    $scope.socket = io.connect(document.baseURI.substring(0,document.baseURI.indexOf('/',7)));
    $scope.theLog = [];
    window.socket = $scope.socket;
    window.scope = $scope;

    $scope.start_clicked = function()
    {
        $scope.socket.emit("start game", {});
        $scope.log("start game clicked");
    }

    $scope.next_clicked = function()
    {

        $scope.socket.emit("start question", {your:"mom"});
        $scope.log("next question clicked");
    }

    $scope.log = function(toLog)
    {
        $scope.theLog.splice(0,0,toLog);
    }

    $scope.socket.on("game starting",function(data){
        $scope.log("game starting ", data);
        $scope.$apply();
    });

    $scope.socket.on('authenticate successful', function(data){
        $scope.log("authentication successful for admin");
        $scope.$apply();
    });

    $scope.socket.on('question start', function(data){
        $scope.log("question "+data.questionIndex+" starting");
        $scope.$apply();
    });

    $scope.socket.on('question over', function(data){
        $scope.log("question over, correct answer was "+data.answer);
        $scope.$apply();
    });

    $scope.socket.on('game over', function(data){
        $scope.log("game over");
        $scope.$apply();
    });

    $scope.socket.emit("authenticate");
    $scope.log("authenticating");
}