// backend/middlewares/authMiddleware.js
/**
 * Middlewares d'authentification et d'autorisation.
 * @module middlewares/authMiddleware
 */
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/** Nom du cookie httpOnly qui transporte le JWT. */
const AUTH_COOKIE = 'token';

/**
 * Vérifie le JWT de la requête et expose son contenu dans `req.user` ({ userId, role }).
 * Le token est lu en priorité dans le cookie httpOnly (inaccessible au JavaScript du
 * navigateur, donc protégé contre le vol par XSS), sinon dans l'en-tête
 * `Authorization: Bearer <token>` (clients API, tests).
 *
 * Réponses : 401 si aucun token, 401 si token invalide ou expiré.
 * @type {import('express').RequestHandler}
 */
exports.authenticateToken = (req, res, next) => {
  const header = req.headers.authorization;
  const token = req.cookies?.[AUTH_COOKIE] || (header?.startsWith('Bearer ') ? header.slice(7) : null);

  if (!token) {
    return res.status(401).json({ message: 'Authentification requise.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { userId: payload.userId, role: payload.role };
    return next();
  } catch (err) {
    logger.warn('Token JWT invalide', { ip: req.ip, path: req.originalUrl, reason: err.name });
    return res.status(401).json({ message: 'Session expirée ou invalide, veuillez vous reconnecter.' });
  }
};

/**
 * Autorise uniquement les administrateurs. Doit être placé après `authenticateToken`.
 * Réponse : 403 si l'utilisateur n'a pas le rôle "admin" (tentative journalisée en audit).
 * @type {import('express').RequestHandler}
 */
exports.isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    logger.audit('access.denied.admin', { userId: req.user?.userId, path: req.originalUrl, ip: req.ip });
    return res.status(403).json({ message: 'Accès interdit.' });
  }
  next();
};

exports.AUTH_COOKIE = AUTH_COOKIE;
