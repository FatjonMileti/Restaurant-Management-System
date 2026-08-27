import express from 'express';
import { getReservations, getReservation, createReservation, updateReservation, cancelReservation, deleteReservation } from '../controllers/reservations.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Reservation management
 */

/**
 * @swagger
 * /api/reservations:
 *   get:
 *     summary: Get reservations
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of reservations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reservation'
 */
router.get('/', protect, getReservations);

/**
 * @swagger
 * /api/reservations/{id}:
 *   get:
 *     summary: Get a reservation by ID
 *     tags: [Reservations]
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
 *         description: Reservation details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reservation'
 */
router.get('/:id', protect, getReservation);

/**
 * @swagger
 * /api/reservations:
 *   post:
 *     summary: Create a reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, time, guests]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *               time:
 *                 type: string
 *               guests:
 *                 type: integer
 *               tableNumber:
 *                 type: integer
 *               specialRequests:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reservation created
 */
router.post('/', protect, createReservation);

/**
 * @swagger
 * /api/reservations/{id}:
 *   put:
 *     summary: Update a reservation (admin only)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Reservation'
 *     responses:
 *       200:
 *         description: Reservation updated
 */
router.put('/:id', protect, admin, updateReservation);

/**
 * @swagger
 * /api/reservations/{id}/cancel:
 *   put:
 *     summary: Cancel a reservation
 *     tags: [Reservations]
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
 *         description: Reservation cancelled
 */
router.delete('/:id', protect, admin, deleteReservation);

router.put('/:id/cancel', protect, cancelReservation);

export default router;
