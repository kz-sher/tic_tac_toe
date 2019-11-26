//import library
var fs = require('fs')
         , http = require('http')
         , socketio = require('socket.io')
         , express = require('express')
         , path = require('path')
         , app = express();

//set directory path
app.use(express.static(path.join(__dirname, 'public')));

//set up server with port 8080
var server=http.createServer(app).listen(8080, function() {
            console.log('Listening at: http://localhost:8080');
 });

var usernum = 0; //total number of players
var game = []; //array of players'name
var room = [[]]; //2d array; inner array acts like a room allowing a maximum of 2 players.

//observe when a player connects to the server
socketio.listen(server).on('connection', function (socket) {
    
    //adding a player if his name is valid
    socket.on('add user', function(name, status){
        
        //name: username that user keys in
        //status: dc?
        //check if his name is valid
        if(game.indexOf(name) == -1 && name.length != 0 && name != ' '){
            socket.username = name;
            eachRoomSize = room.map(smallRoom => smallRoom.length); //Array of the sizes of each room
            emptyRoomnum = eachRoomSize.indexOf(0); //the first empty room
            halfRoomnum = eachRoomSize.indexOf(1); //the first room with 1 player
            
            //assign player to room
            if(halfRoomnum != -1){
                socket.roomnum = halfRoomnum;
            }
            else if(emptyRoomnum != -1){
                socket.roomnum = emptyRoomnum;
            }
            else{
                room.push([]);
                socket.roomnum = room.length - 1;
            }
            socket.join(socket.roomnum);
            room[socket.roomnum].push(socket.username);
            game.push(socket.username);
            usernum++;

            //allow player to login the game
            socket.emit('login',{
                username: socket.username,
                usernum: usernum,
                roomnum: socket.roomnum
            });
            
            //check whether the previous state of player is disconnected
            //if it is disconnected, then inform other players that this player is reconnected
            //else inform other players that this player joined the game
            if(status){
                socket.broadcast.emit('user rc',{
                    username: socket.username,
                    usernum: usernum,
                    roomnum: socket.roomnum
                })
            }
            else{
                socket.broadcast.emit('user joined', {
                    username: socket.username,
                    usernum: usernum,
                    roomnum: socket.roomnum
                });
            }
        }
        else{
            socket.emit('invalid username');
        }
    });
    
    //observe and check whether the room with given room number has 2 player
    //if it does, then allow game to begin
    socket.on('start game mou', function(num){
        
        //num: room number
        if(room[num].length == 2){
            socket.to(num).broadcast.emit('game start', [room[num], 'X', true]);
            socket.emit('game start', [room[num], 'O', false]);
        }
    });
    
    //observe a click on cells
    socket.on('td clicked', function(data){
        
        //data: an array of data - [cell position, marker, game board, stopper, username, room number, number of marked cells]
        //check whether game result is out
        //if it is not null, it means there is a player win the game
        //else if marked cells is 9 (all cells are marked), then inform both players that the result is "draw"
        var area = checkGame(data[2]);
        if(area != null){
            socket.to(data[5]).broadcast.emit('game over', area, 'lose');
            socket.emit('game over', area, 'win');
            data[3]=true;
        }
        else if(data[6] == 9){
            socket.to(data[5]).broadcast.emit('draw');
            socket.emit('draw');
            data[3]=true;
        }
        socket.to(data[5]).broadcast.emit('td clicked', data);
        socket.emit('td clicked',data);
    });
    
    //reset functionality
    socket.on('reset', function(num){
        
        //num: room number
        socket.to(num).broadcast.emit('reset');
    });
    
    //observe when players disconnect from server
    socket.on('disconnect', function () {
        //prevent null room number
        if(socket.roomnum === undefined){
            return;
        }

        usernum--;
        game = game.filter(player => player != socket.username);
        console.log(game);
        room[socket.roomnum] = room[socket.roomnum].filter(player => player != socket.username);
        
        //inform another player of that particular room that his opponent left the game
        socket.broadcast.emit('user left', {
            username: socket.username,
            usernum: usernum,
            roomnum: socket.roomnum
        });
        socket.to(socket.roomnum).broadcast.emit('reset');
    });
    
    //observe when players reconnect to the server
    // socket.on('reconnect',function(){
    //    usernum++;
    //    game.push(socket.username);
    // });
    
    //check whether game result is out
    function checkGame(board){
        
        //board: 2d array that indicates the game board 
        var col0 = {name:'c0', count:0} //1st column
            , col1 = {name:'c1', count:0} //2nd column
            , col2 = {name:'c2', count:0} //3rd column
            , row0 = {name:'r0', count:0} //1st row
            , row1 = {name:'r1', count:0} //2nd row
            , row2 = {name:'r2', count:0} //3rd row
            , diag = {name:'d', count:0} //diagonal
            , rdiag = {name:'k', count:0}; //reverse diagonal
        
        //check all combination of winning conditions in tic tac toe 
        for (var i = 0; i < 2; i++) {
            if(board[0][i]!='_' && board[0][i]==board[0][i+1]){
                row0.count++;
            }
            if(board[1][i]!='_' && board[1][i]==board[1][i+1]){
                row1.count++;
            }
            if(board[2][i]!='_' && board[2][i]==board[2][i+1]){
                row2.count++;
            }
            if(board[i][0]!='_' && board[i][0]==board[i+1][0]){
                col0.count++;
            }
            if(board[i][1]!='_' && board[i][1]==board[i+1][1]){
                col1.count++;
            }
            if(board[i][2]!='_' && board[i][2]==board[i+1][2]){
                col2.count++;
            }
            if(board[i][i]!='_' && board[i][i]==board[i+1][i+1]){
                diag.count++;
            }
            if(board[i][3-(i+1)]!='_' && board[i][3-(i+1)]==board[i+1][3-(i+2)]){
                rdiag.count++;
            }
        }
        var areaBar = [col0, col1, col2, row0, row1, row2, diag, rdiag];
        var area = areaBar.filter(x=>x.count==2);
        //if there is a result, return the variable's name
        if(area.length == 1){
            return area[0].name;
        }
        return null;
    }
});