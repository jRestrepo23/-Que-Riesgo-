const path = require("path")
const { createServer } = require("http")
const { parse } = require("url")

const dir = path.join(__dirname)

const dev = process.env.NODE_ENV !== "production"
const forceWebpackBundler =
  dev && process.env.NEXT_KEEP_TURBOPACK !== "1"

// Sin webpack explícito, Next 16 fuerza TURBOPACK='auto' con servidor propio → fallo Turbopack
// típico en Windows ("Next.js package not found" en /player).
if (forceWebpackBundler) {
  delete process.env.TURBOPACK
}

const next = require("next")
const { initSocketIO } = require("./src/lib/socket-server")

const hostname = "localhost"
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000

async function start() {
  const app = next({
    dev,
    hostname,
    port,
    dir,
    ...(forceWebpackBundler ? { webpack: true } : {}),
  })
  const handle = app.getRequestHandler()

  await app.prepare()

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error("Error occurred handling", req.url, err)
      res.statusCode = 500
      res.end("Internal Server Error")
    }
  })

  initSocketIO(server)

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
}

start().catch((err) => {
  console.error("Failed to start server:", err)
  process.exit(1)
})
