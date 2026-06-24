import express from 'express';
import { getOrders, getOrder, createOrder, updateOrderStatus } from '../controllers/orders.js';
import { protect, staff } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getOrders);
router.get('/:id', protect, getOrder);
router.post('/', protect, createOrder);
router.put('/:id/status', protect, staff, updateOrderStatus);

export default router;
