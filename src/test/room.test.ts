import assert from 'node:assert'
import { Player, Room } from '../utils'

describe('Room', function () {
  let room: Room<Player>

  it('initializes room with no players', function () {
    room = new Room<Player>('test-room')
    assert.strictEqual(room.players.length, 0)
  })

  it('adds a player to the room', function () {
    room.addPlayer(new Player('Alice'))
    assert.strictEqual(room.players.length, 1)
    assert.strictEqual(room.players[0]?.id, 'Alice')
  })

  it('removes a player from the room', function () {
    room.removePlayer(new Player('Alice'))
    assert.strictEqual(room.players.length, 0)
  })

  it('retrieves a player by id', function () {
    room.addPlayer(new Player('Bob'))
    const player = room.getPlayer('Bob')
    assert.strictEqual(player?.id, 'Bob')
  })
})