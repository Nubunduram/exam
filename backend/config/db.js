// config/db.js
const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Établit la connexion à MongoDB à partir de la variable MONGO_URI.
 * L'URI n'est jamais journalisée (elle contient des identifiants).
 * Arrête le processus si la connexion initiale échoue (Docker le redémarre).
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB connecté');
  } catch (err) {
    logger.error('Connexion MongoDB impossible', { error: err.message });
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => logger.warn('MongoDB déconnecté'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnecté'));

module.exports = connectDB;
