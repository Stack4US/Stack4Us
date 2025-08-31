import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import {
  getAllNotifications,
  markNotificationAsRead,
} from '../controllers/notifications.controller.js';

const router = express.Router();

router.get('/', authenticateToken, getAllNotifications);
router.patch('/:id', authenticateToken, markNotificationAsRead);

/* 
rutas funcionales:
/api/notifications -> GET -> obtener todas las notificaciones del usuario autenticado
recibe el token en el header Authorization

/api/notifications/:id -> PATCH -> marcar una notificación como leída
recibe el token en el header Authorization y el id de la notificación en la URL
*/

export default router;