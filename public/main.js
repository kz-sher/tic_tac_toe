$(function(){
        var socket = io.connect();
        var roomnum; //room number of the game the player enters
        var username; //player's name
        var mark; //player's marker ('X' or 'O')
        var marked; //the number of cells marked
        var turn; //tell whose turn
        var enermy; //player's enermy
        var start; //tell whether game begins
        var end; //tell whether game ends
        var dc; //disconnection status of the player
        var board = [['_','_','_'],
                     ['_','_','_'],
                     ['_','_','_']]; //empty game board
    
        //section from index.html by their ids or classes
        //hashtag = id
        //dot = class
        var $msg = $('#msgPart');
        var $msgLog = $('#msgLog');
        var $msgLogClosed = $('#msgLogClosed');
        var $msgLogMenuClose = $('#msgLogMenuClose');
        var $msgLogMenuOpen = $('#msgLogMenuOpen');
        var $loginPanel = $('#loginPanel');
        var $enermyName = $('.enermyName');
        var $playernum = $('.playernum');
        var $usernameInput = $('.usernameInputField');
        var $usernameButton = $('.usernameEnterButton');
        var $invalidName = $('.invalidName');
        var $progressBar = $('.bar');
        var $resetButton = $('.resetButton');
        
        //observe whether the name the player input is invalid
        socket.on('invalid username',function(){
            $usernameInput.val('');
            $progressBar.css('background-color', '#f4c20d');
            $invalidName.css('display', 'block');
        });
        
        //observe player login
        socket.on('login', function (user) {
            
            //user: an user object with some related properties
            $loginPanel.fadeOut();
            $enermyName.html('- - -');
            
            if(!dc){
                $msg.empty();
                start = false;
            }
            addMessages(user, 'You join');
            roomnum = user.roomnum;
            end = false;
            dc = false;
            marked = 0;
            if(!start){
                socket.emit('start game mou', roomnum);
            }
        });
        
        //observe other players joining the game regardless of rooms
        socket.on('user joined', function (user) {
            
            //user: an user object with some related properties
            addMessages(user, 'Others join');
        });
        
        //observe other players leaving the game regardless of rooms
        socket.on('user left', function (user) {
            
            //user: an user object with some related properties
            addMessages(user, 'Others left');
            if(user.roomnum == roomnum){
                $enermyName.html('- - -');
            }
        });
        
        //observe other players reconnecting the game regardless of rooms
        socket.on('user rc', function (user) {
            
            //user: an user object with some related properties
            addMessages(user, 'Others rc');
        });
        
        //observe when players'opponent clicks any of cells
        socket.on('td clicked',function(data){
            
            //data: an array of data - [cell position, marker, game board, stopper, username, room number, number of marked cells]
            if(data[4] == username){
                if(!data[3]){
                    addMessages(enermy, 'Others turn');
                }
            }
            else{
                var cell = $('.'+data[0]);
                board = data[2]
                marked++;
                cell.append($('<div>').addClass('marker').text(data[1]));
                if(!data[3]){
                    turn = true;
                    addMessages(null,'Your turn');
                }
            }
            
            if(marked == 9){
                $resetButton.html('New Game');
            }
        });
        
        //allow game to begin
        socket.on('game start',function(data){
            
            //data: an array of data - [cell position, marker, game board, stopper, username, room number, number of marked cells]
            enermy = data[0].filter(x=>x!=username)[0];
            start = true;
            mark = data[1];
            turn = data[2];
            addMessages(null, 'Start game');
            if(mark == 'X'){
                addMessages(null, 'Your turn');
            }
            else{
                addMessages(enermy, 'Others turn');
            }
            $enermyName.html(enermy);
        });
        
        //stop the game when result is out
        socket.on('game over', function(area, result){
            
            //area: highlighted cells for the result
            //result: win or lose
            var color;
            $resetButton.html('New Game');
            start = false;
            end = true;
            
            if(result == 'win'){
                color = '#3cba54';
                addMessages(null, 'You win')
            }
            else{
                color = '#db3236';
                addMessages(null, 'You lose')
            }
            
            for(var i = 0; i < 3; i++){
                var sign = area.slice(0,1);
                if(sign == 'r'){
                        $('.td'+area.slice(1,2)+i).css('background-color', color);
                    }
                else if(sign == 'c'){
                       $('.td'+i+area.slice(1,2)).css('background-color', color);
                }
                else if(sign == 'd'){
                       $('.td'+i+i).css('background-color', color);
                }
                else{
                       var j = 3-(i+1);
                       $('.td'+i+j).css('background-color', color);
                }
            }
        });
    
        //observe when nobody wins and loses the game
        socket.on('draw', function(){
           addMessages(null,"Draw"); 
        });
        
        //observe disconnection from server but still remain in the client side
        socket.on('disconnect', function(){
            dc = true;
            start = false;
            addMessages(null,'You dc');
            $enermyName.html('- - -');
        });
        
        //observe reconnection to server but the previous state still remain in the client side
        // socket.on('reconnect', function(){

        //     //prevent null username
        //     if (!username){
        //         return;
        //     }
        //     reset();
        //     addMessages(null,'You rc');
        //     socket.emit('add user', username, dc);
        // });
    
        //observe reset event to reset the game board
        socket.on('reset',function(){
            reset();
            socket.emit('start game mou', roomnum);
        });
        
        //detect click when enter button on the login page is pressed
        $usernameButton.click(function(){
            userLogIn();
        });
    
        //detect enter key pressed on the login page 
        $usernameInput.keypress(function(event){
            
            //event: action players interact with the computer
            if(event.which == 13){
                event.preventDefault();
                userLogIn();
            }
        });

        // sidebar on right side
        $msgLog.sidebar({side: "right"});
        $msgLogClosed.sidebar({side: "right"});
        if (window.screen.width > 800 ){
            $msgLog.trigger("sidebar:toggle");
        }
        else{
            $msgLogClosed.trigger("sidebar:toggle");
        }

        // toggle message log section
        $msgLogMenuClose.click(function(){
            $msgLog.trigger("sidebar:toggle");
            if (window.screen.width > 800 ){
                $("#board").css('width', window.screen.width - $msgLogClosed.width());
            }
        });

        $msgLogMenuOpen.click(function(){
            $msgLogClosed.trigger("sidebar:toggle");
            if (window.screen.width > 800 ){
                $("#board").css('width', window.screen.width - $msgLog.width());
            }
        });

        $msgLog.on("sidebar:closed", function(){
            $msgLogClosed.trigger("sidebar:toggle");
        })

        $msgLogClosed.on("sidebar:closed", function(){
            $msgLog.trigger("sidebar:toggle");
        })
        
        //detect reset button clicked on the game page
        $resetButton.click(function(){
            if((start || end) && !dc && marked != 0){
                reset();
                socket.emit('reset', roomnum);
            }
            else{
                addMessages(null, "Reset disabled")
            }
        });
    
        //detect click on cells
        $('td').click(function(){
            if(end){
                addMessages(null,'End game');
            }
            else if(!start){
                addMessages(null,'Waiting game');
            }
            else if(!turn){
                addMessages(null,'Not your turn');
            }
            else if($(this).html() == ''){
                $(this).append($('<div>').addClass('marker').text(mark));
                turn = false;
                marked++;
                var cellnum = $(this).attr('class');
                var stop = false;
                board[cellnum.slice(2,3)][cellnum.slice(3,4)] = mark;
                socket.emit('td clicked',[cellnum, mark, board, stop, username, roomnum, marked]);
            }
            else{
                addMessages(null,'Td selected');
            }
        });
        
        //a function that clears username input and performs progress animation
        function userLogIn(){
            username = $usernameInput.val();
            moveBar();
        }
        
        //a function that resets all related attributes and clears the game board
        function reset(){
            $resetButton.html('Reset');
            board = [['_','_','_'],
                    ['_','_','_'],
                    ['_','_','_']];
            end = false;
            start = false;
            marked = 0;
            
            if(mark == 'X'){
                turn = true;
            }
            else{
                turn = false;
            }
            $('td').empty();
            $('td').css('background-color', 'transparent');
            addMessages(null,'Reset');
        }
        
        //a function that add messages to game log according to the option given
        function addMessages(user, option){
            
            //user: an user object with some related properties
            //option: message's type
            if(option == 'You join'){
                $msg.append($('<li>').addClass('msgLine').text('You joined Room No.' + user.roomnum))
                $playernum.html(user.usernum);
            }
            else if(option == 'Others join'){
                $msg.append($('<li>').addClass('msgLine').text(user.username + ' joined Room No.' + user.roomnum))
                $playernum.html(user.usernum);
            }
            else if(option == 'Others left'){
                $msg.append($('<li>').addClass('msgLine').text(user.username + ' left Room No.' + user.roomnum))
                $playernum.html(user.usernum);
            }
            else if(option == 'Others rc'){
                $msg.append($('<li>').addClass('msgLine').text(user.username + ' reconnected to Room No.' + user.roomnum))
                $playernum.html(user.usernum);
            }
            else if(option == 'You dc'){
                $msg.append($('<li>').addClass('msgLine').text('You have been disconnected.'))
            }
            else if(option == 'You rc'){
                $msg.append($('<li>').addClass('msgLine').text('You have been reconnected.'))
            }
            else if(option == 'Waiting game'){
                $msg.append($('<li>').addClass('msgLinePending').text('Loading game...'))
            }
            else if(option == 'Start game'){
                $msg.append($('<li>').addClass('msgLineGame').text("<<< Game Start >>>"))
            }
            else if(option == 'End game'){
                $msg.append($('<li>').addClass('msgLineWarning').text("Press the reset button."))
            }
            else if(option == 'Td selected'){
                $msg.append($('<li>').addClass('msgLineWarning').text("Select an empty grid."))
            }
            else if(option == 'Your turn'){
                $msg.append($('<li>').addClass('msgLineWarning').text("Your turn."))
            }
            else if(option == 'Others turn'){
                $msg.append($('<li>').addClass('msgLineWarning').text(user + "'s turn."))
            }
            else if(option == 'Not your turn'){
                $msg.append($('<li>').addClass('msgLineWarning').text("It's not your turn."))
            }
            else if(option == 'Reset disabled'){
                $msg.append($('<li>').addClass('msgLineWarning').text("Game's not able to reset."))
            }
            else if(option == 'You win'){
                $msg.append($('<li>').addClass('msgLineGame').text("<<< Game Over >>>"))
                $msg.append($('<li>').addClass('msgLine').text("You won ! ! !"))
            }
            else if(option == 'You lose'){
                $msg.append($('<li>').addClass('msgLineGame').text("<<< Game Over >>>"))
                $msg.append($('<li>').addClass('msgLine').text("You lost..."))
            }
            else if(option == 'Draw'){
                $msg.append($('<li>').addClass('msgLineGame').text("<<< Game Over >>>"))
                $msg.append($('<li>').addClass('msgLine').text("Draw"))
            }
            else if(option == 'Reset'){
                $msg.append($('<li>').addClass('msgLineGame').text("<<< Game Reset >>>"))
            }
            else{
                $msg.append($('<li>').addClass('msgLine').text(option));
            }
            $('#msgLog').scrollTop($('#msgLog').get(0).scrollHeight);
        }
        
        //a function that shows progress animation on the login page
        //modified source code from www.w3schools.com 
        function moveBar() {
            $progressBar.css('visibility', 'visible');
            $progressBar.css('background-color', 'darkgray');
            var width = 1;
            var intervalID = setInterval(move, 5);
            function move() {
                if (width >= 100) {
                    clearInterval(intervalID);
                    socket.emit('add user', username, dc);
                } 
                else {
                    width++; 
                    $progressBar.css('width', width+'%');
                }
            }
        }
    });