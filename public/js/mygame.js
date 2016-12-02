$(function(){
  console.log('jQuery');
  var board = ChessBoard('board1', 'start');
  var current = 0;

  var count = 1;
  var $ol = $('<ol id="movelist"></ol>');
  var movelist = $('.chessmove');
  var fenlist = $('.fenmove');
  for(var i = 0; i<movelist.length; i+=2){
    var $li = $('<li id="move'+count+'"></li>');
    $li.append(movelist[i]).append(', ').append(movelist[i+1]);
    $ol.append($li);
    count++;
  }
  $('#moves-section').append($ol);

  var currentmove = 0;
  var addEventListeners = function(){
    $('#startbtn').click(function(){
      board.start();
      currentmove = 0;
    });
    $('#nextbtn').click(function(){
      if(currentmove < fenlist.length-1)currentmove++;
      board.position($(fenlist[currentmove]).text());
      console.log($(movelist[currentmove-1]).text()+' : '+$(movelist[currentmove]).text());
    });
    $('#lastbtn').click(function(){
      if(currentmove > 0) currentmove--;
      board.position($(fenlist[currentmove]).text());
    });
    $('#endbtn').click(function(){
      currentmove = fenlist.length-1;
      board.position($(fenlist[currentmove]).text());
    });
  };
  addEventListeners();
});
