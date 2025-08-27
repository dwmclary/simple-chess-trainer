import { Chessboard, INPUT_EVENT_TYPE, COLOR } from "/static/node_modules/cm-chessboard/src/Chessboard.js"
import { Accessibility } from "/static/node_modules/cm-chessboard/src/extensions/accessibility/Accessibility.js"
import { Markers } from "/static/node_modules/cm-chessboard/src/extensions/markers/Markers.js"
import { PromotionDialog } from "/static/node_modules/cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js"
import { Chess } from "/static/node_modules/chess.js/dist/esm/chess.js"

const chess = new Chess()
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

board.enableMoveInput((event) => {
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
})