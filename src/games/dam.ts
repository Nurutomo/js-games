import { Player } from '../utils/player'
import { Room as DefaultRoom } from '../utils/room'

export namespace Dam {
  export enum PieceColor {
    Black = 'black',
    White = 'white',
  }
  export enum GameState {
    Ongoing = 'ongoing',
    Draw = 'draw',
    WhiteWin = 'white-win',
    BlackWin = 'black-win',
  }

  export interface LegalMove {
    from: number
    to: number
    path: number[]
    captured: number[]
    isCapture: boolean
    becomesKing: boolean
  }

  export interface PieceSets {
    [PieceColor.Black]: Set<number>
    [PieceColor.White]: Set<number>
  }

  export interface BoardState {
    pieces: PieceSets
    kings: PieceSets
  }

  /*

Board Numbering

     a  b  c  d  e  f  g  h
  +------------------------
1 | 00 01 02 03 04 05 06 07
2 | 08 09 10 11 12 13 14 15
3 | 16 17 18 19 20 21 22 23
4 | 24 25 26 27 28 29 30 31
5 | 32 33 34 35 36 37 38 39
6 | 40 41 42 43 44 45 46 47
7 | 48 49 50 51 52 53 54 55
8 | 56 57 58 59 60 61 62 63

*/
  export class Board {
    private state: BoardState = {
      pieces: {
        [PieceColor.Black]: new Set([1, 3, 5, 7, 8, 10, 12, 14, 17, 19, 21, 23]),
        [PieceColor.White]: new Set([40, 42, 44, 46, 49, 51, 53, 55, 56, 58, 60, 62]),
      },
      kings: {
        [PieceColor.Black]: new Set(),
        [PieceColor.White]: new Set(),
      },
    }
    turn: PieceColor = PieceColor.White
    private positionHistory: Map<string, number> = new Map()

    constructor() {
      this.recordPosition()
    }

    get blackPieces(): number[] {
      return [...this.state.pieces[PieceColor.Black]]
    }

    set blackPieces(pieces: number[]) {
      this.state.pieces[PieceColor.Black] = new Set(pieces)
      this.state.kings[PieceColor.Black] = new Set(
        [...this.state.kings[PieceColor.Black]].filter((index) =>
          this.state.pieces[PieceColor.Black].has(index),
        ),
      )
    }

    get whitePieces(): number[] {
      return [...this.state.pieces[PieceColor.White]]
    }

    set whitePieces(pieces: number[]) {
      this.state.pieces[PieceColor.White] = new Set(pieces)
      this.state.kings[PieceColor.White] = new Set(
        [...this.state.kings[PieceColor.White]].filter((index) =>
          this.state.pieces[PieceColor.White].has(index),
        ),
      )
    }

    get blackKings(): number[] {
      return [...this.state.kings[PieceColor.Black]]
    }

    set blackKings(kings: number[]) {
      this.state.kings[PieceColor.Black] = new Set(
        kings.filter((index) => this.state.pieces[PieceColor.Black].has(index)),
      )
    }

    get whiteKings(): number[] {
      return [...this.state.kings[PieceColor.White]]
    }

    set whiteKings(kings: number[]) {
      this.state.kings[PieceColor.White] = new Set(
        kings.filter((index) => this.state.pieces[PieceColor.White].has(index)),
      )
    }

    checkMove(from: number, to: number): boolean {
      return this.getValidMoves(from).includes(to)
    }

    getValidMoves(from: number): number[] {
      const color = this.getPieceColor(from)
      if (!color || !this.isInBounds(from)) {
        return []
      }

      const captures = this.getCaptureSequencesForPiece(from)
      const moves = captures.length > 0 ? captures : this.getSimpleMovesForPiece(from)

      return moves.map((move) => move.to)
    }

    getLegalMoves(color?: PieceColor): LegalMove[] {
      const activeColor = color ?? this.turn
      const pieces = [...this.state.pieces[activeColor]]
      const allCaptures = pieces.flatMap((from) => this.getCaptureSequencesForPiece(from))

      if (allCaptures.length > 0) {
        return allCaptures
      }

      return pieces.flatMap((from) => this.getSimpleMovesForPiece(from))
    }

    getCaptureMoves(from: number): LegalMove[] {
      return this.getCaptureSequencesForPiece(from)
    }

