import { get } from 'http'

export namespace Chess {
  export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king'
  export enum PieceColor {
    White = 'white',
    Black = 'black',
  }
  export interface Piece {
    type: PieceType
    color: PieceColor
  }
  export interface Move {
    from: number
    to: number
    capture: Piece | null
    promotion?: boolean
    castling?: 'kingside' | 'queenside'
    elPassant?: boolean
  }
  export type BoardState = (Piece | null)[]

  export class Board {
    state: BoardState = new Array(64).fill(null)
    moveHistory: Move[] = []

    constructor() {
      this.state = Board.initializeBoard()
    }

    static initializeBoard(): BoardState {
      const emptyRow: (Piece | null)[] = Array(8).fill(null)
      return [
        { type: 'rook', color: PieceColor.Black },
        { type: 'knight', color: PieceColor.Black },
        { type: 'bishop', color: PieceColor.Black },
        { type: 'queen', color: PieceColor.Black },
        { type: 'king', color: PieceColor.Black },
        { type: 'bishop', color: PieceColor.Black },
        { type: 'knight', color: PieceColor.Black },
        { type: 'rook', color: PieceColor.Black },
        ...Array(8).fill({ type: 'pawn', color: PieceColor.Black }),
        ...emptyRow,
        ...emptyRow,
        ...emptyRow,
        ...emptyRow,
        ...Array(8).fill({ type: 'pawn', color: PieceColor.White }),
        { type: 'rook', color: PieceColor.White },
        { type: 'knight', color: PieceColor.White },
        { type: 'bishop', color: PieceColor.White },
        { type: 'queen', color: PieceColor.White },
        { type: 'king', color: PieceColor.White },
        { type: 'bishop', color: PieceColor.White },
        { type: 'knight', color: PieceColor.White },
        { type: 'rook', color: PieceColor.White },
      ]
    }

    getPieceAt(row: number, col: number): Piece | null
    getPieceAt(index: number): Piece | null
    getPieceAt(a: number, b?: number): Piece | null {
      const index = b !== undefined ? a * 8 + b : a
      return this.state[index] || null
    }

    getPosition(notation: string): [row: number, col: number]
    getPosition(index: number): [row: number, col: number]
    getPosition(a: number | string): [row: number, col: number] {
      if (typeof a === 'string') {
        const file = a[0].toLowerCase()
        const rank = parseInt(a[1], 10)
        const col = file.charCodeAt(0) - 'a'.charCodeAt(0)
        const row = 8 - rank
        return [row, col]
      }
      return [Math.floor(a / 8), a % 8]
    }

    getIndex(notation: string): number
    getIndex(row: number, col: number): number
    getIndex(a: number | string, b?: number): number {
      if (typeof a === 'string') {
        const [row, col] = this.getPosition(a)
        return this.getIndex(row, col)
      }
      return a * 8 + b
    }

    getNotation(row: number, col: number): string
    getNotation(index: number): string
    getNotation(a: number, b?: number): string {
      if (typeof a !== 'number') {
        throw new Error('Invalid argument')
      }

      if (typeof b === 'number') {
        const file = String.fromCharCode('a'.charCodeAt(0) + b)
        const rank = 8 - a
        return `${file}${rank}`
      }

      const [row, col] = this.getPosition(a)
      return this.getNotation(row, col)
    }

    private checkCheck(playerColor: PieceColor, kingIndex: number, state?: BoardState): boolean {
      // Implement logic to determine if the player's king is in check
      const activeState = state ?? this.state
      const opponentColor = playerColor === PieceColor.White ? PieceColor.Black : PieceColor.White
      for (let index = 0; index < activeState.length; index++) {
        const piece = this.getPieceAt(index)
        if (piece && piece.color === opponentColor) {
          const moves = this.getValidMoves(index, true)
          if (moves.some((move) => move.to === kingIndex)) {
            return true
          }
        }
      }
      return false
    }

