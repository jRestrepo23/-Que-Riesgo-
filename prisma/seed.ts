import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

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
    name: "Posible falta de Gestión en el modelo de negocio",
    level: "Moderado",
    emojis: ["🌪️", "📂", "🏢", "🤯", "🧭"],
  },
  {
    id: "financiero",
    name: "Riesgo de sostenibilidad financiera",
    level: "Moderado",
    emojis: ["🕳️", "💸", "🏦", "🚫", "💲"],
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

async function main() {
  console.log("🌱 Seeding database...")

  for (const risk of RISKS) {
    await prisma.risk.upsert({
      where: { id: risk.id },
      update: risk,
      create: risk,
    })
  }

  console.log("✅ Database seeded!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
