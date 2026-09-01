import express from 'express';
import {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../controllers/menu.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Menu
 *   description: Menu item management
 */

/**
 * @swagger
 * /api/menu:
 *   get:
 *     summary: Get all menu items
 *     tags: [Menu]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filter by availability
 *     responses:
 *       200:
 *         description: List of menu items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MenuItem'
 */
router.get('/', getMenuItems);

/**
 * @swagger
 * /api/menu/{id}:
 *   get:
 *     summary: Get a menu item by ID
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu item details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItem'
 *       404:
 *         description: Menu item not found
 */
router.get('/:id', getMenuItem);

/**
 * @swagger
 * /api/menu:
 *   post:
 *     summary: Create a new menu item (admin only)
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, category]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               category: { type: string, enum: [appetizer, main, dessert, beverage] }
 *               image: { type: string }
 *     responses:
 *       201:
 *         description: Menu item created
 */
router.post('/', protect, admin, createMenuItem);

/**
 * @swagger
 * /api/menu/{id}:
 *   put:
 *     summary: Update a menu item (admin only)
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MenuItem'
 *     responses:
 *       200:
 *         description: Menu item updated
 */
router.put('/:id', protect, admin, updateMenuItem);

/**
 * @swagger
 * /api/menu/{id}:
 *   delete:
 *     summary: Delete a menu item (admin only)
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu item removed
 */
router.delete('/:id', protect, admin, deleteMenuItem);

export default router;
