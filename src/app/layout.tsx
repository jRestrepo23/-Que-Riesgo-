import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "dark",
}

export const metadata: Metadata = {
  title: "¿Qué riesgo es? - Juego de Riesgos",
  description: "Mini juego multijugador: adivina el riesgo a partir de los emojis.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-dvh min-h-[100svh] font-sans font-light text-body antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
