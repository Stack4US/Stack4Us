import * as conversationService from '../services/conversation.service.js';

// Get all conversations
export async function listAllConversations(req, res, next) {
    try {
        const conversations = await conversationService.getAllConversation();
        res.status(200).json(conversations);
    } catch (err) {
        next(err);
    }
}

// Create new conversation
export async function insertConversation(req, res) {
    try {
        const { description, answer_id } = req.body;
        const user_id = req.user.user_id;
        const newConversation = await conversationService.createConversation(
            { description, answer_id, user_id },
            req.file
        );

        res.status(201).json(newConversation);
    } catch (err) {
        console.error("Error inserting conversation:", err);
        res.status(400).json({ error: err.message });
    }
}

// Delete conversation (needs auth)
export async function deleteConversation(req, res, next) {
    const user = req.user; 

    if (!user || !user.user_id) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const result = await conversationService.deleteConversation(req.params.conversation_id, user);
        if (result.error) {
            return res.status(result.status).json({ error: result.error });
        }
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}

// Get conversations by user id
export async function getUserConversations(req, res, next) {
    try {
        const conversations = await conversationService.getUserConversations(req.params.user_id);
        res.status(200).json(conversations);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}