    private addMoves(moves: Move[], fromIndex: number, targetIndex: number[]): void {
      const currentPiece = this.getPieceAt(fromIndex)
      for (const index of targetIndex) {
        const [row, col] = this.getPosition(index)
        if (row < 0 || row >= 8 || col < 0 || col >= 8) continue // Out of bounds
        const piece = this.getPieceAt(index)
        if (piece?.color !== currentPiece.color) {
          moves.push({
            from: fromIndex,
            to: index,
            capture: piece,
          })
        }
      }
    }

    private relativeMove(fromIndex: number, rowOffset: number, colOffset: number): Move[] {
      const [row, col] = this.getPosition(fromIndex)
      const currentPiece = this.getPieceAt(fromIndex)
      const moves: Move[] = []
      for (let i = 1; i < 8; i++) {
        const x = col + i * colOffset
        const y = row + i * rowOffset
        if (x < 0 || x >= 8 || y < 0 || y >= 8) break // Out of bounds
        const targetIndex = this.getIndex(y, x)
        const piece = this.getPieceAt(targetIndex)
        if (piece?.color !== currentPiece.color) moves.push({
          from: fromIndex,
          to: targetIndex,
          capture: piece,
        })
        if (piece) break // Blocked by any piece
      }
      return moves
    }

    private rookMoves(fromIndex: number): Move[] {
      // Implement logic to calculate valid rook moves based on current board state
      return [
        ...this.relativeMove(fromIndex, 0, 1), // Right
        ...this.relativeMove(fromIndex, 0, -1), // Left
        ...this.relativeMove(fromIndex, 1, 0), // Down
        ...this.relativeMove(fromIndex, -1, 0), // Up
      ]
    }

    private knightMoves(fromIndex: number): Move[] {
      // Implement logic to calculate valid knight moves based on current board state
      const [row, col] = this.getPosition(fromIndex)
      const potentialMoves = [
        [row - 2, col - 1],
        [row - 2, col + 1],
        [row - 1, col - 2],
        [row - 1, col + 2],
        [row + 1, col - 2],
        [row + 1, col + 2],
        [row + 2, col - 1],
        [row + 2, col + 1],
      ]
      const moves: Move[] = []
      this.addMoves(
        moves,
        fromIndex,
        potentialMoves
          .filter(([r, c]) => r >= 0 && r < 8 && c >= 0 && c < 8)
          .map(([r, c]) => this.getIndex(r, c)),
      )
      return moves
    }

    private bishopMoves(fromIndex: number): Move[] {
      // Implement logic to calculate valid bishop moves based on current board state
      let a = [
        ...this.relativeMove(fromIndex, -1, -1), // Up-Left
        ...this.relativeMove(fromIndex, -1, 1), // Up-Right
        ...this.relativeMove(fromIndex, 1, -1), // Down-Left
        ...this.relativeMove(fromIndex, 1, 1), // Down-Right
      ]
      return a
    }

    private queenMoves(fromIndex: number): Move[] {
      // Implement logic to calculate valid queen moves based on current board state
      return [...this.rookMoves(fromIndex), ...this.bishopMoves(fromIndex)]
    }

