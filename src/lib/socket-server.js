const { Server } = require("socket.io")
const {
  gameManager,
  setOnRoundTimerEnded,
} = require("./game-state.cjs")

/** Pausa con resultados de ronda antes de la siguiente pregunta. */
const RESULTS_PAUSE_MS = 3500

/** Tiempo tras mostrar emojis antes de iniciar la cuenta atrás de 10s. */
const ROUND_INTRO_DELAY_MS = 900

let io = null

// Fix 3 + Fix 5: socketId → DB player id (handles reconnects)
const playerIdBySocket = new Map()
// Fix 5: players disconnected mid-game; key = "roomId:name"
const disconnectedPlayers = new Map()

function cleanupRoomTracking(roomId) {
  for (const [key, val] of disconnectedPlayers.entries()) {
    if (val.roomId === roomId) disconnectedPlayers.delete(key)
  }
}

async function notifyRoundEndedAutoAdvance(roomId) {
  try {
    const roundResults = await gameManager.getRoundResults(roomId)
    if (roundResults && io) {
      io.to(roomId).emit("round-results", roundResults)
    }
    setTimeout(() => advanceAfterRoundResults(roomId), RESULTS_PAUSE_MS)
  } catch (error) {
    console.error("notifyRoundEndedAutoAdvance:", error)
  }
}

async function advanceAfterRoundResults(roomId) {
  try {
    const hasMore = await gameManager.nextRound(roomId)
    const room = await gameManager.getRoom(roomId)
    if (!hasMore || room?.phase === "finished") {
      const leaderboard = await gameManager.getLeaderboard(roomId)
      if (io) {
        io.to(roomId).emit("game-finished", { leaderboard })
      }
      cleanupRoomTracking(roomId)
      return
    }
    const roundData = await gameManager.getRoundData(roomId)
    if (roundData && io) {
      io.to(roomId).emit("round-intro", roundData)
      scheduleIntroThenActive(roomId)
    }
  } catch (error) {
    console.error("advanceAfterRoundResults:", error)
  }
}

function scheduleIntroThenActive(roomId) {
  setTimeout(async () => {
    try {
      const started = await gameManager.startRoundTimer(roomId)
      if (started && io) {
        io.to(roomId).emit("round-active", { startedAt: Date.now() })
      }
    } catch (error) {
      console.error("scheduleIntroThenActive:", error)
    }
  }, ROUND_INTRO_DELAY_MS)
}

