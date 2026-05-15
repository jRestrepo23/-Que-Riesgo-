"use client"

import Link from "next/link"

export default function Home() {
  return (
    <main className="shell-screen shell-screen-top flex flex-col items-center justify-center bg-canvas py-8 sm:py-16 md:py-24">
      <div className="text-center w-full max-w-[1440px] animate-slide-up">
        <div className="mb-8 sm:mb-10 md:mb-14">
          <p className="text-on-dark text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] mb-3 sm:mb-4 px-1">
            Gestión de riesgos
          </p>
          <h1 className="text-[clamp(1.75rem,8vw,3.5rem)] sm:text-5xl md:text-6xl lg:text-[56px] font-bold text-on-dark uppercase tracking-[-0.5px] leading-[1.05] mb-5 sm:mb-6 px-2 break-words">
            ¿Qué riesgo es?
          </h1>
          <div className="flex justify-center mb-5 sm:mb-6">
            <div className="m-stripe" aria-hidden />
          </div>
          <p className="text-base sm:text-lg md:text-xl font-light text-body max-w-xl mx-auto leading-relaxed px-2">
            Mini juego multijugador: adivina el riesgo a partir de los emojis.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 justify-center items-stretch sm:items-center max-w-xl mx-auto w-full">
          <Link
            href="/host"
            className="btn-primary gap-2 sm:gap-3 no-underline sm:!w-auto"
          >
            <span className="text-xl normal-case tracking-normal leading-none" aria-hidden>
              🎮
            </span>
            <span className="flex flex-col items-start text-left gap-0.5">
              <span>Ser líder</span>
              <span className="text-xs font-light normal-case tracking-normal text-body opacity-90">
                Crear sala
              </span>
            </span>
          </Link>

          <Link
            href="/player"
            className="btn-outline gap-2 sm:gap-3 no-underline sm:!w-auto"
          >
            <span className="text-xl normal-case tracking-normal leading-none" aria-hidden>
              📱
            </span>
            <span className="flex flex-col items-start text-left gap-0.5">
              <span>Ser jugador</span>
              <span className="text-xs font-light normal-case tracking-normal text-body opacity-90">
                Unirse con código
              </span>
            </span>
          </Link>
        </div>

        <div className="mt-12 sm:mt-16 md:mt-24 card-surface max-w-2xl mx-auto text-left rounded-none w-full">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.12em] text-on-dark mb-4 sm:mb-6">
            Cómo jugar
          </h2>
          <ol className="space-y-3 sm:space-y-4 text-sm md:text-base font-light text-body leading-relaxed">
            <li className="flex gap-3">
              <span className="text-muted font-normal tabular-nums shrink-0 w-6">1.</span>
              <span>El líder crea una sala y comparte el código QR.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-muted font-normal tabular-nums shrink-0 w-6">2.</span>
              <span>Los jugadores escanean el QR o ingresan el código.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-muted font-normal tabular-nums shrink-0 w-6">3.</span>
              <span>Se muestran emojis y hay que elegir el riesgo correcto.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-muted font-normal tabular-nums shrink-0 w-6">4.</span>
              <span>Cuanto antes aciertes, más puntos.</span>
            </li>
          </ol>
        </div>
      </div>
    </main>
  )
}