    isLegalMove(from: number, to: number, color?: PieceColor): boolean {
      const activeColor = color ?? this.turn
      return this.getLegalMoves(activeColor).some((move) => move.from === from && move.to === to)
    }

    playMove(from: number, to: number, color?: PieceColor): LegalMove {
      const activeColor = color ?? this.turn
      const candidates = this.getLegalMoves(activeColor).filter(
        (move) => move.from === from && move.to === to,
      )
      if (candidates.length === 0) {
        throw new Error('Illegal move')
      }
      if (candidates.length > 1) {
        throw new Error('Ambiguous move. Use playMovePath with the full path.')
      }

      const selected = candidates.at(0)
      if (selected === undefined) {
        throw new Error('Illegal move')
      }

      this.applyMove(selected, activeColor)
      return selected
    }

    playMovePath(path: number[], color?: PieceColor): LegalMove {
      const activeColor = color ?? this.turn
      const selected = this.getLegalMoves(activeColor).find(
        (move) =>
          move.path.length === path.length &&
          move.path.every((value, index) => value === path[index]),
      )
      if (selected === undefined) {
        throw new Error('Illegal move path')
      }

      this.applyMove(selected, activeColor)
      return selected
    }

    getWinner(): PieceColor | null {
      if (this.state.pieces[PieceColor.Black].size === 0) return PieceColor.White
      if (this.state.pieces[PieceColor.White].size === 0) return PieceColor.Black

      if (this.getLegalMoves(this.turn).length === 0) {
        return this.turn === PieceColor.White ? PieceColor.Black : PieceColor.White
      }

      return null
    }

    isDrawByRepetition(): boolean {
      return (
        this.positionHistory.get(this.positionKey()) !== undefined &&
        (this.positionHistory.get(this.positionKey()) as number) >= 3
      )
    }

    getGameState(): GameState {
      if (this.isDrawByRepetition()) return GameState.Draw

      const winner = this.getWinner()
      if (!winner) return GameState.Ongoing

      return winner === PieceColor.White ? GameState.WhiteWin : GameState.BlackWin
    }

    indexToNotation(index: number): string {
      const [row, col] = this.indexToPosition(index)
      const file = String.fromCharCode('a'.charCodeAt(0) + col)
      const rank = 8 - row

      return `${file}${rank}`
    }

    notationToIndex(notation: string): number {
      const normalized = notation.trim().toLowerCase()
      if (!/^[a-h][1-8]$/.test(normalized)) {
        throw new Error('Invalid notation')
      }

      const col = normalized.charCodeAt(0) - 'a'.charCodeAt(0)
      const rank = Number(normalized[1])
      const row = 8 - rank

      return this.positionToIndex(row, col)
    }

    private getSimpleMovesForPiece(from: number, state?: BoardState): LegalMove[] {
      const boardState = state ?? this.state
      const color = this.getPieceColorFromState(from, boardState)
      if (!color) return []
      const isKing = this.isKingFromState(from, color, boardState)

      const result: LegalMove[] = []
      if (isKing) {
        const directions: Array<[number, number]> = [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]
        const [row, col] = this.indexToPosition(from)

        for (const [rowDir, colDir] of directions) {
          let nextRow = row + rowDir
          let nextCol = col + colDir

          while (this.isRowColInBounds(nextRow, nextCol)) {
            const nextIndex = this.positionToIndex(nextRow, nextCol)
            if (this.isOccupiedState(nextIndex, boardState)) break

            result.push({
              from,
              to: nextIndex,
              path: [from, nextIndex],
              captured: [],
              isCapture: false,
              becomesKing: true,
            })

            nextRow += rowDir
            nextCol += colDir
          }
        }

        return result
      }

      const [row, col] = this.indexToPosition(from)
      const forwardStep = color === PieceColor.Black ? 1 : -1
      const candidates: Array<[number, number]> = [
        [row + forwardStep, col - 1],
        [row + forwardStep, col + 1],
      ]

      for (const [nextRow, nextCol] of candidates) {
        if (!this.isRowColInBounds(nextRow, nextCol)) continue

        const to = this.positionToIndex(nextRow, nextCol)
        if (!this.isDarkSquare(to) || this.isOccupiedState(to, boardState)) continue

        result.push({
          from,
          to,
          path: [from, to],
          captured: [],
          isCapture: false,
          becomesKing: this.isPromotionRow(color, nextRow),
        })
      }

      return result
    }

