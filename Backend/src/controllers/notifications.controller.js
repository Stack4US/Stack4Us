import * as notificationsService from '../services/notifications.service.js';

// Create new notification
export async function insertNotification(req, res, next) {
  try {
    const user_id = req.body.user_id;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id are required' });
    }
    const newNotification = await notificationsService.createNotification({ user_id });
    res.status(201).json(newNotification);
  } catch (err) {
    next(err);
  }
}

// Get all notifications for logged user
export async function getAllNotifications(req, res, next) {
  try {
    const userId = req.user.user_id;
    const notifications = await notificationsService.getNotificationsByUserId(userId);
    res.status(200).json(notifications);
  } catch (err) {
    next(err);
  }
}

// Mark one notification as read
export async function markNotificationAsRead(req, res, next) {
  try {
    const userId = req.user.user_id;
    const notificationId = req.params.id;

    const result = await notificationsService.markAsRead(notificationId, userId);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
