"use client"

import { useEffect, useState, useCallback } from "react"
import type { Socket } from "socket.io-client"

interface Player {
  id: string
  name: string
  score: number
  answers?: { round: number; correct: boolean; points: number }[]
  _count?: { answers: number }
}

interface RoomCreatedPayload {
  roomId: string
  roomCode: string
}

interface PlayersUpdatedPayload {
  players: Player[]
}

interface RoundIntroPayload {
  roundIndex: number
  totalRounds: number
  emojis: string[]
  options: { id: string; name: string }[]
}

interface RoundResultsPayload {
  correctRisk: { id: string; name: string; emojis: string[]; level: string }
  totalPlayers: number
  correctCount: number
  playerResults: { playerId: string; correct: boolean; points: number }[]
}

interface GameFinishedPayload {
  leaderboard: Player[]
}

interface ErrorPayload {
  message: string
}

interface JoinedRoomPayload {
  roomId: string
  playerName: string
}

interface JoinErrorPayload {
  message: string
}

interface AnswerResultPayload {
  correct: boolean
  points: number
}

interface RoundActivePayload {
  startedAt?: number
}

interface AnswerProgressPayload {
  answered: number
  total: number
}

let sharedSocket: Socket | null = null

async function getSocketIO() {
  const { io } = await import("socket.io-client")
  return io
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (!sharedSocket) {
        const io = await getSocketIO()
        sharedSocket = io({
          transports: ["websocket", "polling"],
        })

        sharedSocket.on("connect", () => {
          if (!cancelled) setConnected(true)
        })

        sharedSocket.on("disconnect", () => {
          if (!cancelled) setConnected(false)
        })
      }

      if (!cancelled) {
        setSocket(sharedSocket)
        if (sharedSocket.connected) {
          setConnected(true)
        }
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [])

  return { socket, connected }
}

export function useHostSocket() {
  const { socket, connected } = useSocket()
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [phase, setPhase] = useState<string>("idle")
  const [currentRound, setCurrentRound] = useState(0)
  const [emojis, setEmojis] = useState<string[]>([])
  const [options, setOptions] = useState<{ id: string; name: string }[]>([])
  const [roundResults, setRoundResults] = useState<RoundResultsPayload | null>(null)
  const [leaderboard, setLeaderboard] = useState<Player[]>([])
  const [roundStartedAt, setRoundStartedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [totalRounds, setTotalRounds] = useState(6)
  const [answerProgress, setAnswerProgress] = useState<{ answered: number; total: number } | null>(null)

  useEffect(() => {
    if (!socket) return

    const handlers = {
      "room-created": ({ roomId: rid, roomCode: code }: RoomCreatedPayload) => {
        setRoomId(rid)
        setRoomCode(code)
        setPhase("waiting")
      },
      "players-updated": ({ players: p }: PlayersUpdatedPayload) => {
        setPlayers(p)
      },
      "game-started": ({ players: p }: PlayersUpdatedPayload) => {
        setPlayers(p)
      },
      "round-intro": ({
        roundIndex,
        totalRounds: tr,
        emojis: e,
        options: o,
      }: RoundIntroPayload) => {
        setCurrentRound(roundIndex)
        setTotalRounds(tr > 0 ? tr : 6)
        setEmojis(e)
        setOptions(o)
        setPhase("round-intro")
        setRoundResults(null)
        setRoundStartedAt(null)
      },
      "round-active": ({ startedAt }: RoundActivePayload = {}) => {
        setPhase("round-active")
        setRoundStartedAt(startedAt ?? Date.now())
        setAnswerProgress(null)
      },
      "answer-progress": ({ answered, total }: AnswerProgressPayload) => {
        setAnswerProgress({ answered, total })
      },
      "round-results": (data: RoundResultsPayload) => {
        setRoundResults(data)
        setPhase("round-results")
      },
      "game-finished": ({ leaderboard: lb }: GameFinishedPayload) => {
        setLeaderboard(lb)
        setPhase("finished")
      },
      error: ({ message }: ErrorPayload) => {
        setError(message)
      },
    }

    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event, handler)
    }

    return () => {
      for (const [event, handler] of Object.entries(handlers)) {
        socket.off(event, handler)
      }
    }
  }, [socket])

  const createRoom = useCallback(() => {
    socket?.emit("create-room")
  }, [socket])

  const startGame = useCallback(() => {
    socket?.emit("start-game")
  }, [socket])

  const startTimer = useCallback(() => {
    socket?.emit("start-timer")
  }, [socket])

  const endRound = useCallback(() => {
    socket?.emit("end-round")
  }, [socket])

  const nextRound = useCallback(() => {
    socket?.emit("next-round")
  }, [socket])

  return {
    socket,
    connected,
    roomCode,
    roomId,
    players,
    phase,
    currentRound,
    emojis,
    options,
    roundResults,
    leaderboard,
    roundStartedAt,
    totalRounds,
    answerProgress,
    error,
    createRoom,
    startGame,
    startTimer,
    endRound,
    nextRound,
  }
}

