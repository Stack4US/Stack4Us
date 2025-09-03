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

// GET all answers
router.get('/', listAllAnswers);

// POST new answer (auth + image upload)
router.post('/', authenticateToken, upload.single('image'), insertAnswer);

// DELETE answer by id (auth required)
router.delete('/:id', authenticateToken, deleteAnswer);

// GET answers by user id
router.get('/user/:user_id', getUserAnswers);

export default router;
