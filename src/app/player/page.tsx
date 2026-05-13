"use client"

import { useState, useEffect } from "react"
import { usePlayerSocket } from "@/lib/socket-client"
import { RISKS, ROUND_DURATION_SECONDS } from "@/lib/risks-data"

interface PlayerResult {
  playerId: string
  correct: boolean
  points: number
}

export default function PlayerPage() {
  const {
    socketId,
    connected,
    playerName,
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
  } = usePlayerSocket()

  const [nameInput, setNameInput] = useState("")
  const [codeInput, setCodeInput] = useState("")
  const [now, setNow] = useState(() => 0)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    if (code) setCodeInput(code.toUpperCase().slice(0, 4))
  }, [])

  useEffect(() => {
    if (phase !== "round-active") return
    const tick = () => setNow(Date.now())
    const startId = setTimeout(tick, 0)
    const id = setInterval(tick, 250)
    return () => {
      clearTimeout(startId)
      clearInterval(id)
    }
  }, [phase, roundStartedAt])

  const roundSecondsLeft =
    phase === "round-active" && roundStartedAt !== null
      ? Math.max(0, ROUND_DURATION_SECONDS - Math.floor((now - roundStartedAt) / 1000))
      : 0
  const roundTimerColor =
    roundSecondsLeft <= 3 ? "text-m-red" : roundSecondsLeft <= 5 ? "text-warning" : "text-success"

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

  if (phase === "idle") {
    return (
      <main className="shell-screen shell-screen-top bg-canvas flex items-center justify-center py-8 sm:py-10">
        <div className="w-full max-w-sm animate-slide-up px-0">
          <div className="text-center mb-6 sm:mb-8">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] text-on-dark mb-3">Jugador</p>
            <h1 className="text-[clamp(1.25rem,5.5vw,1.875rem)] sm:text-2xl md:text-3xl font-bold text-on-dark uppercase tracking-[-0.5px] mb-4">
              RiskQuiz
            </h1>
            <div className="flex justify-center mb-4">
              <div className="m-stripe" aria-hidden />
            </div>
            <p className="text-body font-light text-sm sm:text-base">Únete al juego</p>
          </div>

          <div className="card-surface space-y-4 sm:space-y-5 rounded-none">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.12em] text-muted mb-3">
                Código de sala
              </label>
              <input
                type="text"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase().slice(0, 4))
                }}
                placeholder="ABCD"
                className="input-dark w-full text-center text-xl sm:text-2xl font-mono tracking-[0.2em] sm:tracking-[0.25em] uppercase rounded-none min-h-[52px]"
                maxLength={4}
                autoComplete="off"
                autoCapitalize="characters"
                inputMode="text"
                spellCheck={false}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.12em] text-muted mb-3">
                Tu nombre
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value.slice(0, 20))}
                placeholder="Jugador"
                className="input-dark w-full rounded-none"
                maxLength={20}
                autoComplete="given-name"
              />
            </div>

            {joinError && (
              <div className="py-3 px-4 border border-m-red/60 bg-surface-soft text-m-red text-sm font-light text-center">
                {joinError}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (codeInput.length === 4 && nameInput.trim()) {
                  joinRoom(codeInput, nameInput.trim())
                }
              }}
              disabled={codeInput.length !== 4 || !nameInput.trim()}
              className="btn-primary w-full"
            >
              Unirse
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (phase === "waiting") {
    return (
      <main className="shell-screen shell-screen-top bg-canvas flex flex-col">
        <div className="max-w-lg w-full mx-auto flex flex-col flex-1 min-h-0 animate-slide-up py-4 sm:py-6">
          <div className="text-center shrink-0 mb-4 sm:mb-6 px-1">
            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4" aria-hidden>
              ⏳
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-on-dark mb-2 break-words px-2">
              Hola, {playerName}
            </h2>
            <p className="text-body font-light text-xs sm:text-sm">
              Esperando a que el líder inicie el juego…
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <div
                className="w-3 h-3 bg-surface-elevated border border-hairline rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-3 h-3 bg-surface-elevated border border-hairline rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-3 h-3 bg-surface-elevated border border-hairline rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>

          <div className="flex flex-col max-h-[52vh] border border-hairline bg-surface-card rounded-none">
            <div className="shrink-0 px-3 sm:px-4 py-3 border-b border-hairline bg-surface-soft">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Riesgos del juego
              </p>
              <p className="text-xs sm:text-sm font-light text-body mt-1 leading-snug">
                Revisa las descripciones antes de empezar.
              </p>
            </div>
            <ul className="overflow-y-auto overscroll-contain divide-y divide-hairline">
              {RISKS.map((risk) => (
                <li key={risk.id} className="px-3 sm:px-4 py-3 sm:py-4">
                  <p className="text-sm font-light text-body-strong leading-relaxed text-balance">{risk.name}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    )
  }

  if (phase === "playing") {
    return (
      <main className="shell-screen shell-screen-top bg-canvas flex items-center justify-center py-10">
        <div className="text-center animate-slide-up px-4 max-w-md">
          <div className="text-3xl sm:text-4xl mb-5 sm:mb-6" aria-hidden>
            🎮
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-on-dark mb-3">El juego comenzó</h2>
          <p className="text-body font-light text-sm sm:text-base">Prepárate para la primera ronda…</p>
        </div>
      </main>
    )
  }

  if (phase === "round-intro") {
    return (
      <main className="shell-screen shell-screen-top bg-canvas flex items-center justify-center py-8 sm:py-10">
        <div className="text-center animate-bounce-in max-w-lg w-full px-2">
          <div className="text-xs sm:text-sm font-light text-muted mb-2">
            Ronda {currentRound + 1} de {Math.max(totalRounds, 1)}
          </div>
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-on-dark mb-6 sm:mb-8 uppercase tracking-[-0.5px] leading-snug text-balance px-1">
            ¿Qué riesgo representan estos emojis?
          </h2>
          <div className="overflow-x-auto max-w-full mb-8 sm:mb-10">
            <div className="flex gap-2 sm:gap-3 w-max mx-auto px-1">
              {emojis.map((emoji, i) => (
                <span key={i} className="emoji-large animate-bounce-in" style={{ animationDelay: `${i * 100}ms` }}>
                  {emoji}
                </span>
              ))}
            </div>
          </div>
          <p className="text-body font-light text-sm sm:text-base animate-pulse px-2">
            Enseguida tendrás {ROUND_DURATION_SECONDS}s para responder…
          </p>
        </div>
      </main>
    )
  }

  if (phase === "round-active") {
    return (
      <main
        className="flex flex-col bg-canvas w-full overflow-hidden min-h-[100dvh] min-h-[100svh] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))]"
      >
        <div className="shrink-0 flex justify-between items-center gap-3 py-3 border-b border-hairline">
          <span className="text-xs sm:text-sm font-light text-muted truncate">
            Ronda {currentRound + 1}/{Math.max(totalRounds, 1)}
          </span>
          <span className={`text-3xl sm:text-4xl font-bold font-mono tabular-nums leading-none shrink-0 ${roundTimerColor}`}>
            {roundSecondsLeft}
          </span>
        </div>

        <div className="shrink-0 flex flex-col items-center gap-2 sm:gap-3 px-2 py-4 sm:py-5">
          <div className="overflow-x-auto max-w-full w-full">
            <div className="flex gap-2 sm:gap-3 w-max mx-auto">
              {emojis.map((emoji, i) => (
                <span key={i} className="emoji-large">
                  {emoji}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-muted uppercase tracking-[0.12em] text-center px-2">
            Selecciona la respuesta
          </p>
        </div>

        <div
          className="flex-1 grid grid-cols-2 bg-hairline min-h-0 w-full pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
          style={{
            gap: "1px",
            gridTemplateRows: `repeat(${Math.ceil(options.length / 2)}, minmax(5.5rem, 1fr))`,
          }}
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => submitAnswer(option.id)}
              disabled={hasAnswered}
              className={`flex items-center justify-center p-3 sm:p-4 text-center text-xs sm:text-sm font-light text-balance leading-snug transition-colors duration-100 ${
                hasAnswered
                  ? "bg-surface-soft text-muted cursor-not-allowed"
                  : "bg-surface-card text-body-strong active:bg-surface-elevated"
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
      </main>
    )
  }

  if (phase === "answer-waiting" && answerResult) {
    return (
      <main className="shell-screen shell-screen-top bg-canvas flex items-center justify-center py-8 sm:py-10">
        <div className="text-center animate-bounce-in max-w-md w-full px-3">
          <div className="text-5xl sm:text-7xl mb-5 sm:mb-6" aria-hidden>
            {answerResult.correct ? "✅" : "❌"}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-on-dark mb-3">
            {answerResult.correct ? "Correcto" : "Incorrecto"}
          </h2>
          {answerResult.correct && (
            <p className="text-lg sm:text-xl text-success font-bold tabular-nums">+{answerResult.points} puntos</p>
          )}
          <p className="text-body font-light mt-5 sm:mt-6 text-sm sm:text-base">Esperando resultados…</p>
        </div>
      </main>
    )
  }

  if (phase === "round-results") {
    const playerResult = roundResults?.playerResults?.find((r: PlayerResult) => r.playerId === socketId)
    const wasCorrect = playerResult?.correct ?? false

    return (
      <main className="shell-screen shell-screen-top bg-canvas flex items-center justify-center py-8 sm:py-10">
        <div className="max-w-sm w-full animate-slide-up text-center px-1">
          <div className="text-4xl sm:text-5xl mb-5 sm:mb-6" aria-hidden>
            {wasCorrect ? "🎉" : "😅"}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-on-dark mb-3">{wasCorrect ? "Acertaste" : "No era esa"}</h2>
          <p className="text-body-strong font-light mb-6 sm:mb-8 text-sm sm:text-base text-balance px-2 leading-snug">
            {roundResults?.correctRisk?.name}
          </p>

          <div className="card-surface mb-6 sm:mb-8 text-left rounded-none">
            <div className="overflow-x-auto max-w-full mb-3 sm:mb-4">
              <div className="flex gap-2 sm:gap-3 w-max mx-auto">
                {roundResults?.correctRisk?.emojis?.map((emoji: string, i: number) => (
                  <span key={i} className="text-xl sm:text-2xl">
                    {emoji}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-xs sm:text-sm font-light text-muted text-center">
              {roundResults?.correctCount} de {roundResults?.totalPlayers} acertaron
            </div>
          </div>

          <p className="text-body font-light animate-pulse text-xs sm:text-sm">Siguiente pregunta en breve…</p>
        </div>
      </main>
    )
  }

  if (phase === "finished") {
    const playerRank = leaderboard.findIndex((p) => p.name === playerName)
    const playerData = playerRank >= 0 ? leaderboard[playerRank] : undefined

    return (
      <main className="shell-screen shell-screen-top bg-canvas flex items-center justify-center py-8 sm:py-10">
        <div className="max-w-sm w-full animate-slide-up text-center px-1 min-h-0">
          <div className="flex justify-center mb-5 sm:mb-6">
            <div className="m-stripe max-w-[10rem] w-full" aria-hidden />
          </div>
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4" aria-hidden>
            🏆
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-dark uppercase tracking-[-0.5px] mb-6 sm:mb-8 px-2">
            Juego terminado
          </h1>

          <div className="card-surface my-6 sm:my-8 rounded-none">
            <div className="text-3xl sm:text-4xl mb-3">
              {playerRank < 0
                ? "—"
                : playerRank === 0
                  ? "🥇"
                  : playerRank === 1
                    ? "🥈"
                    : playerRank === 2
                      ? "🥉"
                      : `#${playerRank + 1}`}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-on-dark tabular-nums">{playerData?.score ?? 0} pts</div>
            <div className="text-muted font-light text-xs sm:text-sm mt-2">Tu puntuación</div>
          </div>

          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.12em] text-muted mb-3 sm:mb-4">
            Clasificación
          </h2>
          <div className="space-y-2 mb-6 sm:mb-8 max-h-[min(50vh,24rem)] sm:max-h-96 overflow-y-auto overscroll-contain text-left">
            {leaderboard.map((player, i: number) => {
              const medals = ["🥇", "🥈", "🥉"]
              const isMe = player.name === playerName
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 border rounded-none min-h-[48px] ${
                    isMe ? "border-on-dark bg-surface-soft" : "border-hairline bg-surface-card"
                  }`}
                >
                  <span className="w-7 sm:w-8 text-center text-base sm:text-lg shrink-0">
                    {i < 3 ? medals[i] : `#${i + 1}`}
                  </span>
                  <span className={`flex-1 font-light truncate text-left text-sm sm:text-base ${isMe ? "text-on-dark font-bold" : "text-body-strong"}`}>
                    {player.name}
                    {isMe && " (tú)"}
                  </span>
                  <span className="font-bold text-on-dark tabular-nums shrink-0 text-sm sm:text-base">{player.score}</span>
                </div>
              )
            })}
          </div>

          {playerData?.answers && playerData.answers.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted mb-3">
                Mis respuestas por ronda
              </h3>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mb-3">
                {[...playerData.answers]
                  .sort((a, b) => a.round - b.round)
                  .map((answer) => (
                    <div key={answer.round} className="flex flex-col items-center gap-0.5 min-w-[2rem]">
                      <span className="text-base sm:text-lg">{answer.correct ? "✅" : "❌"}</span>
                      <span className="text-[9px] sm:text-[10px] text-muted font-light tabular-nums">R{answer.round + 1}</span>
                    </div>
                  ))}
              </div>
              <div className="flex justify-center gap-5 text-xs sm:text-sm font-light border border-hairline bg-surface-soft py-2 px-4">
                <span className="text-success">✅ {playerData.answers.filter((a) => a.correct).length} correctas</span>
                <span className="text-m-red">❌ {playerData.answers.filter((a) => !a.correct).length} incorrectas</span>
              </div>
            </div>
          )}
          <p className="text-muted font-light text-xs sm:text-sm">Gracias por jugar.</p>
        </div>
      </main>
    )
  }

  return null
}
