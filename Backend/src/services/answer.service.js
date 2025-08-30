import pool from '../config/data_base_conection.js';
import { uploadImage } from './cloudinary.service.js';

export async function getAllAnswers() {
    const result = await pool.query(`
        SELECT answer_id, post_id, date, description, user_id, image
        FROM answer
        ORDER BY answer_id DESC
    `);
    return result.rows;
}

export async function createAnswer(body, file) {
    try {
        const { post_id, user_id, description } = body;
        const cleanDesc = String(description || '').trim();
        const pid = parseInt(post_id, 10);
        const uid = parseInt(user_id, 10);

        if (!cleanDesc) throw new Error('Description is required.');
        if (!Number.isInteger(pid)) throw new Error('Invalid post_id.');
        if (!Number.isInteger(uid)) throw new Error('Invalid user_id.');

        // Check if user exists
        const userExists = await pool.query(
            'SELECT user_id FROM users WHERE user_id = $1',
            [uid]
        );
        if (userExists.rows.length === 0) {
            throw new Error('User does not exist.');
        }

        // Check if post exists
        const postExists = await pool.query(
            'SELECT post_id FROM post WHERE post_id = $1',
            [pid]
        );
        if (postExists.rows.length === 0) {
            throw new Error('Post does not exist.');
        }

        let imageUrl = null;
        if (file) {
            const b64 = file.buffer.toString("base64");
            const dataURI = `data:${file.mimetype};base64,${b64}`;
            const uploadResult = await uploadImage(dataURI, "answers");
            imageUrl = uploadResult.secure_url;
        }

        const answerIns = await pool.query(
            `INSERT INTO answer (post_id, date, description, user_id, image)
             VALUES ($1, NOW(), $2, $3, $4)
             RETURNING *`,
            [pid, cleanDesc, uid, imageUrl]
        );
        return answerIns.rows[0];
    } catch (err) {
        return { error: err.message };
    }
}

export async function getAnswersByUserId(user_id) {
    const uid = parseInt(user_id, 10);
    if (!Number.isInteger(uid)) {
        return [];
    }

    const result = await pool.query(
        'SELECT answer_id, post_id, date, description, user_id, image FROM answer WHERE user_id = $1 ORDER BY answer_id DESC',
        [uid]
    );

    return result.rows;
}