$(function(){
  console.log('jQuery');
  var fenmoves = ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'], fengame;
  //**************** Chessboard Integration ****************************
  var board,
  game = new Chess();

  // onChange record fenPosition
  var onChange = function(oldpos, newpos){
    fenmoves.push(ChessBoard.objToFen(newpos));
    fengame = fenmoves.join('~');
    console.log(fengame);
    $('#fenlist').val(fengame);
  };

// do not pick up pieces if the game is over
// only pick up pieces for White
var onDragStart = function(source, piece, position, orientation) {
  if (game.in_checkmate() === true || game.in_draw() === true ||
    piece.search(/^b/) !== -1) {
    return false;
  }
};

var makeRandomMove = function() {
  var possibleMoves = game.moves();

  // game over
  if (possibleMoves.length === 0) return;

  var randomIndex = Math.floor(Math.random() * possibleMoves.length);
  game.move(possibleMoves[randomIndex]);
  board.position(game.fen());
};

var onDrop = function(source, target) {
  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  });

  // illegal move
  if (move === null) return 'snapback';

  // make random legal move for black
  window.setTimeout(makeRandomMove, 250);
};

// update the board position after the piece snap
// for castling, en passant, pawn promotion
var onSnapEnd = function() {
  board.position(game.fen());
};

var cfg = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd,
  onChange: onChange
};
board = ChessBoard('board1', cfg);
//**************** End Chessboard Integration********************
});
