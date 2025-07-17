const game = new Chess();
let openingData = null;
const stockfish = STOCKFISH();
stockfish.postMessage("uci");

let currentOpening = null;
let moveCount = 0;

// Load openings
fetch('openings.json').then(res => res.json()).then(data => openingData = data);

const board = Chessboard('board', {
  draggable: true,
  position: localStorage.getItem("checkEngineFen") || 'start',
  pieceTheme: piece => `https://chessboardjs.com/img/chesspieces/wikipedia/${piece}.png`,
  onDragStart: (s, p) => {
    if (game.game_over()) return false;
    return true;
  },
  onDrop: (s, t) => {
    let move = game.move({ from: s, to: t, promotion: 'q' });
    if (move === null) return 'snapback';

    moveCount++;
    savePosition(game.fen());
    updateHistory(move);
    enforceOpening(s + t);
    analyzeMove();
  },
  onSnapEnd: () => board.position(game.fen())
});

if(localStorage.getItem("checkEngineFen")) game.load(localStorage.getItem("checkEngineFen"));

document.getElementById("openingSelect").addEventListener("change", e => {
  currentOpening = openingData[e.target.value];
  moveCount = 0;
  resetBoard();
});

document.getElementById("resetBtn").onclick = resetBoard;
document.getElementById("clearSave").onclick = () => {
  localStorage.removeItem("checkEngineFen");
  resetBoard();
};

function resetBoard() {
  game.reset();
  board.start();
  moveCount = 0;
  document.getElementById("moveHistory").innerHTML = '';
}

function savePosition(fen) {
  localStorage.setItem("checkEngineFen", fen);
}

function updateHistory(move) {
  const li = document.createElement('li');
  li.innerText = move.san;
  li.onclick = () => {
    game.undo(); board.position(game.fen());
  };
  document.getElementById("moveHistory").appendChild(li);
}

function enforceOpening(mv) {
  if (!currentOpening) return;
  const idx = moveCount - 1;
  const expected = currentOpening.openingMoves[idx];
  if (mv !== expected) {
    alert("That's not part of the chosen opening!");
    game.undo();
    board.position(game.fen());
    moveCount--;
    return;
  }

  if (idx < currentOpening.completeAfter) {
    const sq = currentOpening.developmentSquares[idx];
    document.querySelector(`.square-${sq}`)
      .classList.add('locked');
  }

  if (moveCount === currentOpening.completeAfter) {
    alert("Opening development complete!");
  }
}

function analyzeMove() {
  stockfish.postMessage("position fen " + game.fen());
  stockfish.postMessage("go depth 15");
  stockfish.onmessage = msg => {
    if (msg.startsWith("info depth")) {
      const sc = msg.match(/cp (-?\d+)/);
      if (sc) {
        highlightLastMove(sc[1]);
      }
    }
  };
}

function highlightLastMove(score) {
  const last = game.history({ verbose: true }).pop();
  const color = score > 50 ? 'green' : score < -50 ? 'red' : 'orange';
  const sqTo = document.querySelector(`.square-${last.to}`);
  if(!sqTo) return;
  const ov = document.createElement('div');
  ov.className = `feedback ${color}`;
  sqTo.appendChild(ov);
}