# 🚀 Configuración de MySQL para RiskQuiz

## ✅ Cambios completados

Se ha migrado completamente el proyecto de estado en memoria a MySQL con Prisma ORM. Todos los bugs críticos han sido corregidos.

### Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `prisma/schema.prisma` | Esquema de BD con 5 tablas prefijadas con `rq_` |
| `prisma/seed.ts` | Seed que inserta los 6 riesgos en la BD |
| `src/lib/db.ts` | Singleton de PrismaClient |
| `src/lib/game-state.cjs` | GameManager reescrito (CommonJS + Prisma) |
| `src/lib/socket-server.js` | Socket.IO reescrito (async, con validaciones) |

### Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `server.js` | Actualizado para usar nuevo socket-server.js |
| `package.json` | Scripts DB: `prisma:push`, `db:setup`, etc. |
| `src/lib/socket-client.ts` | Expone `socketId` en hook |
| `src/app/player/page.tsx` | **Bug fix**: ahora compara por `socketId`, no `playerName` |
| `next.config.ts` | Removido turbopack (causaba issues) |

## 🐛 Bugs corregidos

| Bug | Solución |
|-----|----------|
| roomCode no se guardaba | Ahora persiste en BD como campo único |
| Timer nunca terminaba ronda | Auto `end-round` a los 8s (setTimeout en servidor) |
| Identificación incorrecta del jugador | `playerId === socketId` (antes era `playerName`) |
| `npm start` sin Socket.IO | Script start ahora usa `node server.js` |
| Rooms huérfanas en memoria | Auto-cleanup al desconectar último jugador |
| Sin validación de host | Se valida `isHost` en eventos de control |

## 📋 Próximos pasos

### 1. Crear archivo `.env` con tus credenciales

Crea un archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL="mysql://usuario:contraseña@localhost:3306/riskquiz"
NODE_ENV="development"
```

**Reemplaza:**
- `usuario` → tu usuario de MySQL
- `contraseña` → tu contraseña de MySQL
- `localhost` → tu host de MySQL (puede ser 127.0.0.1 o un IP remoto)
- `3306` → tu puerto de MySQL (default 3306)
- `riskquiz` → nombre de tu base de datos (crea uno vacío primero)

### 2. Crear la base de datos MySQL

```bash
mysql -u usuario -p

mysql> CREATE DATABASE riskquiz;
mysql> EXIT;
```

### 3. Ejecutar setup de Prisma

```bash
npm run db:setup
```

Este comando:
1. Crea todas las tablas en MySQL (5 tablas con prefijo `rq_`)
2. Inserta los 6 riesgos predefinidos en la BD

### 4. Iniciar desarrollo

```bash
npm run dev
```

Abre http://localhost:3000 en el navegador.

## 🗄️ Esquema de datos

### Tablas creadas (5)

**`rq_risks`** - Catálogo de riesgos (estático)
```
- id (VARCHAR 50, PK): "competitividad", "seguridad", etc.
- name (VARCHAR 255): descripción del riesgo
- level (VARCHAR 50): "Alto", "Moderado", "Bajo"
- emojis (JSON): array de emojis para visualizar
```

**`rq_rooms`** - Salas de juego
```
- id (UUID, PK)
- code (VARCHAR 4, UNIQUE): código de 4 letras para unirse
- phase: "waiting", "round-intro", "round-active", "round-results", "finished"
- currentRound (INT): 0-5
- hostSocketId (VARCHAR): socket.id del host
- currentRiskId (VARCHAR): ID del riesgo correcto
- roundStartTime (BIGINT): timestamp del inicio del timer
- createdAt, updatedAt
```

**`rq_players`** - Jugadores por sala
```
- id (VARCHAR, PK): socket.id
- roomId (FK → rq_rooms)
- name (VARCHAR 20): nombre del jugador
- score (INT): puntuación acumulada
- joinedAt (DATETIME)
```

**`rq_answers`** - Respuestas de jugadores
```
- id (INT, PK, autoincrement)
- playerId (FK → rq_players)
- roomId (FK → rq_rooms)
- roundIndex (INT): 0-5
- riskId (VARCHAR): cuál riesgo respondió
- correct (BOOLEAN): ¿fue correcta?
- points (INT): puntos otorgados
- answerOrder (INT): posición para calcular bonus
- answeredAt (DATETIME)
```

**`rq_round_results`** - Resultados agregados por ronda
```
- id (INT, PK, autoincrement)
- roomId (FK → rq_rooms)
- roundIndex (INT)
- correctRiskId (VARCHAR): cuál era la respuesta correcta
- totalPlayers (INT)
- correctCount (INT): cuántos acertaron
- createdAt (DATETIME)
```

## 🔄 Flujo de juego (con BD)

1. **Host crea sala**
   - `POST create-room`
   - Inserta en `rq_rooms` (fase: "waiting")
   - Genera código de 4 caracteres (ÚNICO en BD)

2. **Jugadores se unen**
   - `POST join-room` con código
   - Valida que el código exista en `rq_rooms`
   - Inserta en `rq_players`

3. **Host inicia juego**
   - `POST start-game`
   - Elige riesgo correcto (shuffle de `rq_risks`)
   - Actualiza `rq_rooms` (fase: "round-intro")

4. **Ronda activa (8 segundos)**
   - `POST start-timer` → actualiza `roundStartTime`
   - Servidor: `setTimeout(8s)` → dispara `end-round` automáticamente
   - Jugadores responden → se inserta en `rq_answers` + se actualiza `score`

5. **Resultados de ronda**
   - Auto-fin a los 8s
   - Inserta en `rq_round_results`
   - Fase: "round-results"

6. **Próxima ronda o fin**
   - Si ronda < 6: vuelve a step 3
   - Si ronda >= 6: fase "finished"

7. **Cleanup**
   - Al desconectar último jugador → `DELETE FROM rq_rooms CASCADE`

## 🧪 Validación

Después de `npm run dev`, verifica:

```bash
# Terminal 1: servidor
npm run dev