    private getCaptureSequencesForPiece(from: number, state?: BoardState): LegalMove[] {
      const boardState = state ?? this.state
      const color = this.getPieceColorFromState(from, boardState)
      if (!color) return []

      const isKing = this.isKingFromState(from, color, boardState)
      return this.expandCaptures(from, from, color, isKing, boardState, [from], [], isKing)
    }

    private expandCaptures(
      origin: number,
      from: number,
      color: PieceColor,
      isKing: boolean,
      state: BoardState,
      path: number[],
      captured: number[],
      wasKingAtStart: boolean,
    ): LegalMove[] {
      const boardState = state ?? this.state
      const jumps = this.getSingleCaptureJumps(from, color, isKing, boardState)
      if (jumps.length === 0) {
        if (captured.length === 0) return []

        const destination = path.at(-1)
        if (destination === undefined) {
          return []
        }

        return [
          {
            from: origin,
            to: destination,
            path,
            captured,
            isCapture: true,
            becomesKing: isKing || wasKingAtStart,
          },
        ]
      }

      let results: LegalMove[] = []
      for (const jump of jumps) {
        const nextState = this.applyJumpToState(from, jump.to, jump.captured, color, isKing, boardState)
        const promotedNow = !isKing && this.isPromotionRow(color, this.indexToPosition(jump.to)[0])
        const nextIsKing = isKing || promotedNow

        const continuation = this.expandCaptures(
          origin,
          jump.to,
          color,
          nextIsKing,
          nextState,
          [...path, jump.to],
          [...captured, jump.captured],
          wasKingAtStart,
        )

        results = results.concat(continuation)
      }

      return results
    }

    private getSingleCaptureJumps(
      from: number,
      color: PieceColor,
      isKing: boolean,
      state?: BoardState,
    ): Array<{ to: number; captured: number }> {
      const boardState = state ?? this.state
      const [row, col] = this.indexToPosition(from)
      const results: Array<{ to: number; captured: number }> = []

      if (!isKing) {
        const directions: Array<[number, number]> = [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]
        for (const [rowDir, colDir] of directions) {
          const enemyRow = row + rowDir
          const enemyCol = col + colDir
          const landRow = row + rowDir * 2
          const landCol = col + colDir * 2

          if (
            !this.isRowColInBounds(enemyRow, enemyCol) ||
            !this.isRowColInBounds(landRow, landCol)
          )
            continue

          const enemyIndex = this.positionToIndex(enemyRow, enemyCol)
          const landIndex = this.positionToIndex(landRow, landCol)
          if (!this.isOpponentPieceState(enemyIndex, color, boardState)) continue
          if (this.isOccupiedState(landIndex, boardState) || !this.isDarkSquare(landIndex)) continue

          results.push({ to: landIndex, captured: enemyIndex })
        }

        return results
      }

      const directions: Array<[number, number]> = [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]
      for (const [rowDir, colDir] of directions) {
        let nextRow = row + rowDir
        let nextCol = col + colDir
        let encounteredEnemy: number | null = null

        while (this.isRowColInBounds(nextRow, nextCol)) {
          const currentIndex = this.positionToIndex(nextRow, nextCol)
          if (!this.isOccupiedState(currentIndex, boardState)) {
            if (encounteredEnemy !== null) {
              results.push({ to: currentIndex, captured: encounteredEnemy })
            }
            nextRow += rowDir
            nextCol += colDir
            continue
          }

          if (this.isOwnPieceState(currentIndex, color, boardState)) {
            break
          }

          if (encounteredEnemy !== null) {
            break
          }

          encounteredEnemy = currentIndex
          nextRow += rowDir
          nextCol += colDir
        }
      }

      return results
    }

    private applyJumpToState(
      from: number,
      to: number,
      captured: number,
      color: PieceColor,
      isKing: boolean,
      state?: BoardState,
    ): BoardState {
      const boardState = state ?? this.state
      const next = this.cloneState(boardState)
      const ownPieces = next.pieces[color]
      const enemyPieces =
        next.pieces[color === PieceColor.Black ? PieceColor.White : PieceColor.Black]
      const ownKings = next.kings[color]
      const enemyKings =
        next.kings[color === PieceColor.Black ? PieceColor.White : PieceColor.Black]

      ownPieces.delete(from)
      ownKings.delete(from)
      enemyPieces.delete(captured)
      enemyKings.delete(captured)
      ownPieces.add(to)

      if (isKing) {
        ownKings.add(to)
      }

      return next
    }

