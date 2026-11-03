// gateway/server.js
/**
 * API Gateway : point d'entrée unique vers les microservices.
 * Accessible uniquement sur le réseau Docker interne (non exposée sur Internet).
 *   /notify       -> microservice notifications (NOTIFI_SERVICE_URL)
 *   /update-stock -> microservice stock-management (STOCK_SERVICE_URL)
 * @module gateway
 */
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const logger = require('./logger');
const notifiProxy = require('./routes/notifi');
const stockProxy = require('./routes/stock');

const app = express();

// Middleware pour analyser les requêtes JSON
app.use(express.json());
app.use(morgan('combined', { stream: logger.stream }));

/** Sonde de supervision de la gateway. */
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes principales pour chaque microservice
app.use('/notify', notifiProxy);
app.use('/update-stock', stockProxy);

// Lancer le Gateway
const PORT = process.env.GATEWAY_PORT || 8000;
app.listen(PORT, () => {
  logger.info(`Gateway opérationnel sur le port ${PORT}`);
});
