# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RiskQuiz** is a multiplayer real-time risk management game. One player hosts a game room and presents emoji-based risk scenarios; other players join and compete to identify the risk fastest. Points are awarded based on correctness and speed.

## Architecture

### High-Level Design

The app uses a **host-player** real-time multiplayer architecture:

- **Custom Node.js HTTP server** (`server.js`): Wraps Next.js to enable Socket.IO support. The standard Next.js dev server doesn't support raw HTTP servers for WebSocket upgrades, so a custom server is required.
- **Next.js App Router**: Handles UI rendering. Three main pages:
  - `/` (home): Dual-option landing (host or player)
  - `/host`: Game room creation, QR generation, game control
  - `/player`: Room join flow (QR scan or code entry)
- **GameManager** (`src/lib/game-state.js`): Server-side game state—rooms, players, rounds, scoring logic. Rooms are ephemeral (in-memory, lost on server restart).
- **Socket.IO**: Real-time event channel between host, players, and server. Events flow through room namespaces.

### Game Flow

1. Host creates room → server generates unique 4-char code and UUID
2. Players join with code → validated and added to room's player list
3. Host starts game → rounds begin
4. Each round: emoji set shown → players answer → points awarded (base points − time penalty)
5. Results broadcast to all players

### Data Model

- **Room**: `{ roomId, roomCode, phase, players, currentRound, currentRisk, roundOptions, roundStartTime, roundResults }`
- **Player**: `{ socketId, name, score, answers }`
- **Risk**: `{ id, name, emojis[], description }` (from `risks-data`)

### Key Architectural Notes

- **No persistence**: Game state is in-memory only. Rooms and scores are lost on server restart.
- **Mixed JS/TS**: Codebase uses both JavaScript (`.js` game logic) and TypeScript (`.tsx` React components, `.ts` Socket.IO client). Consider standardizing on one.
- **Socket events are room-scoped**: Events broadcast to specific `io.to(roomId)` to keep games isolated.

## Commands

```bash
# Development
npm run dev       # Starts custom server (server.js) on localhost:3000
                  # Watches for file changes

# Production Build
npm run build     # Compiles Next.js with Turbopack (enabled in next.config.ts)

# Start Production
npm start         # Runs next start (requires 'npm run build' first)

# Linting
npm run lint      # Runs ESLint (config: eslint.config.mjs)
```

## Key Files & Patterns

| File | Role |
|------|------|
| `server.js` | Custom HTTP server entry point; initializes Socket.IO |
| `src/lib/socket-server.js` | Socket.IO event handlers (create-room, join-room, start-game, submit-answer, etc.) |
| `src/lib/game-state.js` | GameManager class; all game logic (scoring, round management, player tracking) |
| `src/lib/risks-data.js` | RISKS array (risk definitions), scoring constants |
| `src/app/host/page.tsx` | Host UI: displays room code, QR, game controls |
| `src/app/player/page.tsx` | Player UI: join flow, emoji guessing, score display |
| `src/lib/socket-client.ts` | Socket.IO client wrapper (used by React components) |
| `src/app/globals.css` | Tailwind setup (no custom animations yet, but ready for them) |

## Development Notes

- **dev vs. build**: The dev script runs `server.js`, not `next dev`. This is intentional—it provides Socket.IO support without Vercel's function boundaries.
- **Environment**: `NODE_ENV=development` by default in dev mode. Use `NODE_ENV=production` to test production behavior locally.
- **QR Codes**: Generated server-side in host page via `qrcode` package; embeds join URL.
- **CORS**: Socket.IO CORS is open (`origin: "*"`). In production, restrict to your domain.
- **Turbopack**: Enabled in `next.config.ts`. No explicit turbopack config needed yet.

## Common Tasks

**Adding a new risk scenario**:
1. Edit `src/lib/risks-data.js`: add entry to `RISKS` array with `{ id, name, emojis, description }`
2. Redeploy; scoring logic is agnostic to risk count

**Debugging Socket events**:
- Server logs: Check console output from `server.js` (connection/disconnect, errors)
- Client logs: Browser DevTools → Network tab → WS → Messages
- Add `console.log()` in `src/lib/socket-server.js` event handlers

**Styling**: Uses Tailwind CSS v4. Global styles in `src/app/globals.css`; component-scoped styles inline (e.g., `className="bg-indigo-600 hover:bg-indigo-700"`).

## Testing Strategy

No test framework is currently configured. To add tests:
- For game logic (`game-state.js`): Jest with Node environment
- For React components: Vitest + React Testing Library
- For Socket.IO: Mock socket events or use `socket.io-mock-client`

## Deployment Notes

- The app requires a **Node.js server** (not static hosting). Vercel supports custom servers; see `server.ts` (TypeScript variant of `server.js` for type safety).
- Game state is not persisted; rooms are ephemeral. For persistence, integrate a database (e.g., PostgreSQL) and update GameManager.
- Ensure Socket.IO is allowed in your hosting (some edge/serverless platforms block WebSockets).
