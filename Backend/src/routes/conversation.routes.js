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

// GET all conversations
router.get('/', listAllConversations);

// POST new conversation (auth + image upload)
router.post('/', authenticateToken, upload.single("image"), insertConversation);

// DELETE conversation by id (auth required)
router.delete('/:conversation_id', authenticateToken, deleteConversation);

// GET conversations by user id
router.get('/user/:user_id', getUserConversations);

export default router;