    private applyMove(move: LegalMove, color: PieceColor): void {
      const ownPieces = this.state.pieces[color]
      const enemyColor: PieceColor =
        color === PieceColor.Black ? PieceColor.White : PieceColor.Black
      const enemyPieces = this.state.pieces[enemyColor]
      const ownKings = this.state.kings[color]
      const enemyKings = this.state.kings[enemyColor]
      const from = move.from
      const to = move.to

      const wasKing = ownKings.has(from)

      if (!ownPieces.has(from)) {
        throw new Error('Invalid internal state: moving piece not found')
      }

      ownPieces.delete(from)
      ownPieces.add(to)
      ownKings.delete(from)
      if (wasKing) ownKings.add(to)

      for (const capturedIndex of move.captured) {
        enemyPieces.delete(capturedIndex)
        enemyKings.delete(capturedIndex)
      }

      const [toRow] = this.indexToPosition(to)
      if (!wasKing && this.isPromotionRow(color, toRow) && !ownKings.has(to)) {
        ownKings.add(to)
      }

      this.turn = color === PieceColor.White ? PieceColor.Black : PieceColor.White
      this.recordPosition()
    }

    private cloneState(state?: BoardState): BoardState {
      const boardState = state ?? this.state
      return {
        pieces: {
          [PieceColor.Black]: new Set(boardState.pieces[PieceColor.Black]),
          [PieceColor.White]: new Set(boardState.pieces[PieceColor.White]),
        },
        kings: {
          [PieceColor.Black]: new Set(boardState.kings[PieceColor.Black]),
          [PieceColor.White]: new Set(boardState.kings[PieceColor.White]),
        },
      }
    }

    private isRowColInBounds(row: number, col: number): boolean {
      return row >= 0 && row < 8 && col >= 0 && col < 8
    }

    private isInBounds(index: number): boolean {
      return Number.isInteger(index) && index >= 0 && index < 64
    }

    private isDarkSquare(index: number): boolean {
      const [row, col] = this.indexToPosition(index)
      return (row + col) % 2 === 1
    }

    private isOccupiedState(index: number, state?: BoardState): boolean {
      const boardState = state ?? this.state
      return boardState.pieces[PieceColor.Black].has(index) || boardState.pieces[PieceColor.White].has(index)
    }

    getPieceColor(index: number): PieceColor | null {
      if (this.state.pieces[PieceColor.Black].has(index)) return PieceColor.Black
      if (this.state.pieces[PieceColor.White].has(index)) return PieceColor.White
      return null
    }

    private getPieceColorFromState(
      index: number,
      state?: BoardState,
    ): PieceColor | null {
      const boardState = state ?? this.state
      if (boardState.pieces[PieceColor.Black].has(index)) return PieceColor.Black
      if (boardState.pieces[PieceColor.White].has(index)) return PieceColor.White
      return null
    }

    private isKingFromState(
      index: number,
      color: PieceColor,
      state?: BoardState,
    ): boolean {
      const boardState = state ?? this.state
      return boardState.kings[color].has(index)
    }

    private isOwnPieceState(
      index: number,
      color: PieceColor,
      state?: BoardState,
    ): boolean {
      const boardState = state ?? this.state
      return boardState.pieces[color].has(index)
    }

    private isOpponentPieceState(
      index: number,
      color: PieceColor,
      state?: BoardState,
    ): boolean {
      const boardState = state ?? this.state
      const opponent: PieceColor = color === PieceColor.Black ? PieceColor.White : PieceColor.Black
      return boardState.pieces[opponent].has(index)
    }

    private isPromotionRow(color: PieceColor, row: number): boolean {
      return color === PieceColor.Black ? row === 7 : row === 0
    }

