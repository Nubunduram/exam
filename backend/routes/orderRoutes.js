// backend/routes/orderRoutes.js
const express = require('express');
const {
  createOrder,
  deleteOrder,
  getOrders,
  getMyOrders,
  validateOrder,
  updateOrderStatus,
} = require('../controllers/orderController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const schemas = require('../validators/schemas');

const router = express.Router();

router.get('/', authenticateToken, isAdmin, getOrders); // administrateurs
router.get('/mine', authenticateToken, getMyOrders); // utilisateur connecté : ses commandes
router.post('/', authenticateToken, validate(schemas.createOrder), createOrder); // utilisateur connecté
router.delete('/:id', authenticateToken, isAdmin, validate(schemas.idParam('id'), 'params'), deleteOrder); // administrateurs
router.put('/:id/validate', authenticateToken, isAdmin, validate(schemas.idParam('id'), 'params'), validateOrder); // administrateurs
router.put(
  '/:orderId/status',
  authenticateToken,
  isAdmin,
  validate(schemas.idParam('orderId'), 'params'),
  validate(schemas.updateOrderStatus),
  updateOrderStatus
); // administrateurs

module.exports = router;
