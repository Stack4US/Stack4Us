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

router.get('/all', listAllPosts);
router.post('/insert', upload.single('image'), insertPost);
router.delete('/:id', authenticateToken, deletePost); // ADMIN or owner
router.put('/owns/:post_id', authenticateToken, upload.single('image'), updateOwnPost);
router.get('/user/:userId', getUserPosts);

export default router;

/*
rutas funcionales: 
/api/posts/all  -> GET -> listar todos los posts

/api/posts/insert -> POST -> crear un post (con imagen opcional)
recibe un objeto JSON con los parametros que quiere cambiar y la imagen en multipart/form-data

/api/posts/:id -> DELETE -> eliminar un post (solo admin o dueño)
recibir el token en el header Authorization y el id del post a eliminar en la URL

/api/posts/owns/:post_id -> PUT -> actualizar un post propio (con imagen opcional)
recibe el token en el header Authorization, el id del post a actualizar en la URL,

/api/posts/user/:userId -> GET -> obtener posts de un usuario específico
recibe el id del usuario en la URL o en params
*/