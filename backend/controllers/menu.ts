import { Request, Response } from 'express';
import MenuItem from '../models/MenuItem.js';

export const getMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.available) filter.available = req.query.available === 'true';

    const items = await MenuItem.find(filter).sort('category');
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
  }
};

export const getMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      res.status(404).json({ message: 'Menu item not found' });
      return;
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
  }
};

export const createMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, price, category, image } = req.body;
    const item = await MenuItem.create({ name, description, price, category, image });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
  }
};

export const updateMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) {
      res.status(404).json({ message: 'Menu item not found' });
      return;
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
  }
};

export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) {
      res.status(404).json({ message: 'Menu item not found' });
      return;
    }
    res.json({ message: 'Menu item removed' });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
  }
};
