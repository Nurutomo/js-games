import { Player } from './player'

export class Room<P extends Player> {
  id: string | number
  players: P[]
  turn: number
  state: any

  constructor(id: string | number) {
    this.id = id
    this.players = []
    this.turn = 0
    this.state = null
  }

  addPlayer(player: P) {
    this.players.push(player)
  }

  removePlayer(playerId: P | P['id']) {
    const targetId = playerId instanceof Player ? playerId.id : playerId
    this.players = this.players.filter(player => player.id !== targetId)
  }

  getPlayer(playerId: P | P['id']): P | undefined {
    const targetId = playerId instanceof Player ? playerId.id : playerId
    return this.players.find(player => player.id === targetId)
  }

  get prevPlayer(): P | undefined {
    return this.players[(this.turn - 1 + this.players.length) % this.players.length]
  }

  get currentPlayer(): P | undefined {
    return this.players[this.turn % this.players.length]
  }

  get nextPlayer(): P | undefined {
    return this.players[(this.turn + 1) % this.players.length]
  }

  nextTurn() {
    return this.turn++
  }
}
