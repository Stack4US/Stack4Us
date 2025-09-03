import pool from '../config/data_base_conection.js';
import { uploadImage } from './cloudinary.service.js';
import { createNotification } from './notifications.service.js';

// Get all answers
export async function getAllAnswers() {
    try {
        const result = await pool.query(`
            SELECT * FROM answer ORDER BY answer_id DESC
        `);
        return result.rows;
    } catch (err) {
        throw new Error('Error fetching answers: ' + err.message);
    }
}

// Create new answer (with optional image + notification)
export async function createAnswer(body, file, user_id) {
    try {
        const { post_id, description } = body;
        console.log('BODY:', body); 
        const cleanDesc = String(description || '').trim();
        const pid = parseInt(post_id, 10);
        const uid = parseInt(user_id, 10);

        if (!cleanDesc) throw new Error('Description is required.');
        if (!Number.isInteger(pid)) throw new Error('Invalid post_id.');
        if (!Number.isInteger(uid)) throw new Error('Invalid authenticated user_id.');

        // Check if post exists
        const postExists = await pool.query(
            'SELECT post_id, user_id FROM post WHERE post_id = $1',
            [pid]
        );
        if (postExists.rows.length === 0) {
            throw new Error('Post does not exist.');
        }
        const postOwnerId = postExists.rows[0].user_id;

        // Upload image if provided
        let imageUrl = null;
        if (file) {
            const b64 = file.buffer.toString("base64");
            const dataURI = `data:${file.mimetype};base64,${b64}`;
            const uploadResult = await uploadImage(dataURI, "answers");
            imageUrl = uploadResult.secure_url;
        }

        // Insert answer
        const answerIns = await pool.query(
            `INSERT INTO answer (post_id, date, description, user_id, image)
             VALUES ($1, NOW(), $2, $3, $4)
             RETURNING *`,
            [pid, cleanDesc, uid, imageUrl]
        );
        const newAnswer = answerIns.rows[0];

        // Send notification to post owner
        if (postOwnerId !== uid) {
            await createNotification({ 
                user_id: postOwnerId,
                message: `New answer to your post (ID: ${pid})`
            });
        }

        return newAnswer;
    } catch (err) {
        console.error('[CREATE-ANSWER] Error:', err);
        return { error: err.message };
    }
}

// Delete answer (only owner or admin)
export async function removeAnswer(answer_id, user) {
    try {
        const aid = parseInt(answer_id, 10);
        const uid = parseInt(user.user_id, 10);
        const roleId = parseInt(user.rol_id, 10);
        const isAdmin = roleId === 2;

        if (!Number.isInteger(aid)) {
            return { error: 'Invalid answer ID.', status: 400 };
        }
        if (!Number.isInteger(uid)) {
            return { error: 'Invalid authenticated user ID.', status: 400 };
        }

        const answerRes = await pool.query(
            'SELECT user_id FROM answer WHERE answer_id = $1',
            [aid]
        );

        if (answerRes.rows.length === 0) {
            return { error: 'Answer not found.', status: 404 };
        }

        const answerOwnerId = parseInt(answerRes.rows[0].user_id, 10);

        // Check permission
        if (uid !== answerOwnerId && !isAdmin) {
            return { error: 'Unauthorized to delete this answer.', status: 403 };
        }

        await pool.query(
            'DELETE FROM answer WHERE answer_id = $1',
            [aid]
        );

        return { status: 200, message: 'Answer deleted successfully.' };

    } catch (err) {
        return { error: 'Error deleting answer: ' + err.message, status: 500 };
    }
}

// Get answers by user id
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
