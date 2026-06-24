import express from 'express';
import { body } from 'express-validator';
import { register, login, getProfile, getUsers, deleteUser, updateUserRole, createUserByAdmin } from '../controllers/auth.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], register);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], login);

router.get('/profile', protect, getProfile);
router.get('/users', protect, admin, getUsers);
router.post('/users', protect, admin, createUserByAdmin);
router.delete('/users/:id', protect, admin, deleteUser);
router.patch('/users/:id/role', protect, admin, updateUserRole);

export default router;
