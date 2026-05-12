"use client"

import { useState, useEffect } from "react"
import { useHostSocket } from "@/lib/socket-client"
import { ROUND_DURATION_SECONDS } from "@/lib/risks-data"
import QRCode from "qrcode"

export default function HostPage() {
  const {
    connected,
    roomCode,
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
    createRoom,
    startGame,
  } = useHostSocket()

  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [now, setNow] = useState(() => 0)

  useEffect(() => {
    if (phase !== "round-active") return
    const tick = () => setNow(Date.now())
    const startId = setTimeout(tick, 0)
    const interval = setInterval(tick, 1000)
    return () => {
      clearTimeout(startId)
      clearInterval(interval)
    }
  }, [phase, roundStartedAt])

  const elapsed = roundStartedAt !== null ? Math.floor((now - roundStartedAt) / 1000) : 0
  const timerValue = Math.max(0, ROUND_DURATION_SECONDS - elapsed)

  useEffect(() => {
    if (roomCode) {
      const url = `${window.location.origin}/player`
      QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      }).then(setQrDataUrl)
    }
  }, [roomCode])

  if (!connected) {
    return (
      <main className="shell-screen shell-screen-top flex items-center justify-center bg-canvas">
        <div className="text-center px-2">
          <div className="animate-spin text-3xl sm:text-4xl mb-4" aria-hidden>
            🔄
          </div>
          <p className="text-body font-light text-sm sm:text-base">Conectando…</p>
        </div>
      </main>
    )
  }

  if (!roomCode) {
    return (
      <main className="shell-screen shell-screen-top flex items-center justify-center bg-canvas py-12 sm:py-16">
        <div className="text-center animate-slide-up max-w-lg w-full px-2">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] text-on-dark mb-4">Líder</p>
          <h1 className="text-[clamp(1.5rem,6vw,2.25rem)] sm:text-3xl md:text-4xl font-bold text-on-dark uppercase tracking-[-0.5px] mb-2">
            ¡Qué Riesgo!
          </h1>
          <div className="flex justify-center mb-8 sm:mb-10">
            <div className="m-stripe" aria-hidden />
          </div>
          <button type="button" onClick={createRoom} className="btn-primary max-w-md mx-auto">
            Iniciar sala
          </button>
        </div>
      </main>
    )
  }

  if (phase === "waiting") {
    return (
      <main className="shell-screen shell-screen-top bg-canvas py-6 sm:py-10 md:py-16">
        <div className="max-w-4xl mx-auto w-full">
          <div className="text-center mb-8 sm:mb-10 md:mb-14 animate-slide-up px-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-on-dark uppercase tracking-[-0.5px] mb-2">
              ¡Qué Riesgo!
            </h1>
            <div className="flex justify-center mb-5 sm:mb-6 px-2">
              <div className="m-stripe m-stripe-wide max-w-md w-full" aria-hidden />
            </div>
            <p className="text-body font-light text-sm sm:text-base">Esperando jugadores…</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 md:gap-8">
            <div className="card-surface animate-slide-up rounded-none">
              <h2 className="text-sm sm:text-base font-bold text-on-dark uppercase tracking-[0.12em] mb-4 sm:mb-6 text-center">
                Escanear para unirse
              </h2>
              {qrDataUrl && (
                <div className="flex justify-center mb-5 sm:mb-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="Código QR para unirse"
                    className="rounded-none border border-hairline w-full max-w-[min(100%,280px)] h-auto"
                  />
                </div>
              )}
              <div className="text-center">
                <p className="text-xs sm:text-sm font-light text-muted mb-3">O ingresa el código:</p>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-on-dark tracking-[0.15em] sm:tracking-[0.2em] font-mono py-3 sm:py-4 px-2 break-all border border-hairline bg-surface-soft">
                  {roomCode}
                </div>
              </div>
            </div>

            <div className="card-surface animate-slide-up rounded-none min-h-0 flex flex-col">
              <div className="flex items-baseline justify-between mb-4 sm:mb-5">
                <h2 className="text-sm sm:text-base font-bold text-on-dark">
                  Jugadores
                </h2>
                <span className="text-xs font-mono tabular-nums text-muted">{players.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain max-h-[42vh] sm:max-h-72 border-t border-hairline">
                {players.length === 0 ? (
                  <p className="text-muted font-light text-center py-8 text-sm">Aún no hay jugadores</p>
                ) : (
                  <ul className="divide-y divide-hairline">
                    {players.map((player, i) => (
                      <li
                        key={player.id}
                        className="flex items-center gap-2 py-1.5 px-2 animate-slide-up"
                        style={{ animationDelay: `${Math.min(i * 30, 600)}ms` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" aria-hidden />
                        <span className="text-sm text-on-dark truncate">{player.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {players.length > 0 && (
                <button type="button" onClick={startGame} className="btn-primary w-full mt-6 sm:mt-8">
                  Empezar partida
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (phase === "round-intro") {
    return (
      <main className="shell-screen shell-screen-top bg-canvas py-6 sm:py-10 flex items-center justify-center">
        <div className="text-center animate-bounce-in max-w-3xl w-full px-1">
          <div className="text-xs sm:text-sm font-light text-muted mb-3 sm:mb-4">
            Ronda {currentRound + 1} de {Math.max(totalRounds, 1)}
          </div>
          <h2 className="text-base sm:text-xl md:text-2xl font-bold text-on-dark mb-6 sm:mb-10 uppercase tracking-[-0.5px] leading-snug px-2 text-balance">
            ¿Qué riesgo representan estos emojis?
          </h2>
          <div className="overflow-x-auto max-w-full mb-8 sm:mb-12">
            <div className="flex gap-2 sm:gap-4 md:gap-6 w-max mx-auto px-1">
              {emojis.map((emoji, i) => (
                <span
                  key={i}
                  className="emoji-large animate-bounce-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {emoji}
                </span>
              ))}
            </div>
          </div>
          <p className="text-body font-light text-sm sm:text-lg animate-pulse px-2">
            La cuenta atrás de {ROUND_DURATION_SECONDS}s comenzará en un momento…
          </p>
        </div>
      </main>
    )
  }

  if (phase === "round-active") {
    const timerColor =
      timerValue <= 3 ? "text-m-red" : timerValue <= 5 ? "text-warning" : "text-success"

    return (
      <main className="shell-screen shell-screen-top bg-canvas py-6 sm:py-10">
        <div className="max-w-5xl mx-auto w-full min-h-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6 sm:mb-8 border-b border-hairline pb-3 sm:pb-4">
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-xs sm:text-sm font-light text-muted">
                Ronda {currentRound + 1} de {Math.max(totalRounds, 1)}
              </span>
              {answerProgress && (
                <span className="text-xs font-mono tabular-nums text-success">
                  {answerProgress.answered}/{answerProgress.total} respondieron
                </span>
              )}
            </div>
            <span className={`text-3xl sm:text-4xl font-bold font-mono tabular-nums self-end sm:self-auto ${timerColor}`}>
              {timerValue}s
            </span>
          </div>

          <div className="text-center mb-10">
            <div className="overflow-x-auto max-w-full">
              <div className="flex gap-4 md:gap-6 w-max mx-auto">
                {emojis.map((emoji, i) => (
                  <span key={i} className="emoji-large">
                    {emoji}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            {options.map((option) => (
              <div
                key={option.id}
                className="card-spec min-h-[4.5rem] sm:min-h-[4.5rem] flex items-center justify-center text-center text-xs sm:text-sm md:text-base font-light text-body-strong rounded-none text-balance break-words hyphens-auto px-2"
              >
                {option.name}
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (phase === "round-results" && roundResults) {
    return (
      <main className="shell-screen shell-screen-top bg-canvas py-6 sm:py-10 flex items-center justify-center">
        <div className="max-w-2xl w-full animate-slide-up min-h-0">
          <div className="text-center mb-6 sm:mb-10 px-1">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-on-dark uppercase tracking-[-0.5px] mb-2">
              Resultados
            </h2>
            <p className="text-muted font-light text-xs sm:text-sm">Ronda {currentRound + 1}</p>
          </div>

          <div className="card-surface mb-6 sm:mb-8 rounded-none">
            <div className="text-center mb-5 sm:mb-6">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] text-muted mb-3">Respuesta correcta</p>
              <p className="text-base sm:text-xl font-bold text-success text-balance px-1 leading-snug">{roundResults.correctRisk.name}</p>
            </div>

            <div className="overflow-x-auto max-w-full mb-6 sm:mb-8">
              <div className="flex gap-2 sm:gap-4 w-max mx-auto">
                {roundResults.correctRisk.emojis.map((emoji: string, i: number) => (
                  <span key={i} className="text-3xl">
                    {emoji}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card-spec text-center rounded-none">
                <div className="text-3xl font-bold text-success tabular-nums">{roundResults.correctCount}</div>
                <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted mt-2">Aciertos</div>
              </div>
              <div className="card-spec text-center rounded-none">
                <div className="text-3xl font-bold text-on-dark tabular-nums">{roundResults.totalPlayers}</div>
                <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted mt-2">Jugadores</div>
              </div>
            </div>
          </div>

          <p className="text-center text-muted font-light text-sm">Siguiente pregunta en unos segundos…</p>
        </div>
      </main>
    )
  }

  if (phase === "finished") {
    return (
      <main className="shell-screen shell-screen-top bg-canvas py-6 sm:py-10 flex items-center justify-center">
        <div className="max-w-2xl w-full animate-slide-up min-h-0">
          <div className="text-center mb-8 sm:mb-10 px-1">
            <div className="flex justify-center mb-5 sm:mb-6">
              <div className="m-stripe max-w-xs w-full" aria-hidden />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-on-dark uppercase tracking-[-0.5px] mb-2">
              Podio final
            </h1>
            <p className="text-body font-light text-sm sm:text-base">Partida terminada</p>
          </div>

          <div className="space-y-2 sm:space-y-3 max-h-[55vh] sm:max-h-none overflow-y-auto sm:overflow-visible overscroll-contain">
            {leaderboard.map((player, i) => {
              const medals = ["🥇", "🥈", "🥉"]
              const topStyle =
                i === 0
                  ? "border-warning/60 bg-surface-soft"
                  : i === 1
                    ? "border-hairline bg-surface-card"
                    : i === 2
                      ? "border-m-red/40 bg-surface-soft"
                      : "border-hairline bg-surface-card"
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 border animate-slide-up rounded-none ${topStyle}`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <span className="text-xl sm:text-2xl w-10 sm:w-12 text-center tabular-nums shrink-0">
                    {i < 3 ? medals[i] : `#${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-on-dark truncate text-sm sm:text-base">{player.name}</div>
                    <div className="text-xs sm:text-sm font-light text-muted flex items-center gap-2">
                      <span className="text-success">✅ {player.answers?.filter((a) => a.correct).length ?? 0}</span>
                      <span className="text-m-red">❌ {(player.answers?.length ?? player._count?.answers ?? 0) - (player.answers?.filter((a) => a.correct).length ?? 0)}</span>
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-on-dark tabular-nums shrink-0">{player.score} pts</div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-center mt-8 sm:mt-10">
            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="btn-outline max-w-xs w-full sm:w-auto"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </main>
    )
  }

  return null
}
