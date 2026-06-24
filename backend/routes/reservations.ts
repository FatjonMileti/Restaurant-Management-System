import express from 'express';
import { getReservations, getReservation, createReservation, updateReservation, cancelReservation } from '../controllers/reservations.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getReservations);
router.get('/:id', protect, getReservation);
router.post('/', protect, createReservation);
router.put('/:id', protect, admin, updateReservation);
router.put('/:id/cancel', protect, cancelReservation);

export default router;
