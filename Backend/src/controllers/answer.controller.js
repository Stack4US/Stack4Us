import * as answerService from '../services/answer.service.js';

// This controller manages answers.
// It connects the routes with the service layer.
// Each function below is an endpoint logic.

/**
 * List all answers from the database.
 * Calls the service to get answers and returns them as JSON.
 */
export async function listAllAnswers(req, res, next) {
    try {
        const answers = await answerService.getAllAnswers();
        res.status(200).json(answers);

    } catch (err) {
        // If something fails, pass the error to the error handler
        next(err);
    }
}   

/**
 * Insert a new answer in the database.
 * - Uses req.body for text
 * - Uses req.file if there is an uploaded file
 * - Uses req.user.user_id to connect the answer with the user
 */
export async function insertAnswer(req, res, next) {
    try {
        const result = await answerService.createAnswer(req.body, req.file, req.user.user_id);

        if (result.error) {
            // If there is a validation or business error, return 400
            return res.status(400).json({ error: result.error });
        }
        // Success → 201 Created
        res.status(201).json(result);
    
    } catch (err) {
        console.error("Error creating answer:", err);
        // General server error
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * Delete an answer by id.
 * - Takes the answer id from the request params
 * - Uses req.user to check permissions
 * - Calls the service to remove the answer
 */
export async function deleteAnswer(req, res, next) {
    try {
        const { id } = req.params;
        const user = req.user;

        console.log("DEBUG req.user:", req.user);
        const result = await answerService.removeAnswer(id, user);

        if (result.error) {
            // If the user cannot delete it, or id not found
            return res.status(result.status).json({ error: result.error });
        }

        res.status(200).json({ message: result.message });

    } catch (err) {
        next(err);
    }
}

/**
 * Get all answers from one specific user.
 * - user_id comes from params
 * - Calls the service to search answers by user
 */
export async function getUserAnswers(req, res, next) {
    try {
        const { user_id } = req.params;
        const answers = await answerService.getAnswersByUserId(user_id);
        res.status(200).json(answers);
    } catch (err) {
        next(err);
    }
}
