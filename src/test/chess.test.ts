import assert from 'node:assert'
import Chess from '../games/chess'

describe('chess board', function () {
  const makeEmptyState = (): Chess.BoardState => Array(64).fill(null)

  it('initializes a standard 32-piece board', function () {
    const board = new Chess.Board()
    const pieces = board.state.filter((piece) => piece !== null)

    assert.strictEqual(board.state.length, 64)
    assert.strictEqual(pieces.length, 32)
    assert.deepStrictEqual(board.getPieceAt(0), { type: 'rook', color: Chess.PieceColor.Black })
    assert.deepStrictEqual(board.getPieceAt(4), { type: 'king', color: Chess.PieceColor.Black })
    assert.deepStrictEqual(board.getPieceAt(60), { type: 'king', color: Chess.PieceColor.White })
    assert.deepStrictEqual(board.getPieceAt(63), { type: 'rook', color: Chess.PieceColor.White })
  })

  it('reads pieces by index and by row/col', function () {
    const board = new Chess.Board()

    assert.deepStrictEqual(board.getPieceAt(7, 4), { type: 'king', color: Chess.PieceColor.White })
    assert.deepStrictEqual(board.getPieceAt(0, 3), { type: 'queen', color: Chess.PieceColor.Black })
    assert.strictEqual(board.getPieceAt(3, 3), null)
  })

  it('converts positions and indices from chess notation', function () {
    const board = new Chess.Board()

    assert.deepStrictEqual(board.getPosition('a8'), [0, 0])
    assert.deepStrictEqual(board.getPosition('h1'), [7, 7])
    assert.deepStrictEqual(board.getPosition(18), [2, 2])
    assert.strictEqual(board.getIndex('a8'), 0)
    assert.strictEqual(board.getIndex('e2'), 52)
    assert.strictEqual(board.getIndex(6, 4), 52)
    assert.strictEqual(board.getNotation(0, 0), 'a8')
    assert.strictEqual(board.getNotation(7, 7), 'h1')
  })

  it('returns opening legal move count for white', function () {
    const board = new Chess.Board()

    assert.strictEqual(board.getLegalMoves(Chess.PieceColor.White).length, 20)
  })

  it('returns opening pawn moves for white and black', function () {
    const board = new Chess.Board()

    const whitePawnMoves = board.getValidMoves(52).map((move) => move.to).sort((a, b) => a - b)
    const blackPawnMoves = board.getValidMoves(12).map((move) => move.to).sort((a, b) => a - b)

    assert.deepStrictEqual(whitePawnMoves, [36, 44])
    assert.deepStrictEqual(blackPawnMoves, [20, 28])
  })

  it('returns opening knight moves', function () {
    const board = new Chess.Board()
    const moves = board.getValidMoves(62).map((move) => move.to).sort((a, b) => a - b)

    assert.deepStrictEqual(moves, [45, 47])
  })

  it('returns no opening moves for blocked bishop', function () {
    const board = new Chess.Board()

    assert.deepStrictEqual(board.getValidMoves(58), [])
  })

  it('generates rook moves on a custom board with blocks and captures', function () {
    const board = new Chess.Board()
    const state = makeEmptyState()
    state[27] = { type: 'rook', color: Chess.PieceColor.White }
    state[11] = { type: 'pawn', color: Chess.PieceColor.White }
    state[30] = { type: 'knight', color: Chess.PieceColor.Black }
    board.state = state

    const moves = board.getValidMoves(27).map((move) => move.to).sort((a, b) => a - b)

    assert.deepStrictEqual(moves, [19, 24, 25, 26, 28, 29, 30, 35, 43, 51, 59])
  })

  it('allows king-side and queen-side castling on a clear board', function () {
    const board = new Chess.Board()
    const state = makeEmptyState()
    state[60] = { type: 'king', color: Chess.PieceColor.White }
    state[56] = { type: 'rook', color: Chess.PieceColor.White }
    state[63] = { type: 'rook', color: Chess.PieceColor.White }
    board.state = state

    const moves = board.getValidMoves(60).map((move) => move.to).sort((a, b) => a - b)

    assert.ok(moves.includes(58))
    assert.ok(moves.includes(62))
  })

  it('moves a piece and stores move history when move is legal', function () {
    const board = new Chess.Board()

    const moved = board.movePiece(52, 36)

    assert.strictEqual(moved, true)
    assert.strictEqual(board.getPieceAt(52), null)
    assert.deepStrictEqual(board.getPieceAt(36), { type: 'pawn', color: Chess.PieceColor.White })
    assert.strictEqual(board.moveHistory.length, 1)
    assert.strictEqual(board.moveHistory[0]?.from, 52)
    assert.strictEqual(board.moveHistory[0]?.to, 36)
  })

  it('rejects illegal piece movement', function () {
    const board = new Chess.Board()

    const moved = board.movePiece(52, 44 + 8)

    assert.strictEqual(moved, false)
    assert.deepStrictEqual(board.getPieceAt(52), { type: 'pawn', color: Chess.PieceColor.White })
    assert.strictEqual(board.moveHistory.length, 0)
  })

  it('applies king-side castling rook movement correctly', function () {
    const board = new Chess.Board()
    const state = makeEmptyState()
    state[60] = { type: 'king', color: Chess.PieceColor.White }
    state[63] = { type: 'rook', color: Chess.PieceColor.White }

    board.applyMove(
      {
        from: 60,
        to: 62,
        capture: null,
        castling: 'kingside',
      },
      state,
    )

    assert.deepStrictEqual(state[62], { type: 'king', color: Chess.PieceColor.White })
    assert.deepStrictEqual(state[61], { type: 'rook', color: Chess.PieceColor.White })
    assert.strictEqual(state[60], null)
    assert.strictEqual(state[63], null)
  })

  it('draws the board from white perspective', function () {
    const board = new Chess.Board()
    assert.doesNotThrow(() => board.drawBoard(Chess.PieceColor.White))
  })

  it('draws the board from black perspective', function () {
    const board = new Chess.Board()
    assert.doesNotThrow(() => board.drawBoard(Chess.PieceColor.Black))
  })

  it('draws the board without coordinates when requested', function () {
    const board = new Chess.Board()
    assert.doesNotThrow(() => board.drawBoard(Chess.PieceColor.White, { showCoordinates: false }))
  })
})
