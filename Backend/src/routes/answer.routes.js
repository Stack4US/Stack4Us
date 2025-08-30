import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import {
    listAllAnswers,
    insertAnswer,
    deleteAnswer,
    getUserAnswers
} from '../controllers/answer.controller.js';

const router = express.Router();

router.get('/', listAllAnswers);
router.post('/', authenticateToken, upload.single('image'), insertAnswer);
router.delete('/:id', authenticateToken, deleteAnswer);
router.get('/user/:user_id', getUserAnswers);

/*

rutas funcionales:

/api/answers/ -> GET -> listar todas las respuestas
muestra las respuestas más recientes primero

/api/answers/ -> POST -> crear una respuesta (con imagen opcional)
recibe post_id, user_id, description y opcionalmente una imagen

/api/answers/:id -> DELETE -> eliminar una respuesta (solo admin o dueño)
elimina la respuesta con el id dado

/api/answers/user/:user_id-> GET -> obtener respuestas de un usuario específico
muestra todas las respuestas hechas por el usuario con userId
*/
export default router;