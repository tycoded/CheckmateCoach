const game = new Chess();
const savedFen = localStorage.getItem("checkEngineFen");

const board = Chessboard('board', {
  draggable: true,
  position: savedFen || 'start',
  pieceTheme: piece => `https://chessboardjs.com/img/chesspieces/wikipedia/${piece}.png`,
  onDragStart: (source, piece) => {
    if (game.game_over() || (game.turn() === 'w' && piece.startsWith('b')) ||
        (game.turn() === 'b' && piece.startsWith('w'))) {
      return false;
    }
  },
  onDrop: (source, target) => {
    const move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';
    savePosition(game.fen());
  },
  onSnapEnd: () => {
    board.position(game.fen());
  }
});

if (savedFen) game.load(savedFen);

function savePosition(fen) {
  localStorage.setItem("checkEngineFen", fen);
}

document.getElementById("resetBtn").addEventListener("click", () => {
  game.reset();
  board.start();
  savePosition(game.fen());
});

document.getElementById("clearSave").addEventListener("click", () => {
  localStorage.removeItem("checkEngineFen");
  game.reset();
  board.start();
});