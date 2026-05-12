import { createServer } from "http"
import { parse } from "url"
import next from "next"
import { initSocketIO } from "./src/lib/socket-server"

const dev = process.env.NODE_ENV !== "production"
const hostname = "localhost"
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err)
})

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err)
})

async function start() {
  const app = next({ dev, hostname, port })
  const handle = app.getRequestHandler()

  await app.prepare()

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
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

start()
