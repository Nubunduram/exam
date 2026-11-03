// backend/controllers/productController.js
/**
 * Contrôleur des produits.
 * @module controllers/productController
 */
const Product = require('../models/Product');
const logger = require('../config/logger');

/**
 * Liste les produits du catalogue (route publique).
 * @route GET /api/products
 * @returns {200} Product[] | {500}
 */
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    return res.json(products);
  } catch (error) {
    logger.error('Erreur lors de la récupération des produits', { error: error.message });
    return res.status(500).json({ message: 'Impossible de charger les produits.' });
  }
};

/**
 * Met à jour le stock d'un produit (admin).
 * Corps validé par Joi : { stock } entier >= 0.
 * @route PUT /api/products/:productId/stock
 * @returns {200} { message, product } | {404} | {500}
 */
exports.updateProductStock = async (req, res) => {
  const { stock } = req.body;
  const { productId } = req.params;
  try {
    const product = await Product.findByIdAndUpdate(productId, { stock }, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé.' });
    }
    logger.audit('product.stock.updated', { productId, stock, by: req.user.userId });
    return res.json({ message: `Stock de "${product.name}" mis à jour à ${stock}.`, product });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du stock', { error: error.message });
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};
