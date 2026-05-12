declare module "@/lib/game-state" {
  interface Player {
    id: string
    name: string
    score: number
    answers: { round: number; correct: boolean; points: number }[]
  }

  interface GameManager {
    createRoom(): { roomId: string; roomCode: string }
    getRoom(roomId: string): unknown
    getRoomByCode(code: string): unknown
    addPlayer(roomId: string, playerId: string, name: string): boolean
    removePlayer(roomId: string, playerId: string): void
    getPlayers(roomId: string): Player[]
    startGame(roomId: string): boolean
    startRoundTimer(roomId: string): boolean
    submitAnswer(
      roomId: string,
      playerId: string,
      riskId: string
    ): { correct: boolean; points: number } | null
    endRound(roomId: string): unknown
    nextRound(roomId: string): boolean
    getLeaderboard(roomId: string): Player[]
    resetRoom(roomId: string): void
  }

  export const gameManager: GameManager
}
