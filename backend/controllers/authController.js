// backend/controllers/authController.js
/**
 * Contrôleur d'authentification : inscription, connexion, session, déconnexion.
 * @module controllers/authController
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../config/logger');
const { AUTH_COOKIE } = require('../middlewares/authMiddleware');

/** Durée de validité de la session (JWT + cookie). */
const SESSION_MS = 60 * 60 * 1000; // 1 heure

/**
 * Options du cookie de session :
 * - httpOnly : illisible par le JavaScript du navigateur (protection XSS) ;
 * - secure : envoyé uniquement en HTTPS (désactivé seulement en local via COOKIE_SECURE=false) ;
 * - sameSite strict : non envoyé par un site tiers (protection CSRF).
 * @returns {express.CookieOptions}
 */
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE !== 'false',
  sameSite: 'strict',
  maxAge: SESSION_MS,
  path: '/',
});

/** Hash factice utilisé pour garder un temps de réponse constant quand l'utilisateur n'existe pas. */
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

/**
 * Connecte un utilisateur.
 * Corps validé par Joi : { username, password }.
 * Message d'erreur générique (pas d'énumération des comptes) et comparaison bcrypt
 * systématique (temps de réponse constant). Le JWT est déposé dans un cookie httpOnly.
 *
 * @route POST /api/auth/login
 * @returns {200} { role, username } | {401} identifiants invalides | {500}
 */
exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    const isMatch = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user || !isMatch) {
      logger.audit('auth.login.failure', { username, reason: user ? 'bad_password' : 'unknown_user', ip: req.ip });
      return res.status(401).json({ message: "Nom d'utilisateur ou mot de passe incorrect." });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: SESSION_MS / 1000,
      algorithm: 'HS256',
    });
    res.cookie(AUTH_COOKIE, token, cookieOptions());
    logger.audit('auth.login.success', { userId: user._id.toString(), role: user.role, ip: req.ip });

    return res.json({ message: 'Connexion réussie.', role: user.role, username: user.username });
  } catch (error) {
    logger.error('Erreur lors de la connexion', { error: error.message });
    return res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
};

/**
 * Inscrit un nouvel utilisateur (rôle "user" imposé, jamais fourni par le client).
 * Corps validé par Joi : { username, email, password }.
 *
 * @route POST /api/auth/register
 * @returns {201} compte créé | {409} email ou nom déjà utilisé | {500}
 */
exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne(mongoose.trusted({ $or: [{ email }, { username }] }));
    if (existingUser) {
      const field = existingUser.email === email ? 'Cet email' : "Ce nom d'utilisateur";
      return res.status(409).json({ message: `${field} est déjà utilisé.` });
    }

    const user = await User.create({ username, email, password, role: 'user' });
    logger.audit('auth.register.success', { userId: user._id.toString(), ip: req.ip });

    return res.status(201).json({ message: 'Compte créé avec succès. Vous pouvez maintenant vous connecter.' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Cet email ou ce nom d'utilisateur est déjà utilisé." });
    }
    logger.error("Erreur lors de l'inscription", { error: error.message });
    return res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
};

/**
 * Renvoie l'utilisateur de la session courante (utilisé par le frontend au chargement).
 * @route GET /api/auth/me
 * @returns {200} { username, role } | {401} | {404}
 */
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('username role');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    return res.json({ username: user.username, role: user.role });
  } catch (error) {
    logger.error('Erreur /auth/me', { error: error.message });
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * Déconnecte l'utilisateur en supprimant le cookie de session.
 * @route POST /api/auth/logout
 * @returns {200}
 */
exports.logout = (req, res) => {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(AUTH_COOKIE, opts);
  return res.json({ message: 'Déconnexion réussie.' });
};
