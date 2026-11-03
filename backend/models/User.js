// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Utilisateur de la boutique.
 * Le mot de passe est toujours stocké haché (bcrypt, coût 10) grâce au hook `pre('save')`.
 * @typedef {Object} User
 * @property {string} username - Identifiant de connexion unique.
 * @property {string} email - Adresse email unique (stockée en minuscules).
 * @property {string} password - Hash bcrypt du mot de passe.
 * @property {'user'|'admin'} role - Rôle (par défaut "user").
 */
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

// Hachage du mot de passe avant sauvegarde (uniquement s'il a été modifié)
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model('User', userSchema);
