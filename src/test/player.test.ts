import assert from 'node:assert'
import { Player } from '../utils'

describe('Player', function () {
  it('initializes player with id', function () {
    const player1 = new Player('Alice')
    const player2 = new Player('Bob')

    assert.strictEqual(player1.id, 'Alice')
    assert.strictEqual(player2.id, 'Bob')
    assert.notStrictEqual(player1.id, player2.id)
  })
})