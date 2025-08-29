import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { upload } from '../config/cloudinary.js';
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



/*
rutas funcionales: 
/api/posts/all  -> GET -> listar todos los posts
/api/posts/insert -> POST -> crear un post (con imagen opcional)
/api/posts/:id -> DELETE -> eliminar un post (solo admin o dueño)
/api/posts/owns/:post_id -> DELETE -> eliminar un post propio
/api/posts/owns/:post_id -> PUT -> actualizar un post propio (con imagen opcional)
/api/posts/user/:userId -> GET -> obtener posts de un usuario específico


*/