    private positionKey(): string {
      const black = [...this.state.pieces[PieceColor.Black]].sort((a, b) => a - b).join(',')
      const white = [...this.state.pieces[PieceColor.White]].sort((a, b) => a - b).join(',')
      const blackKings = [...this.state.kings[PieceColor.Black]].sort((a, b) => a - b).join(',')
      const whiteKings = [...this.state.kings[PieceColor.White]].sort((a, b) => a - b).join(',')

      return `${this.turn}|b:${black}|w:${white}|bk:${blackKings}|wk:${whiteKings}`
    }

    private recordPosition(): void {
      const key = this.positionKey()
      this.positionHistory.set(key, (this.positionHistory.get(key) || 0) + 1)
    }

    indexToPosition(index: number): [row: number, col: number] {
      return [Math.floor(index / 8), index % 8]
    }

    positionToIndex(row: number, col: number): number {
      return row * 8 + col
    }

    drawBoard(
      pov: PieceColor = PieceColor.White,
      options: {
        showCoordinates?: boolean
        darkSquareColor?: string
        lightSquareColor?: string
        blackPieceSymbol?: string
        whitePieceSymbol?: string
      } = {
        showCoordinates: true,
      },
    ) {
      const DARK_SQUARE = options?.darkSquareColor || '\x1b[40m' // Brown background
      const LIGHT_SQUARE = options?.lightSquareColor || '\x1b[107m' // Light background
      const BLACK_PIECE = options?.blackPieceSymbol || '\x1b[31m●' // Black circle
      const WHITE_PIECE = options?.whitePieceSymbol || '\x1b[97m●' // White circle
      const RESET = '\x1b[0m'

      let board = ''
      if (options?.showCoordinates) {
        board += '   a  b  c  d  e  f  g  h\n'
      }

      for (let row = 0; row < 8; row++) {
        board += options?.showCoordinates ? `${pov === PieceColor.White ? 8 - row : row + 1} ` : ''
        for (let col = 0; col < 8; col++) {
          const isBlackSquare = (row + col) % 2 === 1
          const squareColor = isBlackSquare ? DARK_SQUARE : LIGHT_SQUARE
          const squareIndex = this.positionToIndex(
            pov === PieceColor.Black ? 7 - row : row,
            pov === PieceColor.Black ? 7 - col : col,
          )

          let content = '   '
          if (this.state.pieces[PieceColor.Black].has(squareIndex)) {
            content = ` ${BLACK_PIECE} `
          } else if (this.state.pieces[PieceColor.White].has(squareIndex)) {
            content = ` ${WHITE_PIECE} `
          }

          board += squareColor + content + RESET
        }
        board += '\n'
      }
      console.log(board)
    }
  }

  export class Room extends DefaultRoom<Player> {
    board = new Board()
    white: Player | undefined
    black: Player | undefined
    winner: GameState | undefined
    state = 'waiting' as 'waiting' | 'playing' | 'ended'
    constructor(id: string | number) {
      super(id)
    }

    addPlayer(player: Player | Player['id']) {
      if (this.players.length >= 2) {
        throw new Error('Room is full')
      }
      if (player instanceof Player) {
        super.addPlayer(player)
      } else {
        const newPlayer = new Player(player)
        super.addPlayer(newPlayer)
      }
    }

    startGame() {
      if (this.players.length !== 2) {
        throw new Error('Need exactly 2 players to start the game')
      }
      if (Math.random() < 0.5) {
        this.white = this.players[0]
        this.black = this.players[1]
      } else {
        this.white = this.players[1]
        this.black = this.players[0]
      }
      this.state = 'playing'
    }

    endGame(player: Player | Player['id']) {
      const P = player instanceof Player ? player.id : player
      if (this.white?.id === P) this.winner = GameState.BlackWin
      if (this.black?.id === P) this.winner = GameState.WhiteWin
      this.state = 'ended'
    }

    getValidMoves(from: number): number[] {
      return this.board.getValidMoves(from)
    }

    playMove(from: number, to: number): LegalMove {
      if (this.getGameState() !== GameState.Ongoing) {
        throw new Error('Game is not ongoing')
      }
      if (this.board.getPieceColor(from) !== this.board.turn) {
        throw new Error('Not your turn')
      }
      const move = this.board.playMove(from, to)
      return move
    }

    getRoomState() {
      return this.state
    }

    getGameState(): GameState {
      return this.winner || this.board.getGameState()
    }
  }
}

export default Dam