import assert from 'node:assert'
import Dam from '../games/dam'
import { Player } from '../utils'

describe('dam board', function () {
  const board = new Dam.Board()

  it('draws the board from white perspective', function () {
    assert.doesNotThrow(() => board.drawBoard(Dam.PieceColor.White))
  })

  it('draws the board from black perspective', function () {
    assert.doesNotThrow(() => board.drawBoard(Dam.PieceColor.Black))
  })

  it('allows valid forward diagonal move for black', function () {
    assert.strictEqual(board.checkMove(17, 26), true)
  })

  it('rejects backward diagonal move for black', function () {
    assert.strictEqual(board.checkMove(17, 10), false)
  })

  it('rejects moves to occupied squares', function () {
    assert.strictEqual(board.checkMove(12, 19), false)
  })

  it('allows valid forward diagonal move for white', function () {
    assert.strictEqual(board.checkMove(40, 33), true)
  })

  it('allows valid capture over opponent', function () {
    board.blackPieces = [17]
    board.whitePieces = [26]

    assert.strictEqual(board.checkMove(17, 35), true)
  })

  it('rejects capture when there is no opponent in between', function () {
    board.blackPieces = [17]
    board.whitePieces = []

    assert.strictEqual(board.checkMove(17, 35), false)
  })

  it('returns all valid moves for a black piece', function () {
    assert.deepStrictEqual(board.getValidMoves(17).sort((a, b) => a - b), [24, 26])
  })

  it('returns no valid moves when a piece is blocked', function () {
    assert.deepStrictEqual(board.getValidMoves(12), [])
  })

  it('includes capture destination in valid moves', function () {
    board.blackPieces = [17]
    board.whitePieces = [26]

    assert.deepStrictEqual(board.getValidMoves(17), [35])
  })

  it('returns empty list for empty square', function () {
    assert.deepStrictEqual(board.getValidMoves(32), [])
  })

  it('enforces mandatory capture for side to move', function () {
    board.turn = Dam.PieceColor.Black
    board.blackPieces = [17, 21]
    board.whitePieces = [26]

    const legalMoves = board.getLegalMoves(Dam.PieceColor.Black)
    assert.deepStrictEqual(legalMoves.map((move) => [move.from, move.to]), [[17, 35]])
  })

  it('promotes man to king on last row after move', function () {
    board.turn = Dam.PieceColor.Black
    board.blackPieces = [53]
    board.whitePieces = []

    board.playMove(53, 62, Dam.PieceColor.Black)
    assert.ok(board.blackKings.includes(62))
  })

  it('supports notation conversions', function () {
    assert.strictEqual(board.indexToNotation(56), 'a1')
    assert.strictEqual(board.notationToIndex('h8'), 7)
  })

  it('throws on illegal moves', function () {
    assert.throws(() => board.playMove(17, 10, Dam.PieceColor.Black))
  })
})

describe('dam room', function () {
  let room: Dam.Room
  it('initializes room with no players', function () {
    room = new Dam.Room('test-room')
    assert.strictEqual(room.white, undefined)
    assert.strictEqual(room.black, undefined)
    assert.strictEqual(room.state, 'waiting')
  })
  
  it('allows players to join using id', function () {
    room.addPlayer('player1')
    assert.strictEqual(room.players[0]?.id, 'player1')
    assert.strictEqual(room.state, 'waiting')
  })
  
  it('allows players to join using Player object', function () {
    room.addPlayer(new Player('player2'))
    assert.strictEqual(room.players[1]?.id, 'player2')
    assert.strictEqual(room.state, 'waiting')
  })

  it('starts game when two players have joined', function () {
    room.startGame()
    assert.strictEqual(room.state, 'playing')
  })

  it('enforces maximum of two players', function () {
    assert.throws(() => room.addPlayer('player3'))
  })

  it ('white player cant move black piece', function () {
    assert.throws(() => room.playMove(17, 26))
    assert.deepEqual(room.board.blackPieces.includes(17), true)
  })
  
  it('white player moves', function () {
    assert.doesNotThrow(() => room.playMove(40, 33))
    assert.deepEqual(room.board.whitePieces.includes(33), true)
  })
  
  it('black player moves', function () {
    assert.doesNotThrow(() => room.playMove(17, 26))
    assert.deepEqual(room.board.blackPieces.includes(26), true)
  })
  
  it('black player cant move again', function () {
    assert.throws(() => room.playMove(26, 17))
    assert.deepEqual(room.board.blackPieces.includes(26), true)
  })

  it('black surrenders and white wins', function () {
    room.black && room.endGame(room.black.id)
    assert.strictEqual(room.winner, 'white-win')
    assert.strictEqual(room.state, 'ended')
  })
})