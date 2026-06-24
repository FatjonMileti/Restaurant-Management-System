import express from 'express';
import { getMenuItems, getMenuItem, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/menu.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getMenuItems);
router.get('/:id', getMenuItem);
router.post('/', protect, admin, createMenuItem);
router.put('/:id', protect, admin, updateMenuItem);
router.delete('/:id', protect, admin, deleteMenuItem);

export default router;
