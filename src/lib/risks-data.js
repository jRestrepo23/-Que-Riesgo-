const RISKS = [
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

const ROUND_DURATION_MS = 16_000
const ROUND_DURATION_SECONDS = ROUND_DURATION_MS / 1000
const BASE_POINTS = 100
const MAX_SPEED_BONUS = 200

module.exports = {
  RISKS,
  ROUND_DURATION_MS,
  ROUND_DURATION_SECONDS,
  BASE_POINTS,
  MAX_SPEED_BONUS,
}
