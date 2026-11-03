// backend/controllers/orderController.js
/**
 * Contrôleur des commandes.
 * @module controllers/orderController
 */
const axios = require('axios');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const logger = require('../config/logger');

/** URL du service de notification (via la gateway). */
const NOTIFY_URL = process.env.NOTIFY_URL || 'http://localhost:8000/notify';
/** Clé partagée avec le microservice de notification. */
const NOTIFY_API_KEY = process.env.NOTIFY_API_KEY;
/** Destinataire des alertes "nouvelle commande" côté boutique. */
const ORDER_NOTIFY_EMAIL = process.env.ORDER_NOTIFY_EMAIL;

/**
 * Envoie un email via le microservice de notification. N'interrompt jamais le flux
 * principal : une erreur d'envoi est seulement journalisée.
 * @param {{to: string, subject: string, text: string}} mail
 * @returns {Promise<void>}
 */
const sendNotification = async (mail) => {
  if (!mail.to) return;
  try {
    await axios.post(NOTIFY_URL, mail, {
      timeout: 10000,
      headers: NOTIFY_API_KEY ? { 'x-api-key': NOTIFY_API_KEY } : {},
    });
  } catch (error) {
    logger.error("Erreur lors de l'envoi de la notification", { error: error.message });
  }
};

/**
 * Remet en stock les quantités déjà réservées (annulation d'une réservation partielle).
 * @param {Array<{productId: string, quantity: number}>} reserved
 * @returns {Promise<void>}
 */
const releaseStock = (reserved) =>
  Promise.all(reserved.map(({ productId, quantity }) =>
    Product.updateOne({ _id: productId }, { $inc: { stock: quantity } })));

/**
 * Crée une commande pour l'utilisateur connecté.
 *
 * Sécurité : le prix et le total envoyés par le client sont ignorés ; ils sont
 * recalculés à partir des prix en base. Le stock est réservé de façon atomique
 * (décrément conditionnel `stock >= quantité`) et restitué si une étape échoue.
 *
 * Corps validé par Joi : { items: [{ productId, quantity }], shippingAddress, paymentMethod, shippingMethod }
 * @route POST /api/orders
 * @returns {201} { message, order } | {400} produit introuvable / stock insuffisant | {500}
 */
exports.createOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod, shippingMethod } = req.body;
  const userId = req.user.userId;
  const reserved = [];

  try {
    const ids = items.map((i) => i.productId);
    const products = await Product.find({ _id: mongoose.trusted({ $in: ids }) });
    const byId = new Map(products.map((p) => [p._id.toString(), p]));

    const orderItems = [];
    for (const { productId, quantity } of items) {
      const product = byId.get(productId);
      if (!product) {
        await releaseStock(reserved);
        return res.status(400).json({ message: "Un des produits de votre panier n'existe plus." });
      }
      const updated = await Product.findOneAndUpdate(
        // opérateurs écrits par le serveur : marqués "trusted" (sanitizeFilter neutralise ceux du client)
        { _id: productId, stock: mongoose.trusted({ $gte: quantity }) },
        { $inc: { stock: -quantity } },
        { new: true }
      );
      if (!updated) {
        await releaseStock(reserved);
        return res.status(400).json({
          message: `Stock insuffisant pour "${product.name}" (disponible : ${product.stock}).`,
        });
      }
      reserved.push({ productId, quantity });
      orderItems.push({ productId, quantity, price: product.price });
    }

    const total = Math.round(orderItems.reduce((acc, i) => acc + i.price * i.quantity, 0) * 100) / 100;

    const savedOrder = await Order.create({
      userId,
      items: orderItems,
      total,
      shippingAddress,
      paymentMethod,
      shippingMethod,
    });
    logger.audit('order.created', { orderId: savedOrder._id.toString(), userId, total });

    const lines = orderItems
      .map((i) => `- ${byId.get(i.productId).name} x ${i.quantity} : ${(i.price * i.quantity).toFixed(2)} €`)
      .join('\n');
    const user = await User.findById(userId).select('email username');

    // Notifications non bloquantes : client + boutique
    sendNotification({
      to: user?.email,
      subject: 'Confirmation de votre commande',
      text: `Bonjour ${user?.username},\n\nVotre commande n°${savedOrder._id} a bien été enregistrée :\n${lines}\nTotal : ${total.toFixed(2)} €`,
    });
    sendNotification({
      to: ORDER_NOTIFY_EMAIL,
      subject: 'Nouvelle commande créée',
      text: `Commande n°${savedOrder._id} (${total.toFixed(2)} €) :\n${lines}`,
    });

    return res.status(201).json({ message: 'Commande confirmée avec succès !', order: savedOrder });
  } catch (error) {
    await releaseStock(reserved).catch(() => {});
    logger.error('Erreur lors de la création de la commande', { error: error.message });
    return res.status(500).json({ message: 'Une erreur est survenue lors de la création de la commande.' });
  }
};

/**
 * Liste toutes les commandes, les plus récentes d'abord (admin).
 * @route GET /api/orders
 * @returns {200} Order[] | {500}
 */
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    return res.status(200).json(orders);
  } catch (error) {
    logger.error('Erreur lors de la récupération des commandes', { error: error.message });
    return res.status(500).json({ message: 'Erreur lors de la récupération des commandes.' });
  }
};

/**
 * Liste les commandes de l'utilisateur connecté.
 * @route GET /api/orders/mine
 * @returns {200} Order[] | {500}
 */
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    return res.status(200).json(orders);
  } catch (error) {
    logger.error('Erreur lors de la récupération des commandes utilisateur', { error: error.message });
    return res.status(500).json({ message: 'Erreur lors de la récupération de vos commandes.' });
  }
};

/**
 * Supprime une commande (admin). Le stock des commandes non expédiées est restitué.
 * @route DELETE /api/orders/:id
 * @returns {200} | {404} | {500}
 */
exports.deleteOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await Order.findByIdAndDelete(id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvée.' });
    if (['En attente', 'En cours de traitement'].includes(order.status)) {
      await releaseStock(order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
    }
    logger.audit('order.deleted', { orderId: id, by: req.user.userId });
    return res.status(200).json({ message: `Commande ${id} supprimée.` });
  } catch (error) {
    logger.error('Erreur lors de la suppression de la commande', { error: error.message });
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * Valide une commande : passage au statut "En cours de traitement" (admin).
 * @route PUT /api/orders/:id/validate
 * @returns {200} { message, order } | {404} | {500}
 */
exports.validateOrder = async (req, res) => {
  req.body = { status: 'En cours de traitement' };
  req.params.orderId = req.params.id;
  return exports.updateOrderStatus(req, res);
};

/**
 * Met à jour le statut d'une commande (admin) et notifie le client par email.
 * Corps validé par Joi : { status } parmi les statuts autorisés.
 * @route PUT /api/orders/:orderId/status
 * @returns {200} { message, order } | {404} | {500}
 */
exports.updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true, runValidators: true });
    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée.' });
    }

    logger.audit('order.status.updated', { orderId, status, by: req.user.userId });

    const user = await User.findById(order.userId).select('email username');
    sendNotification({
      to: user?.email,
      subject: `Votre commande est maintenant : ${status}`,
      text: `Bonjour ${user?.username},\n\nLe statut de votre commande n°${orderId} est désormais : ${status}.`,
    });

    return res.status(200).json({ message: `Statut mis à jour : ${status}.`, order });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la commande', { error: error.message });
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};
