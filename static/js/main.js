import { Chessboard, INPUT_EVENT_TYPE, COLOR } from "/static/node_modules/cm-chessboard/src/Chessboard.js"
import { Accessibility } from "/static/node_modules/cm-chessboard/src/extensions/accessibility/Accessibility.js"
import { Markers } from "/static/node_modules/cm-chessboard/src/extensions/markers/Markers.js"
import { PromotionDialog } from "/static/node_modules/cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js"
import { Chess } from "/static/node_modules/chess.js/dist/esm/chess.js"

const chess = new Chess()

const stockfish = new Worker("/static/js/stockfish/stockfish.js");
const eloSlider = document.getElementById("elo-slider");
const eloRatingSpan = document.getElementById("elo-rating");

function updateElo() {
    const elo = eloSlider.value;
    eloRatingSpan.textContent = `Elo: ${elo}`;
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
        board.enableMoveInput(inputHandler, COLOR.white);
    }
};

function makeEngineMove(chessboard) {
    stockfish.postMessage(`position fen ${chess.fen()}`);
    stockfish.postMessage("go depth 5");
}


function inputHandler(event) {
    switch (event.type) {
        case INPUT_EVENT_TYPE.moveInputStarted:
            const moves = chess.moves({square: event.squareFrom, verbose: true})
            event.chessboard.addLegalMovesMarkers(moves)
            return moves.length > 0
        case INPUT_EVENT_TYPE.movingOverSquare:
            return;
        case INPUT_EVENT_TYPE.validateMoveInput:
            const move = {from: event.squareFrom, to: event.squareTo, promotion: event.promotion}
            const result = chess.move(move)
            if (result) {
                event.chessboard.state.moveInputProcess.then(() => { // wait for the move input process has finished
                    event.chessboard.setPosition(chess.fen(), true).then(() => { // update position, maybe castled and wait for animation has finished
                        makeEngineMove(event.chessboard)
                    })
                })
            } else {
                // promotion?
                let possibleMoves = chess.moves({square: event.squareFrom, verbose: true})
                for (const possibleMove of possibleMoves) {
                    if (possibleMove.promotion && possibleMove.to === event.squareTo) {
                        event.chessboard.showPromotionDialog(event.squareTo, COLOR.white, (result) => {
                            console.log("promotion result", result)
                            if (result.type === PROMOTION_DIALOG_RESULT_TYPE.pieceSelected) {
                                chess.move({from: event.squareFrom, to: event.squareTo, promotion: result.piece.charAt(1)})
                                event.chessboard.setPosition(chess.fen(), true)
                                makeEngineMove(event.chessboard)
                            } else {
                                // promotion canceled
                                event.chessboard.enableMoveInput(inputHandler, COLOR.white)
                                event.chessboard.setPosition(chess.fen(), true)
                            }
                        })
                        return true
                    }
                }
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
board.enableMoveInput(inputHandler, COLOR.white);

eloSlider.addEventListener("input", (event) => {
    stockfish.postMessage(`setoption name UCI_Elo value ${event.target.value}`);
    updateElo();
});

stockfish.postMessage("setoption name UCI_LimitStrength value true");
stockfish.postMessage(`setoption name UCI_Elo value ${eloSlider.value}`);
updateElo();