import pool from '../config/data_base_conection.js';

export async function getNotificationsByUserId(userId) {
  const uid = parseInt(userId, 10);
  if (!uid || isNaN(uid)) {
    throw new Error('Invalid user_id');
  }

  const result = await pool.query(
    'SELECT notification_id, user_id, message, status, date FROM notifications WHERE user_id = $1 ORDER BY date DESC',
    [uid]
  );

  return result.rows;
}

export async function markAsRead(notificationId, userId) {
  const nid = parseInt(notificationId, 10);
  const uid = parseInt(userId, 10);

  if (!nid || isNaN(nid)) {
    return { error: 'Invalid notification ID', status: 400 };
  }

  const notifExists = await pool.query(
    'SELECT * FROM notifications WHERE notification_id = $1 AND user_id = $2',
    [nid, uid]
  );

  if (notifExists.rows.length === 0) {
    return { error: 'Notification not found or unauthorized', status: 404 };
  }

  await pool.query(
    "UPDATE notifications SET status = 'read' WHERE notification_id = $1",
    [nid]
  );

  return { message: 'Notification marked as read' };
}