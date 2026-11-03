// backend/routes/productRoutes.js
const express = require('express');
const { getProducts, updateProductStock } = require('../controllers/productController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const schemas = require('../validators/schemas');

const router = express.Router();

router.get('/', getProducts); // public
router.put(
  '/:productId/stock',
  authenticateToken,
  isAdmin,
  validate(schemas.idParam('productId'), 'params'),
  validate(schemas.updateStock),
  updateProductStock
); // administrateurs

module.exports = router;
