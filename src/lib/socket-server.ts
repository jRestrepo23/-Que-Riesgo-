import { Server as HTTPServer } from "http"
import { Server, Socket } from "socket.io"
import { gameManager } from "./game-state"

let io: Server | null = null

export function initSocketIO(server: HTTPServer) {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    })

    io.on("connection", (socket: Socket) => {
      console.log(`Socket connected: ${socket.id}`)

      socket.on("create-room", async () => {
        try {
          const { roomId, roomCode } = await gameManager.createRoom()
          socket.join(roomId)
          socket.data.roomId = roomId
          socket.data.isHost = true
          socket.data.hostSocketId = socket.id

          // Guardar el socket ID del host en la BD
          await gameManager.getRoom(roomId).then((room) => {
            if (room) {
              // Actualizar room con hostSocketId
              ;(gameManager as any).db?.room?.update?.({
                where: { id: roomId },
                data: { hostSocketId: socket.id },
              })
            }
          })

          socket.emit("room-created", { roomId, roomCode })
        } catch (error) {
          console.error("Error creating room:", error)
          socket.emit("error", { message: "Error creating room" })
        }
      })

      socket.on("join-room", async ({ roomCode, playerName }: any) => {
        try {
          const room = await gameManager.getRoomByCode(roomCode)
          if (!room) {
            socket.emit("join-error", {
              message:
                "El código de sala es incorrecto o no existe. Compruébalo e inténtalo de nuevo.",
            })
            return
          }
          if (room.phase !== "waiting") {
            socket.emit("join-error", { message: "El juego ya comenzó" })
            return
          }

          const added = await gameManager.addPlayer(room.id, socket.id, playerName)
          if (!added) {
            socket.emit("join-error", { message: "No se pudo unir a la sala" })
            return
          }

          socket.join(room.id)
          socket.data.roomId = room.id
          socket.data.playerName = playerName
          socket.data.isHost = false

          socket.emit("joined-room", {
            roomId: room.id,
            playerName,
          })

          const players = await gameManager.getPlayers(room.id)
          io?.to(room.id).emit("players-updated", { players })
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
            io?.to(roomId).emit("game-started", { players })

            const room = await gameManager.getRoom(roomId)
            if (room?.currentRiskId) {
              const roundData = await gameManager.getRoundData(roomId)
              io?.to(roomId).emit("round-intro", roundData)
            }
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
            io?.to(roomId).emit("round-active")
          }
        } catch (error) {
          console.error("Error starting timer:", error)
          socket.emit("error", { message: "Error starting timer" })
        }
      })

      socket.on("submit-answer", async ({ riskId }: any) => {
        const roomId = socket.data.roomId
        if (!roomId) return

        try {
          const result = await gameManager.submitAnswer(roomId, socket.id, riskId)
          if (result) {
            socket.emit("answer-result", result)
          }
        } catch (error) {
          console.error("Error submitting answer:", error)
        }
      })

      socket.on("end-round", async () => {
        const roomId = socket.data.roomId
        if (!roomId || !socket.data.isHost) return

        try {
          await gameManager.endRound(roomId)
          const roundResults = await gameManager.getRoundResults(roomId)
          io?.to(roomId).emit("round-results", roundResults)
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
            io?.to(roomId).emit("game-finished", { leaderboard })
          } else {
            const roundData = await gameManager.getRoundData(roomId)
            io?.to(roomId).emit("round-intro", roundData)
          }
        } catch (error) {
          console.error("Error advancing round:", error)
        }
      })

      socket.on("disconnect", async () => {
        console.log(`Socket disconnected: ${socket.id}`)
        const roomId = socket.data.roomId
        if (roomId) {
          try {
            await gameManager.removePlayer(roomId, socket.id)
            const room = await gameManager.getRoom(roomId)
            if (room) {
              const players = await gameManager.getPlayers(roomId)
              io?.to(roomId).emit("players-updated", { players })
            }
          } catch (error) {
            console.error("Error removing player:", error)
          }
        }
      })
    })
  }

  return io
}

export function getIO() {
  return io
}
