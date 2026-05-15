import { db } from "./db"

const ROOM_CODE_LENGTH = 4
const BASE_POINTS = 100
const MAX_SPEED_BONUS = 200
const ROUND_DURATION_MS = 25_000

// Estado efímero: timers activos, opciones barajadas, orden de respuestas
const activeTimers = new Map<string, NodeJS.Timeout>()
const roundOptions = new Map<string, string[]>() // roomId -> [riskIds]
const roundAnswerOrder = new Map<string, string[]>() // roomId -> [playerIds]

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export class GameManager {
  async createRoom() {
    const roomCode = generateRoomCode()
    const room = await db.room.create({
      data: {
        code: roomCode,
        phase: "waiting",
      },
    })
    return { roomId: room.id, roomCode }
  }

  async getRoom(roomId: string) {
    return await db.room.findUnique({
      where: { id: roomId },
      include: { players: true, roundResults: true },
    })
  }

  async getRoomByCode(code: string) {
    return await db.room.findUnique({
      where: { code },
      include: { players: true },
    })
  }

  async addPlayer(roomId: string, playerId: string, playerName: string) {
    try {
      const room = await this.getRoom(roomId)
      if (!room || room.phase !== "waiting") {
        return false
      }

      await db.player.create({
        data: {
          id: playerId,
          roomId,
          name: playerName,
        },
      })
      return true
    } catch (error) {
      return false
    }
  }

  async removePlayer(roomId: string, playerId: string) {
    await db.player.delete({
      where: {
        roomId_id: { roomId, id: playerId },
      },
    })

    // Si la sala queda vacía, limpiarla
    const remainingPlayers = await db.player.count({
      where: { roomId },
    })

    if (remainingPlayers === 0) {
      await this.resetRoom(roomId)
    }
  }

  async getPlayers(roomId: string) {
    return await db.player.findMany({
      where: { roomId },
      orderBy: { score: "desc" },
    })
  }

  async startGame(roomId: string) {
    const room = await this.getRoom(roomId)
    if (!room || room.phase !== "waiting") {
      return false
    }

    await this.setupRound(roomId)
    await db.room.update({
      where: { id: roomId },
      data: { phase: "round-intro" },
    })

    return true
  }

  async setupRound(roomId: string) {
    const risks = await db.risk.findMany()
    const shuffled = shuffleArray(risks.map((r) => r.id))

    const correctRiskId = shuffled[0]
    const options = shuffled.slice(0, 6)

    roundOptions.set(roomId, options)
    roundAnswerOrder.set(roomId, [])

    await db.room.update({
      where: { id: roomId },
      data: { currentRiskId: correctRiskId },
    })
  }

  async startRoundTimer(roomId: string) {
    const room = await this.getRoom(roomId)
    if (!room) return false

    await db.room.update({
      where: { id: roomId },
      data: {
        phase: "round-active",
        roundStartTime: BigInt(Date.now()),
      },
    })

    // Limpiar timer anterior si existe
    const existingTimer = activeTimers.get(roomId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Auto end-round después de ROUND_DURATION_MS
    const timer = setTimeout(() => {
      this.endRound(roomId)
    }, ROUND_DURATION_MS)

    activeTimers.set(roomId, timer)

    return true
  }

  async submitAnswer(
    roomId: string,
    playerId: string,
    riskId: string
  ): Promise<{ correct: boolean; points: number } | null> {
    const room = await this.getRoom(roomId)
    if (!room || room.phase !== "round-active") {
      return null
    }

    const answerOrder = roundAnswerOrder.get(roomId) || []
    const playerCount = room.players.length
    const answerIndex = answerOrder.length
    const isCorrect = riskId === room.currentRiskId

    let points = 0
    if (isCorrect) {
      const speedBonus = Math.round(
        MAX_SPEED_BONUS * (1 - answerIndex / Math.max(playerCount, 1))
      )
      points = BASE_POINTS + speedBonus
    }

    // Registrar respuesta
    await db.answer.create({
      data: {
        playerId,
        roomId,
        roundIndex: room.currentRound,
        riskId,
        correct: isCorrect,
        points,
        answerOrder: answerIndex,
      },
    })

    // Actualizar score del jugador
    if (isCorrect) {
      await db.player.update({
        where: { roomId_id: { roomId, id: playerId } },
        data: { score: { increment: points } },
      })
    }

    // Registrar orden de respuesta
    answerOrder.push(playerId)
    roundAnswerOrder.set(roomId, answerOrder)

    return { correct: isCorrect, points }
  }

  async endRound(roomId: string) {
    const room = await this.getRoom(roomId)
    if (!room) return

    // Limpiar timer
    const timer = activeTimers.get(roomId)
    if (timer) {
      clearTimeout(timer)
      activeTimers.delete(roomId)
    }

    // Contar respuestas correctas
    const answers = await db.answer.findMany({
      where: { roomId, roundIndex: room.currentRound },
    })

    const correctCount = answers.filter((a) => a.correct).length
    const totalPlayers = room.players.length

    // Guardar resultado de ronda
    await db.roundResult.create({
      data: {
        roomId,
        roundIndex: room.currentRound,
        correctRiskId: room.currentRiskId || "",
        totalPlayers,
        correctCount,
      },
    })

    // Cambiar fase
    await db.room.update({
      where: { id: roomId },
      data: { phase: "round-results" },
    })

    // Limpiar estado efímero de esta ronda
    roundAnswerOrder.delete(roomId)
  }

  async nextRound(roomId: string) {
    const room = await this.getRoom(roomId)
    if (!room) return false

    if (room.currentRound >= 5) {
      // 6 rondas totales (0-5)
      await db.room.update({
        where: { id: roomId },
        data: { phase: "finished" },
      })
      return true
    }

    // Avanzar ronda
    await db.room.update({
      where: { id: roomId },
      data: { currentRound: room.currentRound + 1 },
    })

    // Setup siguiente ronda
    await this.setupRound(roomId)
    await db.room.update({
      where: { id: roomId },
      data: { phase: "round-intro" },
    })

    return true
  }

  async getLeaderboard(roomId: string) {
    return await db.player.findMany({
      where: { roomId },
      orderBy: { score: "desc" },
    })
  }

  async resetRoom(roomId: string) {
    // Limpiar timers
    const timer = activeTimers.get(roomId)
    if (timer) {
      clearTimeout(timer)
      activeTimers.delete(roomId)
    }

    // Limpiar estado efímero
    roundOptions.delete(roomId)
    roundAnswerOrder.delete(roomId)

    // Eliminar room y cascada borra players, answers, roundResults
    await db.room.delete({
      where: { id: roomId },
    })
  }

  // Obtener datos para mostrar ronda en progreso
  async getRoundData(roomId: string) {
    const room = await this.getRoom(roomId)
    if (!room) return null

    const options = roundOptions.get(roomId) || []
    const risks = await db.risk.findMany({
      where: { id: { in: options } },
    })

    return {
      roundIndex: room.currentRound,
      emojis: room.currentRiskId
        ? (risks.find((r) => r.id === room.currentRiskId)?.emojis as string[])
        : [],
      options: risks.map((r) => ({ id: r.id, name: r.name })),
    }
  }

  // Obtener datos de resultado de ronda
  async getRoundResults(roomId: string) {
    const room = await this.getRoom(roomId)
    if (!room) return null

    const risk = await db.risk.findUnique({
      where: { id: room.currentRiskId || "" },
    })

    const answers = await db.answer.findMany({
      where: { roomId, roundIndex: room.currentRound },
      orderBy: { answeredAt: "asc" },
    })

    const correctCount = answers.filter((a) => a.correct).length

    return {
      correctRisk: risk,
      totalPlayers: room.players.length,
      correctCount,
      playerResults: answers.map((a) => ({
        playerId: a.playerId,
        correct: a.correct,
        points: a.points,
      })),
    }
  }
}

export const gameManager = new GameManager()
