// gateway/server.js
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
