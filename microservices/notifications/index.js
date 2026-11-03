// microservices/notifications/index.js
/**
 * Microservice de notification par email (Nodemailer / SMTP Gmail).
 * Accessible uniquement depuis le réseau Docker interne via la gateway,
 * et protégé par une clé partagée (en-tête `x-api-key`).
 * @module notifications
 */
require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const morgan = require('morgan');
const nodemailer = require('nodemailer');
const logger = require('./logger');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));
app.use(morgan('combined', { stream: logger.stream }));

const NOTIFY_API_KEY = process.env.NOTIFY_API_KEY;
if (!NOTIFY_API_KEY) {
  logger.warn(
    'NOTIFY_API_KEY non défini : le service accepte les requêtes sans authentification (développement uniquement).'
  );
}

// Configuration de Nodemailer (les identifiants ne sont JAMAIS journalisés)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Adresse Gmail
    pass: process.env.EMAIL_APPLICATION_PASSWORD, // Mot de passe spécifique à l'application
  },
});

/**
 * Vérifie la clé d'API partagée (comparaison à temps constant).
 * @type {import('express').RequestHandler}
 */
const requireApiKey = (req, res, next) => {
  if (!NOTIFY_API_KEY) return next();
  const provided = Buffer.from(String(req.get('x-api-key') || ''));
  const expected = Buffer.from(NOTIFY_API_KEY);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    logger.warn('Appel /notify refusé : clé API invalide', { ip: req.ip });
    return res.status(401).json({ message: 'Non autorisé.' });
  }
  next();
};

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

/** Sonde de supervision du service de notification. */
app.get('/health', (req, res) => res.json({ status: 'ok' }));

/**
 * Envoie un email texte.
 * Corps : { to, subject, text } (destinataire unique, sujet <= 200 car., texte <= 10 000 car.).
 * @route POST /notify
 * @returns {200} envoyé | {400} données invalides | {401} clé invalide | {500} échec SMTP
 */
app.post('/notify', requireApiKey, async (req, res) => {
  const { to, subject, text } = req.body || {};

  if (
    typeof to !== 'string' ||
    !EMAIL_RE.test(to) ||
    typeof subject !== 'string' ||
    !subject.trim() ||
    subject.length > 200 ||
    /[\r\n]/.test(subject) ||
    typeof text !== 'string' ||
    !text.trim() ||
    text.length > 10000
  ) {
    return res.status(400).json({ message: 'Paramètres de notification invalides.' });
  }

  logger.info('Demande de notification', { to, subject });
  try {
    await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
    logger.info('Email envoyé avec succès', { to, subject });
    return res.status(200).json({ message: 'Email envoyé avec succès.' });
  } catch (error) {
    logger.error("Erreur lors de l'envoi de l'email", { error: error.message });
    return res.status(500).json({ message: "Erreur lors de l'envoi de l'email." });
  }
});

// Lancer le service Notification
const PORT = process.env.NOTIFI_PORT || 4002;
app.listen(PORT, () => {
  logger.info(`Service de notification en écoute sur le port ${PORT}`);
});
