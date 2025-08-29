import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { 
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    deleteUser,
    getAllUsers
} from '../controllers/user.controller.js';

const router = express.Router();

// Rutas de usuario
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', authenticateToken, getUserProfile);
router.put("/profile", authenticateToken, upload.single("image"), updateUserProfile);
router.delete('/:id', authenticateToken, deleteUser);
router.get('/all', authenticateToken, getAllUsers); // Solo admin

/*
rutas funcionales: 
/api/users/register -> POST -> registrar un nuevo usuario
/api/users/login -> POST -> autenticar un usuario y obtener un token
/api/users/profile -> GET -> obtener el perfil del usuario autenticado
/api/users/profile -> PUT -> actualizar el perfil del usuario autenticado
/api/users/:id -> DELETE -> eliminar un usuario solo admin
/api/users/all -> GET -> obtener todos los usuarios (solo admin)
*/

export default router;  