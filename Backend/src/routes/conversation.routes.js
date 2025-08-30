import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import {
    listAllConversations,
    insertConversation,
    deleteConversation,
    getUserConversations
} from '../controllers/conversation.controller.js';

const router = express.Router();

router.get('/', listAllConversations);
router.post('/', authenticateToken, upload.single("image"), insertConversation);
router.delete('/:conversation_id', authenticateToken, deleteConversation);
router.get('/user/:user_id', getUserConversations);

/*
/api/conversations/
lista las conversaciones

/api/conversations/
recibe el autentication token del usuario y el answer_id para crear una conversacion

/api/conversations/:conversation_id
recibe el autentication token del usuario y elimina la conversacion

/api/conversations/user/:user_id
recibe el user_id y devuelve las conversaciones de ese usuario
*/

export default router;