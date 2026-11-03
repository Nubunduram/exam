const mongoose = require('mongoose');

/**
 * Commande client.
 * @typedef {Object} Order
 * @property {ObjectId} userId - Auteur de la commande.
 * @property {Array<{productId: ObjectId, quantity: number, price: number}>} items - Lignes (prix figé au moment de l'achat).
 * @property {number} total - Montant total calculé côté serveur.
 * @property {string} status - En attente | En cours de traitement | Expédiée | Délivrée | Annulée.
 * @property {{street: string, city: string, postalCode: string, country: string}} shippingAddress
 * @property {'Carte bancaire'|'PayPal'|'Virement'} paymentMethod
 * @property {'colissimo'|'chronopost'} shippingMethod
 */

// Define the schema for individual order items
const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId, // Reference to the product in your database
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Au moins 1 produit est requis'],
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
});

// Define the schema for the entire order
const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the user in your database
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema], // Array of order items
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['En attente', 'En cours de traitement', 'Expédiée', 'Délivrée', 'Annulée'],
      default: 'En attente',
    },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ['Carte bancaire', 'PayPal', 'Virement'],
      required: true,
    },
    shippingMethod: {
      type: String,
      enum: ['colissimo', 'chronopost'],
      required: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Create the model
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
