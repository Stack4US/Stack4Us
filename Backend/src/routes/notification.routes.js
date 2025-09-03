import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import {
  getAllNotifications,
  markNotificationAsRead,
} from '../controllers/notifications.controller.js';

const router = express.Router();

// GET all notifications (auth required)
router.get('/', authenticateToken, getAllNotifications);

// PATCH mark notification as read (auth required)
router.patch('/:id', authenticateToken, markNotificationAsRead);

export default router;
