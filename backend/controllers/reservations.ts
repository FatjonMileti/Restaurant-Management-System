import { Request, Response } from 'express';
import Reservation from '../models/Reservation.js';

export const getReservations = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.user && req.user.role === 'customer') filter.user = req.user._id;
    if (req.query.status) filter.status = req.query.status;

    const reservations = await Reservation.find(filter).populate('user', 'name email').sort('-date');
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
  }
};

export const getReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('user', 'name email');
    if (!reservation) {
      res.status(404).json({ message: 'Reservation not found' });
      return;
    }

    if (req.user && req.user.role === 'customer' && reservation.user._id.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    res.json(reservation);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
  }
};

export const createReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, time, guests, tableNumber, specialRequests } = req.body;

    const reservation = await Reservation.create({
      user: req.user!._id,
      date,
      time,
      guests,
      tableNumber,
      specialRequests,
    });

    res.status(201).json(reservation);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
  }
};

export const updateReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!reservation) {
      res.status(404).json({ message: 'Reservation not found' });
      return;
    }
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
  }
};

export const cancelReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      res.status(404).json({ message: 'Reservation not found' });
      return;
    }

    if (req.user && req.user.role === 'customer' && reservation.user.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized to cancel this reservation' });
      return;
    }

    reservation.status = 'cancelled';
    await reservation.save();
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
  }
};
