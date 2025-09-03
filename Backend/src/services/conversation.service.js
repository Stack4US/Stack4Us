import pool from '../config/data_base_conection.js';
import { uploadImage } from './cloudinary.service.js';
import { createNotification } from './notifications.service.js';

// Create new conversation (with optional image + notification)
export async function createConversation(body, file) {
    const { description, user_id, answer_id } = body;
    const uid = parseInt(user_id, 10);
    const aid = parseInt(answer_id, 10);

    if (!description || !String(description).trim()) {
        throw new Error('Description is required to create a conversation.');
    }
    if (!Number.isInteger(uid)) {
        throw new Error('A valid user_id is required to create a conversation.');
    }
    if (!Number.isInteger(aid)) {
        throw new Error('A valid answer_id is required to create a conversation.');
    }

    // Check if answer exists
    const answerExists = await pool.query(
        'SELECT answer_id, user_id FROM answer WHERE answer_id = $1',
        [aid]
    );
    if (answerExists.rows.length === 0) {
        throw new Error('Answer_id does not exist.');
    }

    const answerOwnerId = answerExists.rows[0].user_id;

    // Upload image if provided
    let imageUrl = null;
    if (file) {
        const b64 = file.buffer.toString("base64");
        const dataURI = `data:${file.mimetype};base64,${b64}`;
        const uploadResult = await uploadImage(dataURI, 'conversation');
        imageUrl = uploadResult.secure_url;
    }

    // Insert conversation
    const result = await pool.query(
        `INSERT INTO conversation (description, user_id, answer_id, image, date)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [String(description).trim(), uid, aid, imageUrl]
    );
    const conversationInserted = result.rows[0];

    // Notify answer owner
    if (answerOwnerId && answerOwnerId !== uid) {
        await createNotification({
            user_id: answerOwnerId,
            message: `New conversation started regarding your answer (ID: ${aid})`
        });
    }
    
    return conversationInserted;
}

// Get all conversations
export async function getAllConversation() {
    const result = await pool.query(`
        SELECT conversation_id, user_id, answer_id, description
        FROM conversation
        ORDER BY date DESC
    `);
    return result.rows;
}

// Delete conversation (only owner or admin)
export async function deleteConversation(conversation_id, user) {
    const cid = parseInt(conversation_id, 10);
    if (!cid || isNaN(cid)) {
        return { error: 'A valid conversation_id is required.', status: 400 };
    }

    const convExists = await pool.query(
        'SELECT * FROM conversation WHERE conversation_id = $1',
        [cid]
    );
    if (convExists.rows.length === 0) {
        return { error: 'Conversation does not exist.', status: 404 };
    }

    const conversation = convExists.rows[0];

    const convUserId = parseInt(conversation.user_id, 10);
    const reqUserId = parseInt(user.user_id, 10);
    const reqUserRole = parseInt(user.rol_id, 10);

    // Check permission (owner or admin role)
    if (convUserId !== reqUserId && reqUserRole !== 2) {
        return { error: 'You do not have permission to delete this conversation.', status: 403 };
    }

    await pool.query(
        'DELETE FROM conversation WHERE conversation_id = $1',
        [cid]
    );

    return { message: 'Conversation deleted successfully.' };
}

// Get conversations by user id
export async function getUserConversations(user_id) {
    const uid = parseInt(user_id, 10);
    if (!Number.isInteger(uid)) {
        throw new Error('Invalid user_id');
    }

    const result = await pool.query(
        `SELECT conversation_id, description, user_id, answer_id, image, last_updated
         FROM conversation
         WHERE user_id = $1
         ORDER BY last_updated DESC`,
        [uid]
    );
    return result.rows;
}
