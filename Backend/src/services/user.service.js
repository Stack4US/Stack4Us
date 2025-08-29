import pool from '../config/data_base_conection.js';
import bcrypt from 'bcrypt';
import cloudinary from '../config/cloudinary.js';
import { generateToken }   from '../middlewares/auth.middleware.js';


export async function createUser({user_name, email, password}) {
    const rol_id = '1';

    try {
        if (!password){
            return { error: 'Password is required' };
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await pool.query(
            `INSERT INTO users (user_name, email, password, rol_id)
            VALUES ($1, $2, $3, $4)`,
            [user_name, email, hashedPassword, rol_id]
        );
        return { message: 'User registered successfully' };

    } catch (error) {
        console.error('Error registering user:', error);
        return { error: 'Error registering user' };
    }
}

export async function authenticateUser(user_name, password) {

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE user_name = $1',
            [user_name]
        );

        if (result.rows.length === 0) {
            return null
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return null;
        }

        const token = generateToken(user);
        return token;

    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

export async function getUserById(userId) {
    const uid = parseInt(userId, 10);
    if (!Number.isInteger(uid)) {
        return null;
    }

    const result = await pool.query(
        'SELECT user_id, user_name, email, rol_id FROM users WHERE user_id = $1',
        [uid]
    );

    return result.rows[0] || null;
}


export async function updateUser(user_id, { description }, file) {
    try {
        let profile_image = null;

        if (file) {
            const uploadResult = await cloudinary.uploader.upload(file.path);
            profile_image = uploadResult.secure_url;
        }

        const result = await pool.query(
            `UPDATE users 
            SET description = COALESCE($1, description),
                profile_image = COALESCE($2, profile_image)
            WHERE user_id = $3
            RETURNING user_id, user_name, email, rol_id, description, profile_image`,
            [description, profile_image, user_id]
        );

        return result.rows[0];
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
}

export async function deleteUser(userId) {
    const uid = parseInt(userId, 10);
    if (!Number.isInteger(uid)) {
        return false;
    }

    const result = await pool.query(
        'DELETE FROM users WHERE user_id = $1 RETURNING *',
        [uid]
    );

    return result.rows.length > 0;
} 

export async function getAllUsers() {
    const result = await pool.query(
        'SELECT user_id, user_name, email, rol_id, description, profile_image FROM users'
    );
    return result.rows;
} 