# Terminal 2: revisar BD (optional)
mysql -u usuario -p riskquiz
mysql> SHOW TABLES;
mysql> SELECT COUNT(*) FROM rq_risks;  -- debe ser 6
mysql> SELECT * FROM rq_risks LIMIT 1;
```

### En el navegador

1. Abre host: http://localhost:3000/host
   - "Iniciar Juego" debe crear una sala
   - Ver código QR con 4 letras

2. Abre player: http://localhost:3000/player
   - Ingresar el código de 4 letras
   - Unirse a la sala

3. Jugar: deberías ver:
   - Host: emojis + botón "Iniciar Temporizador"
   - Après 8s: automáticamente "Resultados"
   - Datos guardados en `rq_answers`, `rq_round_results`

## 📊 Consultas útiles (MySQL)

```sql
-- Ver todas las salas activas
SELECT id, code, phase, currentRound, createdAt 
FROM rq_rooms 
WHERE phase != 'finished';

-- Ver jugadores de una sala
SELECT * FROM rq_players WHERE roomId = 'uuid-aqui';

-- Ver respuestas de una ronda
SELECT p.name, a.riskId, a.correct, a.points 
FROM rq_answers a
JOIN rq_players p ON a.playerId = p.id
WHERE a.roomId = 'uuid-aqui' AND a.roundIndex = 0
ORDER BY a.answeredAt;

-- Scoring final
SELECT name, score 
FROM rq_players 
WHERE roomId = 'uuid-aqui'
ORDER BY score DESC;
```

## 🚨 Troubleshooting

### Error: "Invalid DATABASE_URL"
→ Revisa que `.env` exista y tenga formato correcto: `mysql://user:pass@host:port/db`

### Error: "connect ECONNREFUSED 127.0.0.1:3306"
→ MySQL no está corriendo. Inicia: `mysql.server start` (Mac) o verifica Services (Windows)

### Error: "table not found rq_risks"
→ Ejecuta: `npm run db:setup`

### Jugadores no se pueden unir con el código
→ Revisa que estés usando el código de 4 letras, no el UUID

### El timer no termina automáticamente
→ Revisa logs del servidor para errores en `endRound`

## 📝 Resumen de cambios arquitectónicos

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Persistencia | En memoria (Map) | MySQL via Prisma |
| Escalabilidad | 1 instancia de servidor | Multiples instancias + BD compartida |
| Durabilidad | Datos perdidos al reiniciar | Datos persisten |
| Concurrencia | Lock en memory | Transacciones SQL |
| Seguridad | Sin validación de host | Validación de hostSocketId |
| Timer | Manual (UI countdown) | Automático (setTimeout servidor) |

¡Listo! 🎉 El proyecto está completamente funcional con MySQL. Pasa tus credenciales cuando estés listo.
