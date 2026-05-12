export interface Risk {
  id: string
  name: string
  level: "Alto" | "Moderado" | "Bajo"
  emojis: string[]
}

export const RISKS: Risk[] = [
  {
    id: "competitividad",
    name: "Posible pérdida de competitividad comercial",
    level: "Alto",
    emojis: ["🏃‍♂️", "💨", "📉", "🥈", "🏢"],
  },
  {
    id: "seguridad",
    name: "Seguridad de los colaboradores",
    level: "Moderado",
    emojis: ["👷‍♂️", "⚠️", "🦺", "🩹", "🆘"],
  },
  {
    id: "gestion",
    name: "Posible falta de Gestión en el modelo de operación",
    level: "Moderado",
    emojis: ["🌪️", "📂", "🏢", "🤯", "🧭"],
  },
  {
    id: "financiero",
    name: "Riesgo de sostenibilidad financiera",
    level: "Moderado",
    emojis: ["🕳️", "💸", "🏦", "🚫", "🧧"],
  },
  {
    id: "normativo",
    name: "Incumplimiento normativo o contractual",
    level: "Moderado",
    emojis: ["⚖️", "📜", "✍️", "🚫", "👮"],
  },
  {
    id: "confianza",
    name: "Posible pérdida de confianza institucional",
    level: "Bajo",
    emojis: ["🤝", "💔", "🤐", "🏛️", "📉"],
  },
]

export const ROUND_DURATION_MS = 16_000
export const ROUND_DURATION_SECONDS = ROUND_DURATION_MS / 1000
export const BASE_POINTS = 100
export const MAX_SPEED_BONUS = 200
