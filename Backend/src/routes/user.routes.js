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

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', authenticateToken, getUserProfile);
router.put("/profile", authenticateToken, upload.single("image"), updateUserProfile);
router.delete('/:id', authenticateToken, deleteUser);
router.get('/all', authenticateToken, getAllUsers); // admin only

/*
rutas funcionales: 
/api/users/register -> POST -> registrar un nuevo usuario
recibe un objeto JSON con user_name, email, password

/api/users/login -> POST -> autenticar un usuario y obtener un token
recibe un objeto JSON con user_name y password

/api/users/profile -> GET -> obtener el perfil del usuario autenticado
recibe el token en el header Authorization

/api/users/profile -> PUT -> actualizar el perfil del usuario autenticado
recibe el token en el header Authorization y un objeto JSON con los campos a actualizar (description, image)

/api/users/:id -> DELETE -> eliminar un usuario solo admin
recibe el token en el header Authorization y el id del usuario a eliminar en la URL
si no es admin, se elimina a si mismo

/api/users/all -> GET -> obtener todos los usuarios (solo admin)
recibe el token en el header Authorization

*/

export default router;  