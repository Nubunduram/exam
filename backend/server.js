// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const logger = require('./config/logger');
const connectDB = require('./config/db');

const app = express();
connectDB();

// Derrière le reverse proxy Caddy (HTTPS terminé en amont)
app.set('trust proxy', 1);

// CORS : seules les origines listées dans CORS_ORIGIN (séparées par des virgules) sont autorisées
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json({ limit: '100kb' }));
app.use(morgan('combined', { stream: logger.stream }));

/**
 * Sonde de supervision : renvoie 200 si l'API et MongoDB sont opérationnels, 503 sinon.
 * Utilisée par Uptime Kuma et par le healthcheck Docker.
 */
app.get('/api/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'degraded',
    database: dbUp ? 'up' : 'down',
    uptime: Math.round(process.uptime()),
  });
});

app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// Gestionnaire d'erreurs global : évite le crash et ne divulgue pas la stack au client
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Erreur non gérée', { error: err.message, stack: err.stack, path: req.path });
  res.status(err.status || 500).json({ message: 'Erreur serveur' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Serveur en écoute sur le port ${PORT}`));
