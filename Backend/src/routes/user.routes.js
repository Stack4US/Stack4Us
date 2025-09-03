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

// POST register new user
router.post('/register', registerUser);

// POST login user
router.post('/login', loginUser);

// GET logged user profile (auth required)
router.get('/profile', authenticateToken, getUserProfile);

// PUT update profile (auth + image upload)
router.put('/profile', authenticateToken, upload.single("image"), updateUserProfile);

// DELETE user by id (auth required)
router.delete('/:id', authenticateToken, deleteUser);

// GET all users (auth required, admin only)
router.get('/all', authenticateToken, getAllUsers);

export default router;
