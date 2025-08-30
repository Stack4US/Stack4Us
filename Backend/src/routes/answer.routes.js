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
router.get('/user/:userId', getUserAnswers);

/*
rutas funcionales:
/api/answers/ -> GET -> listar todas las respuestas
/api/answers/ -> POST -> crear una respuesta (con imagen opcional)
/api/answers/:id -> DELETE -> eliminar una respuesta (solo admin o dueño)
/api/answers/user/:userId -> GET -> obtener respuestas de un usuario específico
*/
export default router;s