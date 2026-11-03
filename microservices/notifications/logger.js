/**
 * Logger applicatif centralisé (Winston).
 *
 * - Sortie console au format JSON (collectée par Docker / Dozzle).
 * - Si LOG_DIR est défini : fichiers error.log, combined.log et audit.log
 *   avec rotation par taille (5 Mo x 5 fichiers).
 * - `logger.audit(event, meta)` trace les événements sensibles
 *   (connexion, inscription, actions admin) dans un journal d'audit dédié.
 *
 * @module logger
 */
const path = require('path');
const { createLogger, format, transports } = require('winston');

const SERVICE_NAME = process.env.SERVICE_NAME || 'service';
const LOG_DIR = process.env.LOG_DIR;

const baseFormat = format.combine(format.timestamp(), format.errors({ stack: true }), format.json());

const loggerTransports = [new transports.Console()];
if (LOG_DIR) {
  const fileOpts = { maxsize: 5 * 1024 * 1024, maxFiles: 5, tailable: true };
  loggerTransports.push(
    new transports.File({ filename: path.join(LOG_DIR, 'error.log'), level: 'error', ...fileOpts }),
    new transports.File({ filename: path.join(LOG_DIR, 'combined.log'), ...fileOpts })
  );
}

const logger = createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'http' : 'debug'),
  defaultMeta: { service: SERVICE_NAME, env: process.env.APP_ENV || process.env.NODE_ENV || 'development' },
  format: baseFormat,
  transports: loggerTransports,
});

const auditLogger = createLogger({
  level: 'info',
  defaultMeta: { service: SERVICE_NAME, type: 'audit' },
  format: baseFormat,
  transports: [
    new transports.Console(),
    ...(LOG_DIR
      ? [
          new transports.File({
            filename: path.join(LOG_DIR, 'audit.log'),
            maxsize: 5 * 1024 * 1024,
            maxFiles: 10,
            tailable: true,
          }),
        ]
      : []),
  ],
});

/**
 * Enregistre un événement d'audit.
 * @param {string} event - Nom de l'événement (ex: "auth.login.success").
 * @param {object} [meta] - Données contextuelles (jamais de mot de passe ni de token).
 */
logger.audit = (event, meta = {}) => auditLogger.info(event, meta);

/** Flux utilisable par morgan pour journaliser les requêtes HTTP. */
logger.stream = { write: (message) => logger.http(message.trim()) };

module.exports = logger;
