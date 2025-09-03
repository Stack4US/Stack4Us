import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import {
  listAllPosts,
  insertPost,
  deletePost,
  updateOwnPost,
  getUserPosts
} from '../controllers/post.controller.js';

const router = express.Router();

// GET all posts
router.get('/all', listAllPosts);

// POST new post (auth + image upload)
router.post('/insert', upload.single('image'), authenticateToken, insertPost);

// DELETE post by id (auth required, admin or owner)
router.delete('/:id', authenticateToken, deletePost);

// PUT update own post (auth + image upload)
router.put('/owns/:post_id', authenticateToken, upload.single('image'), updateOwnPost);

// GET posts by user id
router.get('/user/:userId', getUserPosts);

export default router;
