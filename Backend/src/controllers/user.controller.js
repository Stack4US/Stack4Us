import { uploadImage } from '../services/cloudinary.service.js';
import * as userService from '../services/user.service.js';


export async function registerUser(req, res, next) {
    try {
        const { user_name, email, password, rol_id } = req.body;

    if (!user_name || !email || !password) {
        return res.status(400).json({ message: 'User_name, email and password are required' });
    }
    
    const newUser = await userService.createUser({ user_name, email, password });

    res.status(201).json({
        message: 'User registered successfully',
        
        user: {
            id: newUser.user_id,
            username: newUser.user_name,
            email: newUser.email,
            role: newUser.rol_id,
            }

        });

    } catch (err) {
        next(err); 
        }
}

export async function loginUser(req, res, next) {
    try {
        const { user_name, password } = req.body;
        const token = await userService.authenticateUser(user_name, password);
        if (!token) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        res.status(200).json({ token });
    } catch (err) {
        next(err);
    }
}

export async function getUserProfile(req, res, next) {
    try {
        const userId = req.user.user_id;
        const userProfile = await userService.getUserById(userId);
        if (!userProfile) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(userProfile);
    } catch (err) {
        next(err);
    }
}

export async function updateUserProfile(req, res, next) {
  try {
    const user_id = req.user.user_id;
    const { description } = req.body;

    const updatedUser = await userService.updateUser(user_id, { description }, req.file);

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
    try {
        let userIdToDelete;
        const rolId = Number(req.user?.rol_id);

        if (rolId === 2) {
            userIdToDelete = parseInt(req.params.id, 10);
            if (isNaN(userIdToDelete)) {
                return res.status(400).json({ error: 'Invalid user ID' });
            }
        } else {
            userIdToDelete = Number(req.user.user_id);
        }

        const deleted = await userService.deleteUser(userIdToDelete);

        if (!deleted) {
            return res.status(404).json({ error: 'User not found or could not be deleted' });
        }

        res.status(200).json({ message: 'User deleted successfully', user: deleted });
    } catch (err) {
        next(err);
    }
}

export async function getAllUsers(req, res, next) {
    try {
        const users = await userService.getAllUsers();
        res.status(200).json(users);
    } catch (err) {
        next(err);
    }
}

