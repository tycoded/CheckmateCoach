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

    const moveNotation = s + t;
    if (!isOpeningMove(moveNotation, moveCount)) {
      alert("That's not part of the chosen opening!");
      game.undo();
      board.position(game.fen());
      return 'snapback';
    }

    moveCount++;
    savePosition(game.fen());
    updateHistory(move);
    enforceOpening(moveNotation);
    analyzeMove();

    if (lockIfNeeded(moveCount)) {
      lockDevelopedPieces();
    }
  },
  onSnapEnd: () => board.position(game.fen())
});

if(localStorage.getItem("checkEngineFen")) game.load(localStorage.getItem("checkEngineFen"));

document.getElementById("openingSelect").addEventListener("change", e => {
  currentOpening = openingData[e.target.value];
  moveCount = 0;
  resetBoard();
  highlightMoves(currentOpening.highlight);
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
  document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
  document.querySelectorAll('.locked').forEach(el => el.classList.remove('locked'));
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
  const expected = currentOpening.moves[idx];
  if (mv !== expected) {
    alert("That's not part of the chosen opening!");
    game.undo();
    board.position(game.fen());
    moveCount--;
    return;
  }

  const square = expected.slice(2, 4); // get 'to' square
  const sqEl = document.querySelector(`.square-${square}`);
  if (sqEl) sqEl.classList.add('locked');

  if (moveCount === currentOpening.lockAfter) {
    alert("Opening development complete!");
  }
}

function highlightMoves(squares) {
  if (!squares || !Array.isArray(squares)) return;
  squares.forEach(sq => {
    const el = document.querySelector(`.square-${sq}`);
    if (el) el.classList.add("highlight");
  });
}

function isOpeningMove(move, count) {
  if (!currentOpening || !currentOpening.moves) return true;
  return move === currentOpening.moves[count];
}

function lockIfNeeded(count) {
  return currentOpening && count >= currentOpening.lockAfter;
}

function lockDevelopedPieces() {
  console.log("Locking developed pieces...");
  currentOpening.highlight.forEach(sq => {
    const el = document.querySelector(`.square-${sq}`);
    if (el) el.classList.add('locked');
  });
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
