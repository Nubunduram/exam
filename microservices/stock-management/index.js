// microservices/stock-management/index.js
/**
 * Microservice de gestion de stock : reçoit les événements de mouvement de stock.
 * @module stock-management
 */
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const logger = require('./logger');

const app = express();
const PORT = process.env.STOCK_PORT || 4003;

app.use(express.json());
app.use(morgan('combined', { stream: logger.stream }));

/** Sonde de supervision du service de stock. */
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/update-stock', (req, res) => {
  const { productId, quantity } = req.body;
  logger.info('Mise à jour du stock', { productId, quantity });
  res.send(`Stock mis à jour pour le produit de ID : ${productId}`);
});

app.listen(PORT, () => logger.info(`Service de gestion des stocks sur le port ${PORT}`));
