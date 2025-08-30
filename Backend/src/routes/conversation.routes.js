import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import {
    listAllConversations,
    insertConversation,
    deleteConversation,
    getUserConversations
} from '../controllers/conversation.controller.js';

const router = express.Router();

router.get('/', listAllConversations);
router.post('/', authenticateToken, insertConversation);
router.delete('/:id', authenticateToken, deleteConversation);
router.get('/user/:user_id', getUserConversations);