    private pawnMoves(fromIndex: number): Move[] {
      // Implement logic to calculate valid pawn moves based on current board state
      const piece = this.getPieceAt(fromIndex)
      if (!piece || piece.type !== 'pawn') return []
      const direction = piece.color === PieceColor.White ? -8 : 8
      const moves: Move[] = []
      // Forward move
      const forwardIndex = fromIndex + direction
      if (this.getPieceAt(forwardIndex) === null) {
        moves.push({
          from: fromIndex,
          to: forwardIndex,
          capture: null,
          promotion:
            (piece.color === PieceColor.White && forwardIndex < 8) ||
            (piece.color === PieceColor.Black && forwardIndex > 55),
        })
        // Double move from starting position
        if (
          (piece.color === PieceColor.White && fromIndex >= 48 && fromIndex <= 55) ||
          (piece.color === PieceColor.Black && fromIndex >= 8 && fromIndex <= 15)
        ) {
          const doubleForwardIndex = fromIndex + 2 * direction
          if (this.getPieceAt(doubleForwardIndex) === null) {
            moves.push({
              from: fromIndex,
              to: doubleForwardIndex,
              capture: null,
              promotion: false,
            })
          }
        }
        let [row, col] = this.getPosition(fromIndex + direction)
        let enemyLastMove = this.moveHistory[this.moveHistory.length - 1]
        let isDoubleJump =
          enemyLastMove &&
          Math.abs(enemyLastMove.to - enemyLastMove.from) === 2 &&
          this.getPieceAt(enemyLastMove.to)?.type === 'pawn'
        let addMove = (isLeft: boolean) => {
          let captureIndex = this.getIndex(row, col + (isLeft ? -1 : 1))
          let isElPassant = isDoubleJump && enemyLastMove.to === fromIndex + (isLeft ? -1 : 1)
          let capturePiece = this.getPieceAt(
            isElPassant ? fromIndex + (isLeft ? -1 : 1) : captureIndex,
          )
          if (capturePiece && capturePiece.color !== piece.color) {
            moves.push({
              from: fromIndex,
              to: captureIndex,
              capture: capturePiece,
              promotion: false,
              elPassant: isElPassant,
            })
          }
        }
        if (col > 0) addMove(true) // Left
        if (col < 7) addMove(false) // Right
      }
      return moves
    }

