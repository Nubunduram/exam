// backend/controllers/orderController.js
const axios = require('axios');
const Order = require('../models/Order');
const logger = require('../config/logger');

// URL du service de notification (via la gateway) et destinataire des alertes de commande
const NOTIFY_URL = process.env.NOTIFY_URL || 'http://localhost:8000/notify';
const ORDER_NOTIFY_EMAIL = process.env.ORDER_NOTIFY_EMAIL;

exports.createOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod, shippingMethod } = req.body;
  const userId = req.user.userId;

  // Vérification du format des données
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: 'Le corps de la requête doit contenir un tableau d\'objets { productId, quantity }.',
    });
  }

  try {
    // Logique pour préparer les détails de la commande
    const orderDetails = items.map(({ productId, quantity, price }) => ({ productId, quantity, price }));

    // Création de la commande dans la base de données
    const total = items.reduce(
      (acc, { price, quantity }) => acc + price * quantity,
      0
    );

    const newOrder = new Order({
      userId,
      items: orderDetails,
      total,
      shippingAddress,
      paymentMethod,
      shippingMethod
    });

    // Sauvegarder la commande dans la base de données
    const savedOrder = await newOrder.save();
    logger.audit('order.created', { orderId: savedOrder._id.toString(), userId, total });

    // Appel au micro-service de notification
    try {
      await axios.post(NOTIFY_URL, {
        to: ORDER_NOTIFY_EMAIL,
        subject: 'Nouvelle Commande Créée',
        text: `Une commande a été créée avec succès pour les produits suivants : \n${orderDetails
          .map((item) => `Produit ID : ${item.productId}, Quantité : ${item.quantity}`)
          .join('\n')}`,
      });
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de la notification', { error: error.message });
    }

    // Réponse de succès
    res.status(201).json({
      message: 'Commande créée avec succès',
      order: savedOrder,
    });
  } catch (error) {
    logger.error('Erreur lors de la création de la commande', { error: error.message });
    res.status(500).json({
      message: 'Une erreur est survenue lors de la création de la commande.',
    });
  }
};

exports.deleteOrder = async(req, res)=>{
    const { orderId } = req.body;
    logger.debug(`orderId to delete is ${orderId}`);
}

exports.getOrders = async(req, res)=>{

  const orders = await Order.find();
      res.status(200).json(orders);

}

exports.validateOrder = async (req, res) => {
  const { orderId } = req.body;
  res.status(200).json({message: `Commande ${orderId} validée avec succès.`})
}

exports.updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    // Vérification des données
    if (!status) {
      return res.status(400).json({ message: "Le statut est requis." });
    }

    // Recherche de la commande et mise à jour
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status, updatedAt: new Date() }, // Mise à jour du statut et de la date de modification
      { new: true } // Retourne la commande mise à jour
    );

    if (!order) {
      return res.status(404).json({ message: "Commande non trouvée." });
    }

    logger.audit('order.status.updated', { orderId, status, by: req.user.userId });
    res.status(200).json({ message: "Statut mis à jour avec succès", order });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la commande', { error: error.message });
    res.status(500).json({ message: "Erreur serveur." });
  }
};
