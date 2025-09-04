import { Chessboard, INPUT_EVENT_TYPE, COLOR } from "/static/node_modules/cm-chessboard/src/Chessboard.js"
import { Accessibility } from "/static/node_modules/cm-chessboard/src/extensions/accessibility/Accessibility.js"
import { Markers } from "/static/node_modules/cm-chessboard/src/extensions/markers/Markers.js"
import { PromotionDialog } from "/static/node_modules/cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js"
import { Chess } from "/static/node_modules/chess.js/dist/esm/chess.js"

const chess = new Chess()

const stockfish = new Worker("/static/js/stockfish/stockfish.js");
const eloSlider = document.getElementById("elo-slider");
const eloRatingSpan = document.getElementById("elo-rating");
const resetButton = document.getElementById("reset-button");
const playAsBlackButton = document.getElementById("play-as-black-button");
const gameOverMessage = document.getElementById("game-over-message");
const moveList = document.getElementById("move-list");

let playerColor = COLOR.white;

function updateElo() {
    const elo = eloSlider.value;
    eloRatingSpan.textContent = `Elo: ${elo}`;
}

function updateMoveHistory() {
    moveList.innerHTML = "";
    const history = chess.history({ verbose: true });
    for (let i = 0; i < history.length; i += 2) {
        const moveNumber = i / 2 + 1;
        const whiteMove = history[i].san;
        const blackMove = history[i + 1] ? history[i + 1].san : "";
        const row = `<div class="grid grid-cols-3 gap-2">
            <div>${moveNumber}</div>
            <div>${whiteMove}</div>
            <div>${blackMove}</div>
        </div>`;
        moveList.innerHTML += row;
    }
}

function checkGameState() {
    let message = "";
    if (chess.isCheckmate()) {
        message = `Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins.`;
    } else if (chess.isStalemate()) {
        message = "Stalemate! The game is a draw.";
    } else if (chess.isDraw()) {
        message = "Draw! (50-move rule or insufficient material).";
    } else if (chess.isThreefoldRepetition()) {
        message = "Draw! (Threefold repetition).";
    }

    if (message) {
        gameOverMessage.textContent = message;
        gameOverMessage.classList.remove("hidden");
        board.disableMoveInput();
    } else {
        gameOverMessage.classList.add("hidden");
    }
}

stockfish.onmessage = function(event) {
    const message = event.data;
    if (message.startsWith("bestmove")) {
        const bestMove = message.split(" ")[1];
        const from = bestMove.substring(0, 2);
        const to = bestMove.substring(2, 4);
        const promotion = bestMove.length > 4 ? bestMove.substring(4) : undefined;
        chess.move({ from, to, promotion });
        board.setPosition(chess.fen(), true);
        updateMoveHistory();
        checkGameState();
        if (!chess.isGameOver()) {
            board.enableMoveInput(inputHandler, playerColor);
        }
    }
};

function makeEngineMove() {
    stockfish.postMessage(`position fen ${chess.fen()}`);
    stockfish.postMessage("go depth 5");
}

function isPromotion(move) {
    const piece = chess.get(move.from);
    if (!piece || piece.type !== 'p') {
        return false;
    }
    if (piece.color === 'w' && move.to.charAt(1) !== '8') {
        return false;
    }
    if (piece.color === 'b' && move.to.charAt(1) !== '1') {
        return false;
    }
    return true;
}

function inputHandler(event) {
    switch (event.type) {
        case INPUT_EVENT_TYPE.moveInputStarted:
            if (chess.turn() !== playerColor[0]) {
                return false;
            }
            const moves = chess.moves({square: event.squareFrom, verbose: true})
            event.chessboard.addLegalMovesMarkers(moves)
            return moves.length > 0
        case INPUT_EVENT_TYPE.movingOverSquare:
            return;
        case INPUT_EVENT_TYPE.validateMoveInput:
            const move = {from: event.squareFrom, to: event.squareTo, promotion: event.promotion}
            if (isPromotion(move)) {
                event.chessboard.showPromotionDialog(event.squareTo, playerColor, (result) => {
                    if (result.piece) {
                        const promotionMove = { from: event.squareFrom, to: event.squareTo, promotion: result.piece.charAt(1) };
                        const moveResult = chess.move(promotionMove);
                        if (moveResult) {
                            event.chessboard.setPosition(chess.fen(), true).then(() => {
                                updateMoveHistory();
                                checkGameState();
                                if (!chess.isGameOver()) {
                                    makeEngineMove();
                                }
                            });
                        }
                    }
                });
                return true;
            }
            const result = chess.move(move)
            if (result) {
                event.chessboard.state.moveInputProcess.then(() => { // wait for the move input process has finished
                    event.chessboard.setPosition(chess.fen(), true).then(() => { // update position, maybe castled and wait for animation has finished
                        updateMoveHistory();
                        checkGameState();
                        if (!chess.isGameOver()) {
                            makeEngineMove();
                        }
                    })
                })
            }
            return result
        case INPUT_EVENT_TYPE.moveInputFinished:
            // handle move here
            if(event.legalMove) {
                event.chessboard.disableMoveInput()
            }
            event.chessboard.removeLegalMovesMarkers()
            break
    }
}

const board = new Chessboard(document.getElementById("board"), {
    position: chess.fen(),
    assetsUrl: "/static/assets/",
    responsive: true,
    animationDuration: 300,
    extensions: [
        { class: Accessibility, props: { visuallyHidden: true } },
        { class: Markers },
        {class: PromotionDialog}
    ]
})
board.enableMoveInput(inputHandler, playerColor);

eloSlider.addEventListener("input", (event) => {
    stockfish.postMessage(`setoption name UCI_Elo value ${event.target.value}`);
    updateElo();
});

function resetGame(color = COLOR.white) {
    chess.reset();
    playerColor = color;
    board.setOrientation(color);
    board.setPosition(chess.fen(), true);
    gameOverMessage.classList.add("hidden");
    updateMoveHistory();
    if (color === COLOR.black) {
        board.disableMoveInput();
        makeEngineMove();
    } else {
        board.enableMoveInput(inputHandler, playerColor);
    }
}

resetButton.addEventListener("click", () => resetGame(COLOR.white));
playAsBlackButton.addEventListener("click", () => resetGame(COLOR.black));

stockfish.postMessage("setoption name UCI_LimitStrength value true");
stockfish.postMessage(`setoption name UCI_Elo value ${eloSlider.value}`);
updateElo();