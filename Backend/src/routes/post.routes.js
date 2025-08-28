import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { upload } from '../config/cloudinary_config.js';
import {
  listAllPosts,
  insertPost,
  deletePost,
  deleteOwnPost,
  updateOwnPost,
  getUserPosts
} from '../controllers/post.controller.js';

const router = express.Router();

router.get('/all', listAllPosts);
router.post('/insert', upload.single('image'), insertPost);
router.delete('/:id', authenticateToken, deletePost); // ADMIN or own logic in controller
router.delete('/owns/:post_id', authenticateToken, deleteOwnPost);
router.put('/owns/:post_id', authenticateToken, upload.single('image'), updateOwnPost);
router.get('/user/:userId', getUserPosts);

export default router;