function initSocketIO(server) {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    })

    setOnRoundTimerEnded((roomId) => notifyRoundEndedAutoAdvance(roomId))

    io.on("connection", (socket) => {
      console.log(`Socket connected: ${socket.id}`)

      socket.on("create-room", async () => {
        try {
          const { roomId, roomCode } = await gameManager.createRoom()
          socket.join(roomId)
          socket.data.roomId = roomId
          socket.data.isHost = true
          socket.data.hostSocketId = socket.id

          socket.emit("room-created", { roomId, roomCode })
        } catch (error) {
          console.error("Error creating room:", error)
          socket.emit("error", { message: "Error creating room" })
        }
      })

      socket.on("join-room", async ({ roomCode, playerName }) => {
        try {
          const room = await gameManager.getRoomByCode(roomCode)
          if (!room) {
            socket.emit("join-error", {
              message: "El código de sala es incorrecto o no existe. Compruébalo e inténtalo de nuevo.",
            })
            return
          }

          // Reconexión: jugador que se desconectó durante una partida activa
          const reconnectKey = `${room.id}:${playerName}`
          const disconnected = disconnectedPlayers.get(reconnectKey)
          if (disconnected && room.phase !== "waiting") {
            disconnectedPlayers.delete(reconnectKey)
            playerIdBySocket.set(socket.id, disconnected.playerId)
            socket.join(room.id)
            socket.data.roomId = room.id
            socket.data.playerName = playerName
            socket.data.isHost = false

            socket.emit("joined-room", { roomId: room.id, playerName })

            // Reenviar estado actual de la partida
            if (room.phase === "round-intro" || room.phase === "round-active") {
              const roundData = await gameManager.getRoundData(room.id)
              if (roundData) socket.emit("round-intro", roundData)
              if (room.phase === "round-active") {
                socket.emit("round-active", { startedAt: Number(room.roundStartTime ?? BigInt(Date.now())) })
              }
            } else if (room.phase === "round-results") {
              const roundResults = await gameManager.getRoundResults(room.id)
              if (roundResults) socket.emit("round-results", roundResults)
            } else if (room.phase === "finished") {
              const leaderboard = await gameManager.getLeaderboard(room.id)
              socket.emit("game-finished", { leaderboard })
            }
            return
          }

          if (room.phase !== "waiting") {
            socket.emit("join-error", { message: "El juego ya comenzó" })
            return
          }

          // Si el nombre ya existe en la sala, verificar si ese socket sigue activo.
          // Si está desconectado (jugador fantasma), eliminarlo y reutilizar el nombre.
          // Si sigue conectado, asignar un nombre único: "Nombre 2", "Nombre 3", etc.
          const existingPlayers = await gameManager.getPlayers(room.id)
          for (const p of existingPlayers) {
            if (p.name === playerName) {
              const sockets = await io.in(room.id).fetchSockets()
              const stillConnected = sockets.some((s) => s.id === p.id)
              if (!stillConnected) {
                await gameManager.removePlayer(room.id, p.id)
              }
            }
          }
          const activePlayers = await gameManager.getPlayers(room.id)
          const takenNames = new Set(activePlayers.map((p) => p.name))
          let finalName = playerName
          let suffix = 2
          while (takenNames.has(finalName)) {
            finalName = `${playerName} ${suffix++}`
          }

          const added = await gameManager.addPlayer(room.id, socket.id, finalName)
          if (!added) {
            socket.emit("join-error", { message: "No se pudo unir a la sala" })
            return
          }

          socket.join(room.id)
          socket.data.roomId = room.id
          socket.data.playerName = finalName
          socket.data.isHost = false
          playerIdBySocket.set(socket.id, socket.id)

          socket.emit("joined-room", { roomId: room.id, playerName: finalName })

          const players = await gameManager.getPlayers(room.id)
          io.to(room.id).emit("players-updated", { players })
        } catch (error) {
          console.error("Error joining room:", error)
          socket.emit("join-error", { message: "Error al unirse" })
        }
      })

      socket.on("start-game", async () => {
        const roomId = socket.data.roomId
        if (!roomId || !socket.data.isHost) return

        try {
          const started = await gameManager.startGame(roomId)
          if (started) {
            const players = await gameManager.getPlayers(roomId)
            const roundData =
              (await gameManager.getRoundData(roomId)) || {
                roundIndex: 0,
                totalRounds: 0,
                emojis: [],
                options: [],
              }

            io.to(roomId).emit("round-intro", roundData)
            scheduleIntroThenActive(roomId)
            io.to(roomId).emit("game-started", { players })
          } else {
            socket.emit("error", {
              message:
                "No se pudo iniciar (¿hay riesgos en la BD? ¿sala esperando?).",
            })
          }
        } catch (error) {
          console.error("Error starting game:", error)
          socket.emit("error", { message: "Error starting game" })
        }
      })

      socket.on("start-timer", async () => {
        const roomId = socket.data.roomId
        if (!roomId || !socket.data.isHost) return

        try {
          const started = await gameManager.startRoundTimer(roomId)
          if (started) {
            io.to(roomId).emit("round-active", { startedAt: Date.now() })
          }
        } catch (error) {
          console.error("Error starting timer:", error)
          socket.emit("error", { message: "Error starting timer" })
        }
      })

      socket.on("submit-answer", async ({ riskId }) => {
        const roomId = socket.data.roomId
        if (!roomId) return

        try {
          const playerId = playerIdBySocket.get(socket.id) || socket.id
          const result = await gameManager.submitAnswer(roomId, playerId, riskId)
          if (result) {
            socket.emit("answer-result", { correct: result.correct, points: result.points })
            io.to(roomId).emit("answer-progress", {
              answered: result.answeredCount,
              total: result.totalPlayers,
            })
          }
        } catch (error) {
          console.error("Error submitting answer:", error)
        }
      })

      socket.on("end-round", async () => {
        const roomId = socket.data.roomId
        if (!roomId || !socket.data.isHost) return

        try {
          const ended = await gameManager.endRound(roomId)
          if (ended) {
            await notifyRoundEndedAutoAdvance(roomId)
          }
        } catch (error) {
          console.error("Error ending round:", error)
        }
      })

      socket.on("next-round", async () => {
        const roomId = socket.data.roomId
        if (!roomId || !socket.data.isHost) return

        try {
          const hasMore = await gameManager.nextRound(roomId)
          const room = await gameManager.getRoom(roomId)

          if (!hasMore || room?.phase === "finished") {
            const leaderboard = await gameManager.getLeaderboard(roomId)
            io.to(roomId).emit("game-finished", { leaderboard })
          } else {
            const roundData = await gameManager.getRoundData(roomId)
            io.to(roomId).emit("round-intro", roundData)
            scheduleIntroThenActive(roomId)
          }
        } catch (error) {
          console.error("Error advancing round:", error)
        }
      })

      socket.on("disconnect", async () => {
        console.log(`Socket disconnected: ${socket.id}`)
        const roomId = socket.data.roomId
        if (!roomId) return

        const playerId = playerIdBySocket.get(socket.id) || socket.id
        playerIdBySocket.delete(socket.id)

        try {
          const room = await gameManager.getRoom(roomId)
          if (!room) return

          if (!socket.data.isHost && room.phase !== "waiting") {
            // Partida activa: conservar jugador en DB para posible reconexión
            if (socket.data.playerName) {
              disconnectedPlayers.set(`${roomId}:${socket.data.playerName}`, {
                playerId,
                name: socket.data.playerName,
                roomId,
              })
            }
          } else if (!socket.data.isHost) {
            // Sala de espera: eliminar normalmente
            await gameManager.removePlayer(roomId, playerId)
            const players = await gameManager.getPlayers(roomId)
            io.to(roomId).emit("players-updated", { players })
          }
        } catch (error) {
          console.error("Error on disconnect:", error)
        }
      })
    })
  }

  return io
}

function getIO() {
  return io
}

module.exports = { initSocketIO, getIO }
