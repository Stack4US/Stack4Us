import * as answerService from '../services/answer.service.js';

export async function listAllAnswers(req, res, next) {
    try {
        const answers = await answerService.getAllAnswers();
        res.status(200).json(answers);

    } catch (err) {
        next(err);
    }
}   

export async function insertAnswer(req, res, next) {
    try {
        const result = await answerService.createAnswer(req.body, req.file, req.user);
        if (result.error) {
            return res.status(400).json({ error: result.error });
        }
        res.status(201).json(result);
    
    } catch (err) {
        console.error("Error creating answer:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function deleteAnswer(req, res, next) {
    try {
        const { id } = req.params;
        const user = req.user;

        console.log("DEBUG req.user:", req.user);
        const result = await answerService.removeAnswer(id, user);

        if (result.error) {
            return res.status(result.status).json({ error: result.error });
        }

        res.status(200).json({ message: result.message });

    } catch (err) {
        next(err);
    }
}

export async function getUserAnswers(req, res, next) {
    try {
        const { user_id } = req.params;
        const answers = await answerService.getAnswersByUserId(user_id);
        res.status(200).json(answers);
    } catch (err) {
        next(err);
    }
}