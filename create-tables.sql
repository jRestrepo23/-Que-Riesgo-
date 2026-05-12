-- Crear tablas RiskQuiz con prefijo rq_

CREATE TABLE IF NOT EXISTS rq_risks (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  level VARCHAR(50) NOT NULL,
  emojis JSON NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rq_rooms (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(4) NOT NULL UNIQUE,
  phase VARCHAR(50) NOT NULL,
  currentRound INT DEFAULT 0,
  hostSocketId VARCHAR(100),
  currentRiskId VARCHAR(50),
  roundStartTime BIGINT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rq_players (
  id VARCHAR(100) NOT NULL,
  roomId VARCHAR(36) NOT NULL,
  name VARCHAR(20) NOT NULL,
  score INT DEFAULT 0,
  joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (roomId, id),
  FOREIGN KEY (roomId) REFERENCES rq_rooms(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rq_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playerId VARCHAR(100) NOT NULL,
  roomId VARCHAR(36) NOT NULL,
  roundIndex INT NOT NULL,
  riskId VARCHAR(50) NOT NULL,
  correct BOOLEAN NOT NULL,
  points INT NOT NULL,
  answerOrder INT NOT NULL,
  answeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roomId) REFERENCES rq_rooms(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rq_round_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roomId VARCHAR(36) NOT NULL,
  roundIndex INT NOT NULL,
  correctRiskId VARCHAR(50) NOT NULL,
  totalPlayers INT NOT NULL,
  correctCount INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roomId) REFERENCES rq_rooms(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insertar riesgos
INSERT INTO rq_risks (id, name, level, emojis) VALUES
('competitividad', 'Posible pérdida de competitividad comercial', 'Alto', '["🏃‍♂️","💨","📉","🥈","🏢"]'),
('seguridad', 'Seguridad de los colaboradores', 'Moderado', '["👷‍♂️","⚠️","🦺","🩹","🆘"]'),
('gestion', 'Posible falta de Gestión en el modelo de negocio', 'Moderado', '["🌪️","📂","🏢","🤯","🧭"]'),
('financiero', 'Riesgo de sostenibilidad financiera', 'Moderado', '["🕳️","💸","🏦","🚫","🧧"]'),
('normativo', 'Incumplimiento normativo o contractual', 'Moderado', '["⚖️","📜","✍️","🚫","👮"]'),
('confianza', 'Posible pérdida de confianza institucional', 'Bajo', '["🤝","💔","🤐","🏛️","📉"]');
