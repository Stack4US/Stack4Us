import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import {
  getAnswersRatingsSummary,
  getMyRatings,
  getUserRatingSummary,
  getRanking
} from '../controllers/ratings.controller.js';

const router = express.Router();

router.get('/answers-summary', getAnswersRatingsSummary);
router.get('/my-ratings', authenticateToken, getMyRatings);
router.get('/users/:user_id/summary', getUserRatingSummary);
router.get('/ranking', getRanking);

/* 
rutas funcionales:
/api/ratings/answers-summary -> GET -> obtener el resumen de calificaciones por respuesta
no requiere autenticación

/api/ratings/my-ratings -> GET -> obtener las calificaciones hechas por el usuario autenticado
recibe el token en el header Authorization

/api/ratings/users/:user_id/summary -> GET -> obtener el resumen de calificaciones recibidas por un usuario autor
no requiere autenticación, recibe el id del usuario en la URL

/api/ratings/ranking -> GET -> obtener el ranking de usuarios mejor calificados
no requiere autenticación, acepta parámetros opcionales min_votes, role, limit en la query string
*/

export default router;