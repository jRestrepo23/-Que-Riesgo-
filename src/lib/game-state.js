const { RISKS, BASE_POINTS, MAX_SPEED_BONUS } = require("./risks-data.js")

const ROOM_CODE_LENGTH = 4

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function shuffleArray(arr) {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

class GameManager {
  constructor() {
    this.rooms = new Map()
  }

  createRoom() {
    const roomId = crypto.randomUUID()
    const roomCode = generateRoomCode()
    this.rooms.set(roomId, {
      roomId,
      phase: "waiting",
      players: new Map(),
      currentRound: 0,
      currentRisk: null,
      roundOptions: [],
      roundStartTime: 0,
      roundResults: [],
      roundAnswerOrder: [],
    })
    return { roomId, roomCode }
  }

  getRoom(roomId) {
    return this.rooms.get(roomId)
  }

  getRoomByCode(code) {
    for (const room of this.rooms.values()) {
      if (room.roomId.slice(0, ROOM_CODE_LENGTH).toUpperCase() === code.toUpperCase()) {
        return room
      }
    }
    return undefined
  }

  addPlayer(roomId, playerId, name) {
    const room = this.rooms.get(roomId)
    if (!room || room.phase !== "waiting") return false
    if (room.players.has(playerId)) return false
    room.players.set(playerId, {
      id: playerId,
      name,
      score: 0,
      answers: [],
    })
    return true
  }

  removePlayer(roomId, playerId) {
    const room = this.rooms.get(roomId)
    if (room) {
      room.players.delete(playerId)
    }
  }

  getPlayers(roomId) {
    const room = this.rooms.get(roomId)
    return room ? Array.from(room.players.values()) : []
  }

  startGame(roomId) {
    const room = this.rooms.get(roomId)
    if (!room || room.players.size === 0) return false
    room.phase = "round-intro"
    room.currentRound = 0
    room.roundResults = []
    this.setupRound(room)
    return true
  }

  setupRound(room) {
    const shuffledRisks = shuffleArray(RISKS)
    const correctRisk = shuffledRisks[0]
    const options = shuffleArray(shuffledRisks.slice(0, 6))

    room.currentRisk = correctRisk
    room.roundOptions = options
    room.roundAnswerOrder = []
    room.roundStartTime = 0
  }

  startRoundTimer(roomId) {
    const room = this.rooms.get(roomId)
    if (!room || room.phase !== "round-intro") return false
    room.phase = "round-active"
    room.roundStartTime = Date.now()
    return true
  }

  submitAnswer(roomId, playerId, riskId) {
    const room = this.rooms.get(roomId)
    if (!room || room.phase !== "round-active") return null
    if (!room.currentRisk) return null
    if (room.roundAnswerOrder.includes(playerId)) return null

    const player = room.players.get(playerId)
    if (!player) return null

    const correct = riskId === room.currentRisk.id
    const answerOrder = room.roundAnswerOrder.length
    room.roundAnswerOrder.push(playerId)

    let points = 0
    if (correct) {
      const speedBonus = Math.round(
        MAX_SPEED_BONUS * (1 - answerOrder / Math.max(room.players.size, 1))
      )
      points = BASE_POINTS + speedBonus
      player.score += points
    }

    player.answers.push({
      round: room.currentRound,
      correct,
      points,
    })

    return { correct, points }
  }

  endRound(roomId) {
    const room = this.rooms.get(roomId)
    if (!room || room.phase !== "round-active" || !room.currentRisk) return null

    room.phase = "round-results"

    const playerResults = Array.from(room.players.values()).map((p) => {
      const lastAnswer = p.answers[p.answers.length - 1]
      return {
        playerId: p.id,
        correct: lastAnswer?.correct ?? false,
        points: lastAnswer?.points ?? 0,
      }
    })

    const correctCount = playerResults.filter((r) => r.correct).length

    const result = {
      roundIndex: room.currentRound,
      correctRisk: room.currentRisk,
      totalPlayers: room.players.size,
      correctCount,
      playerResults,
    }

    room.roundResults.push(result)
    return result
  }

  nextRound(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return false

    room.currentRound++
    if (room.currentRound >= RISKS.length) {
      room.phase = "finished"
      return false
    }

    room.phase = "round-intro"
    this.setupRound(room)
    return true
  }

  getLeaderboard(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return []
    return Array.from(room.players.values()).sort((a, b) => b.score - a.score)
  }

  resetRoom(roomId) {
    this.rooms.delete(roomId)
  }
}

const gameManager = new GameManager()

module.exports = { gameManager }