export function usePlayerSocket() {
  const { socket, connected } = useSocket()
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [phase, setPhase] = useState<string>("idle")
  const [options, setOptions] = useState<{ id: string; name: string }[]>([])
  const [emojis, setEmojis] = useState<string[]>([])
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; points: number } | null>(
    null
  )
  const [roundResults, setRoundResults] = useState<RoundResultsPayload | null>(null)
  const [leaderboard, setLeaderboard] = useState<Player[]>([])
  const [joinError, setJoinError] = useState<string | null>(null)
  const [currentRound, setCurrentRound] = useState(0)
  const [roundStartedAt, setRoundStartedAt] = useState<number | null>(null)
  const [totalRounds, setTotalRounds] = useState(6)
  const [hasAnswered, setHasAnswered] = useState(false)

  useEffect(() => {
    if (!socket) return

    const handlers = {
      "joined-room": ({ roomId: rid, playerName: name }: JoinedRoomPayload) => {
        setRoomId(rid)
        setPlayerName(name)
        setPhase("waiting")
        setJoinError(null)
      },
      "join-error": ({ message }: JoinErrorPayload) => {
        setJoinError(message)
        setPhase("idle")
      },
      "game-started": () => {
        setPhase((prev) => (prev === "waiting" ? "playing" : prev))
      },
      "round-intro": ({
        roundIndex,
        totalRounds: tr,
        emojis: e,
        options: o,
      }: RoundIntroPayload) => {
        setCurrentRound(roundIndex)
        setTotalRounds(tr > 0 ? tr : 6)
        setEmojis(e)
        setOptions(o)
        setPhase("round-intro")
        setAnswerResult(null)
        setRoundResults(null)
        setRoundStartedAt(null)
        setHasAnswered(false)
      },
      "round-active": ({ startedAt }: RoundActivePayload = {}) => {
        setPhase("round-active")
        setRoundStartedAt(startedAt ?? Date.now())
      },
      "answer-result": (result: AnswerResultPayload) => {
        setAnswerResult(result)
        setPhase("answer-waiting")
      },
      "round-results": (data: RoundResultsPayload) => {
        setRoundResults(data)
        setPhase("round-results")
      },
      "game-finished": ({ leaderboard: lb }: GameFinishedPayload) => {
        setLeaderboard(lb)
        setPhase("finished")
      },
    }

    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event, handler)
    }

    return () => {
      for (const [event, handler] of Object.entries(handlers)) {
        socket.off(event, handler)
      }
    }
  }, [socket])

  const joinRoom = useCallback(
    (roomCode: string, name: string) => {
      setJoinError(null)
      socket?.emit("join-room", { roomCode, playerName: name })
    },
    [socket]
  )

  const submitAnswer = useCallback(
    (riskId: string) => {
      if (hasAnswered) return
      setHasAnswered(true)
      socket?.emit("submit-answer", { riskId })
    },
    [socket, hasAnswered]
  )

  return {
    socketId: socket?.id || null,
    socket,
    connected,
    playerName,
    roomId,
    phase,
    options,
    emojis,
    answerResult,
    roundResults,
    leaderboard,
    joinError,
    currentRound,
    totalRounds,
    roundStartedAt,
    hasAnswered,
    joinRoom,
    submitAnswer,
  }
}
