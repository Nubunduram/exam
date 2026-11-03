// backend/models/Product.js
const mongoose = require('mongoose');

/**
 * Produit du catalogue.
 * @typedef {Object} Product
 * @property {string} name - Nom affiché.
 * @property {number} price - Prix unitaire en euros (>= 0), seule source de vérité pour les commandes.
 * @property {string} description - Description courte.
 * @property {number} stock - Quantité disponible (entier >= 0).
 */
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    stock: { type: Number, required: true, min: 0, validate: Number.isInteger },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
