// backend/server.js
/**
 * Point d'entrée de l'API REST de la boutique.
 * @module server
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const logger = require('./config/logger');
const connectDB = require('./config/db');

// Refus de démarrer avec un secret JWT absent ou trop faible
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  logger.error('JWT_SECRET absent ou trop court (32 caractères minimum). Arrêt.');
  process.exit(1);
}

// Protection contre l'injection d'opérateurs MongoDB ($ne, $gt...) dans les filtres de requête
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

const app = express();

// Derrière le reverse proxy Caddy (HTTPS terminé en amont) : IP client réelle pour les logs et le rate-limit
app.set('trust proxy', 1);
app.disable('x-powered-by');

// En-têtes de sécurité HTTP (API JSON : pas de ressources à charger)
app.use(helmet());

// CORS : seules les origines listées dans CORS_ORIGIN (séparées par des virgules) sont autorisées,
// avec envoi des cookies (credentials) pour la session httpOnly.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());
app.use(cors({ origin: allowedOrigins, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE'] }));

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(morgan('combined', { stream: logger.stream }));

/**
 * Sonde de supervision : 200 si l'API et MongoDB sont opérationnels, 503 sinon.
 * Utilisée par Uptime Kuma, le healthcheck Docker et le test de fumée du CI/CD.
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

// Route inconnue
app.use((req, res) => res.status(404).json({ message: 'Ressource introuvable.' }));

// Gestionnaire d'erreurs global : évite le crash et ne divulgue jamais la stack au client
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Corps de requête JSON invalide.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Requête trop volumineuse.' });
  }
  logger.error('Erreur non gérée', { error: err.message, stack: err.stack, path: req.path });
  return res.status(err.status || 500).json({ message: 'Erreur serveur.' });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  connectDB();
  app.listen(PORT, () => logger.info(`Serveur en écoute sur le port ${PORT}`));
}

module.exports = app;