    private kingMoves(fromIndex: number, ignoreCastling?: boolean): Move[] {
      // Implement logic to calculate valid king moves based on current board state
      const [row, col] = this.getPosition(fromIndex)
      const moves: Move[] = []
      const color = this.getPieceAt(fromIndex)?.color
      for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
          if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const targetIndex = this.getIndex(r, c)
            const piece = this.getPieceAt(targetIndex)
            if (!piece || piece.color !== color) {
              if (!ignoreCastling && this.checkCheck(color || PieceColor.White, targetIndex)) {
                continue // Can't move into check
              }
              moves.push({
                from: fromIndex,
                to: targetIndex,
                capture: piece,
              })
            }
          }
        }
      }
      if (ignoreCastling) {
        return moves
      }
      const castling = this.canCastling(color)
      if (castling.king && !this.checkCheck(color || PieceColor.White, fromIndex + 2)) {
        moves.push({
          from: fromIndex,
          to: fromIndex + 2,
          capture: null,
          castling: 'kingside',
        }) // Kingside castling
      }
      if (castling.queen && !this.checkCheck(color || PieceColor.White, fromIndex - 2)) {
        moves.push({
          from: fromIndex,
          to: fromIndex - 2,
          capture: null,
          castling: 'queenside',
        }) // Queenside castling
      }
      return moves
    }

    private canCastling(color: PieceColor | undefined): { king: boolean; queen: boolean } {
      // Implement logic to determine if castling is possible for the given color
      const row = color === PieceColor.White ? 7 : 0
      const side = {
        queen: true,
        king: true,
      }
      for (const move of this.moveHistory) {
        // If the king moves, castling is no longer possible
        if (move.from === this.getIndex(row, 4)) {
          return {
            queen: false,
            king: false,
          }
        }
        // If the rook moves, that side's castling is no longer possible
        side.king &&= move.from === this.getIndex(row, 7) || move.to === this.getIndex(row, 7)
        side.queen &&= move.from === this.getIndex(row, 0) || move.to === this.getIndex(row, 0)
      }
      // No pieces between king and rook
      side.queen &&=
        this.getPieceAt(this.getIndex(row, 1)) === null &&
        this.getPieceAt(this.getIndex(row, 2)) === null &&
        this.getPieceAt(this.getIndex(row, 3)) === null
      side.king &&=
        this.getPieceAt(this.getIndex(row, 5)) === null &&
        this.getPieceAt(this.getIndex(row, 6)) === null
      return side
    }

    applyMove(move: Move, state?: BoardState): void {
      // Implement move application logic
      const activeState = state || this.state
      activeState[move.to] = activeState[move.from]
      activeState[move.from] = null
      if (move.castling === 'kingside') {
        activeState[move.to - 1] = activeState[move.to + 1]
        activeState[move.to + 1] = null
      } else if (move.castling === 'queenside') {
        activeState[move.to + 1] = activeState[move.to - 2]
        activeState[move.to - 2] = null
      }
      if (move.elPassant) {
        activeState[move.to - (activeState[move.to]?.color === PieceColor.White ? 8 : -8)] = null
      }
    }

    getValidMoves(fromIndex: number, ignoreCheck?: boolean): Move[] {
      // Implement move validation logic based on piece types and rules
      const kingIndex = this.state.findIndex(
        (p) => p?.type === 'king' && p?.color === this.getPieceAt(fromIndex)?.color,
      )
      const isCheck = (move: Move) => {
        const cloneState = [...this.state]
        this.applyMove(move, cloneState)
        return this.checkCheck(this.getPieceAt(fromIndex)?.color || PieceColor.White, kingIndex)
      }
      const filters = ignoreCheck ? () => true : (move: Move) => !isCheck(move)

      let moves: Move[] = []
      switch (this.getPieceAt(fromIndex)?.type) {
        case 'rook':
          moves = this.rookMoves(fromIndex).filter(filters)
          break
        case 'knight':
          moves = this.knightMoves(fromIndex).filter(filters)
          break
        case 'bishop':
          moves = this.bishopMoves(fromIndex).filter(filters)
          break
        case 'queen':
          moves = this.queenMoves(fromIndex).filter(filters)
          break
        case 'pawn':
          moves = this.pawnMoves(fromIndex).filter(filters)
          break
        case 'king':
          moves = this.kingMoves(fromIndex, ignoreCheck)
          break
      }
      return moves
    }

    getLegalMoves(playerColor: PieceColor): Move[] {
      // Implement logic to get all legal moves for the given player color
      const legalMoves: Move[] = []
      this.state.forEach((piece, index) => {
        if (piece && piece.color === playerColor) {
          legalMoves.push(...this.getValidMoves(index))
        }
      })
      return legalMoves
    }

    movePiece(fromIndex: number, toIndex: number): boolean {
      // Implement logic to move a piece if the move is legal, and return true if successful
      const validMoves = this.getValidMoves(fromIndex)
      const move = validMoves.find((m) => m.to === toIndex)
      if (move) {
        this.applyMove(move)
        this.moveHistory.push(move)
        return true
      }
      return false
    }

    drawBoard(
      perspective: PieceColor,
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
      const BLACK_PIECE = options?.blackPieceSymbol || '\x1b[31m' // Black circle
      const WHITE_PIECE = options?.whitePieceSymbol || '\x1b[97m' // White circle
      const RESET = '\x1b[0m'
      const whitePieces = {
        pawn: '♟',
        rook: '♜',
        knight: '♞',
        bishop: '♝',
        queen: '♛',
        king: '♚',
      }
      const blackPieces = {
        pawn: '♙',
        rook: '♖',
        knight: '♘',
        bishop: '♗',
        queen: '♕',
        king: '♔',
      }
      let boardStr = options?.showCoordinates ? '  a b c d e f g h\n' : ''
      for (let row = 0; row < 8; row++) {
        boardStr += options?.showCoordinates
          ? (perspective === PieceColor.White ? 8 - row : row + 1) + ' '
          : ''
        for (let col = 0; col < 8; col++) {
          const piece =
            perspective === PieceColor.White
              ? this.getPieceAt(row, col)
              : this.getPieceAt(7 - row, 7 - col)
          boardStr += (row + col) % 2 === 0 ? LIGHT_SQUARE : DARK_SQUARE
          boardStr += piece?.color === PieceColor.White ? WHITE_PIECE : BLACK_PIECE
          boardStr +=
            (piece?.color === PieceColor.White ? whitePieces : blackPieces)[piece?.type] || ' '
          boardStr += ' '
          boardStr += RESET
        }
        boardStr += '\n'
      }
      console.log(boardStr)
    }
  }
}

export default Chess
