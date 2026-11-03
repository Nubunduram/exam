// microservices/notifications/index.js
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const nodemailer = require('nodemailer');
const logger = require('./logger');

const app = express();
app.use(express.json());
app.use(morgan('combined', { stream: logger.stream }));

// Configuration de Nodemailer (les identifiants ne sont JAMAIS journalisés)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Adresse Gmail
    pass: process.env.EMAIL_APPLICATION_PASSWORD, // Mot de passe spécifique à l'application
  },
});

/** Sonde de supervision du service de notification. */
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Route pour envoyer un email
app.post('/notify', async (req, res) => {
  const { to, subject, text } = req.body;
  logger.info('Demande de notification', { to, subject });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Email envoyé avec succès', { to, subject });
    return res.status(200).json({ message: 'Email envoyé avec succès.' });
  } catch (error) {
    logger.error('Erreur lors de l\'envoi de l\'email', { error: error.message });
    return res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email.' });
  }
});

// Lancer le service Notification
const PORT = process.env.NOTIFI_PORT || 4002;
app.listen(PORT, () => {
  logger.info(`Service de notification en écoute sur le port ${PORT}`);
});
