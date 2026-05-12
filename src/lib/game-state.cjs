const { PrismaClient } = require("@prisma/client")

const db = new PrismaClient()

const ROOM_CODE_LENGTH = 4
const BASE_POINTS = 100
const MAX_SPEED_BONUS = 200
const ROUND_DURATION_MS = 16_000

const activeTimers = new Map()

/** Se registra desde socket-server para emitir resultados y avanzar de ronda. */
let onRoundTimerEnded = null

function setOnRoundTimerEnded(handler) {
  onRoundTimerEnded = typeof handler === "function" ? handler : null
}
const roundOptions = new Map()
const roundAnswerOrder = new Map()

/** Orden estable de preguntas por sala: ids de rq_risks ordenados al iniciar la partida. */
const roomFixedRiskOrder = new Map()

/** Normaliza campo Json `emojis` de Prisma a string[]. */
function asEmojiArray(emojis) {
  if (!emojis) return []
  if (Array.isArray(emojis)) return emojis.map(String)
  return []
}

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

  async getRoom(roomId) {
    return await db.room.findUnique({
      where: { id: roomId },
      include: { players: true, roundResults: true },
    })
  }

  async getRoomByCode(code) {
    return await db.room.findUnique({
      where: { code },
      include: { players: true },
    })
  }

  async addPlayer(roomId, playerId, playerName) {
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

  async removePlayer(roomId, playerId) {
    try {
      await db.player.delete({
        where: {
          roomId_id: { roomId, id: playerId },
        },
      })

      const remainingPlayers = await db.player.count({
        where: { roomId },
      })

      if (remainingPlayers === 0) {
        await this.resetRoom(roomId)
      }
    } catch (error) {
      console.error("Error removing player:", error)
    }
  }

  async getPlayers(roomId) {
    return await db.player.findMany({
      where: { roomId },
      orderBy: { score: "desc" },
    })
  }

  async startGame(roomId) {
    const room = await this.getRoom(roomId)
    if (!room || room.phase !== "waiting") {
      return false
    }

    try {
      const risksSorted = await db.risk.findMany({
        orderBy: { id: "asc" },
      })

      if (risksSorted.length === 0) {
        throw new Error(
          "No hay riesgos en la base de datos. Ejecuta: npm run prisma:seed (y prisma db push si aplica)."
        )
      }

      roomFixedRiskOrder.set(
        roomId,
        risksSorted.map((r) => r.id)
      )

      await db.room.update({
        where: { id: roomId },
        data: { currentRound: 0 },
      })

      await this.setupRound(roomId)
    } catch (err) {
      console.error("setupRound:", err.message || err)
      roomFixedRiskOrder.delete(roomId)
      return false
    }

    await db.room.update({
      where: { id: roomId },
      data: { phase: "round-intro" },
    })

    return true
  }

  async setupRound(roomId) {
    let order = roomFixedRiskOrder.get(roomId)

    if (!order?.length) {
      const risksSorted = await db.risk.findMany({
        orderBy: { id: "asc" },
      })
      if (risksSorted.length === 0) {
        throw new Error(
          "No hay riesgos en la base de datos. Ejecuta: npm run prisma:seed (y prisma db push si aplica)."
        )
      }
      order = risksSorted.map((r) => r.id)
      roomFixedRiskOrder.set(roomId, order)
    }

    const room = await this.getRoom(roomId)
    if (!room) {
      throw new Error("Sala no encontrada")
    }

    const idx = room.currentRound
    if (idx < 0 || idx >= order.length) {
      throw new Error(`Ronda fuera de rango (${idx}/${order.length})`)
    }

    const correctRiskId = order[idx]

    const optionsDisplayed = shuffleArray([...order])

    roundOptions.set(roomId, optionsDisplayed)
    roundAnswerOrder.set(roomId, [])

    await db.room.update({
      where: { id: roomId },
      data: { currentRiskId: correctRiskId },
    })
  }

  async startRoundTimer(roomId) {
    const room = await this.getRoom(roomId)
    if (!room || room.phase !== "round-intro") return false

    await db.room.update({
      where: { id: roomId },
      data: {
        phase: "round-active",
        roundStartTime: BigInt(Date.now()),
      },
    })

    const existingTimer = activeTimers.get(roomId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(async () => {
      activeTimers.delete(roomId)
      try {
        const ended = await this.endRound(roomId)
        if (ended && onRoundTimerEnded) {
          await onRoundTimerEnded(roomId)
        }
      } catch (err) {
        console.error("Error al finalizar ronda por temporizador:", err)
      }
    }, ROUND_DURATION_MS)

    activeTimers.set(roomId, timer)

    return true
  }

  async submitAnswer(roomId, playerId, riskId) {
    const room = await this.getRoom(roomId)
    if (!room || room.phase !== "round-active") return null

    const existing = await db.answer.findFirst({
      where: { playerId, roomId, roundIndex: room.currentRound },
    })
    if (existing) return null

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

    if (isCorrect) {
      await db.player.update({
        where: { roomId_id: { roomId, id: playerId } },
        data: { score: { increment: points } },
      })
    }

    answerOrder.push(playerId)
    roundAnswerOrder.set(roomId, answerOrder)

    return {
      correct: isCorrect,
      points,
      answeredCount: answerOrder.length,
      totalPlayers: playerCount,
    }
  }

  async endRound(roomId) {
    const room = await this.getRoom(roomId)
    if (!room || room.phase !== "round-active") return false

    const timer = activeTimers.get(roomId)
    if (timer) {
      clearTimeout(timer)
      activeTimers.delete(roomId)
    }

    const answers = await db.answer.findMany({
      where: { roomId, roundIndex: room.currentRound },
    })

    const correctCount = answers.filter((a) => a.correct).length
    const totalPlayers = room.players.length

    await db.roundResult.create({
      data: {
        roomId,
        roundIndex: room.currentRound,
        correctRiskId: room.currentRiskId || "",
        totalPlayers,
        correctCount,
      },
    })

    await db.room.update({
      where: { id: roomId },
      data: { phase: "round-results" },
    })

    roundAnswerOrder.delete(roomId)
    return true
  }

  async nextRound(roomId) {
    const room = await this.getRoom(roomId)
    if (!room) return false

    const order = roomFixedRiskOrder.get(roomId) || []
    const lastRoundIndex = Math.max(0, order.length - 1)

    if (order.length === 0 || room.currentRound >= lastRoundIndex) {
      await db.room.update({
        where: { id: roomId },
        data: { phase: "finished" },
      })
      return true
    }

    await db.room.update({
      where: { id: roomId },
      data: { currentRound: room.currentRound + 1 },
    })

    await this.setupRound(roomId)
    await db.room.update({
      where: { id: roomId },
      data: { phase: "round-intro" },
    })

    return true
  }

  async getLeaderboard(roomId) {
    return await db.player.findMany({
      where: { roomId },
      orderBy: { score: "desc" },
      include: {
        _count: { select: { answers: true } },
      },
    })
  }

  async resetRoom(roomId) {
    const timer = activeTimers.get(roomId)
    if (timer) {
      clearTimeout(timer)
      activeTimers.delete(roomId)
    }

    roundOptions.delete(roomId)
    roundAnswerOrder.delete(roomId)
    roomFixedRiskOrder.delete(roomId)

    try {
      await db.room.delete({
        where: { id: roomId },
      })
    } catch (error) {
      console.error("Error resetting room:", error)
    }
  }

  async getRoundData(roomId) {
    const room = await this.getRoom(roomId)
    if (!room) return null

    const fixedOrder = roomFixedRiskOrder.get(roomId) || []
    const optionIds = roundOptions.get(roomId) || []

    const risks = await db.risk.findMany({
      where: { id: { in: optionIds } },
    })

    const byId = new Map(risks.map((r) => [r.id, r]))
    const orderedForUi = optionIds.map((id) => byId.get(id)).filter(Boolean)

    let correctRisk = room.currentRiskId ? byId.get(room.currentRiskId) : null
    if (!correctRisk && room.currentRiskId) {
      correctRisk = await db.risk.findUnique({
        where: { id: room.currentRiskId },
      })
    }

    return {
      roundIndex: room.currentRound,
      totalRounds: fixedOrder.length || orderedForUi.length,
      emojis: asEmojiArray(correctRisk?.emojis),
      options: orderedForUi.map((r) => ({ id: r.id, name: r.name })),
    }
  }

  async getRoundResults(roomId) {
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

const gameManager = new GameManager()

module.exports = { gameManager, db, ROUND_DURATION_MS, setOnRoundTimerEnded }
