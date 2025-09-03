import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import {
  getAnswersRatingsSummary,
  getMyRatings,
  getUserRatingSummary,
  getRanking,
  insertRating
} from '../controllers/ratings.controller.js';

const router = express.Router();

// GET summary of all answers ratings
router.get('/answers-summary', getAnswersRatingsSummary);

// GET my ratings (auth required)
router.get('/my-ratings', authenticateToken, getMyRatings);

// GET rating summary for one user
router.get('/users/:user_id/summary', getUserRatingSummary);

// GET ranking (with filters)
router.get('/ranking', getRanking);

// POST new rating (auth required)
router.post('/', authenticateToken, insertRating);

export default router;
