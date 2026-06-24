import { Request, Response } from 'express';
import Order from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.user && req.user.role === 'customer') filter.user = req.user._id;
    if (req.query.status) filter.status = req.query.status;

    const orders = await Order.find(filter).populate('user', 'name email').sort('-createdAt');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
  }
};

export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.menuItem');

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (req.user && req.user.role === 'customer' && order.user._id.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
  }
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, tableNumber, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ message: 'Order must have at least one item' });
      return;
    }

    const menuItemIds = items.map((i: { menuItem: string }) => i.menuItem);
    const existingItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    if (existingItems.length !== menuItemIds.length) {
      res.status(400).json({ message: 'One or more menu items not found' });
      return;
    }

    const totalAmount = items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0);

    const order = await Order.create({
      user: req.user!._id,
      items,
      totalAmount,
      tableNumber,
      paymentMethod,
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
  }
};
