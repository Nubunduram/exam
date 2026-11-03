// backend/routes/authRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, register, me, logout } = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const schemas = require('../validators/schemas');

const router = express.Router();

/** Anti brute-force : 10 tentatives de connexion / inscription par IP et par 15 minutes. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives, veuillez réessayer dans 15 minutes.' },
});

router.post('/login', authLimiter, validate(schemas.login), login);
router.post('/register', authLimiter, validate(schemas.register), register);
router.get('/me', authenticateToken, me);
router.post('/logout', logout);

module.exports = router;
