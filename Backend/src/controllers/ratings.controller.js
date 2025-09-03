import * as ratingsService from '../services/ratings.service.js';

// Get summary of all answers ratings
export async function getAnswersRatingsSummary(req, res, next) {
  try {
    const data = await ratingsService.getAnswersRatingsSummary();
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

// Insert new rating for an answer
export async function insertRating(req, res, next) {
  try {
    const user_id = req.user.user_id;
    const { answer_id, rating } = req.body;

    if (!answer_id || !rating) {
      return res.status(400).json({ error: "answer_id and rating are required" });
    }

    const data = await ratingsService.insertRating({
      user_id,
      answer_id,
      rating
    });

    res.status(201).json({
      message: "Rating added successfully",
      rating: data
    });
  } catch (err) {
    // 23505 → already rated this answer
    if (err.code === "23505") {
      return res.status(409).json({ error: "You already rated this answer" });
    }
    next(err);
  }
}

// Get ratings made by logged user
export async function getMyRatings(req, res, next) {
  try {
    const userId = req.user.user_id;
    const data = await ratingsService.getMyRatings(userId);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

// Get rating summary of one user
export async function getUserRatingSummary(req, res, next) {
  try {
    const userId = parseInt(req.params.user_id, 10);
    const data = await ratingsService.getUserRatingSummary(userId);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

// Get ranking with filters (minVotes, role, limit)
export async function getRanking(req, res, next) {
  try {
    const minVotes = parseInt(req.query.min_votes ?? '1', 10);
    const role = req.query.role ? String(req.query.role) : null;
    const limit = parseInt(req.query.limit ?? '10', 10);

    const data = await ratingsService.getRanking({ minVotes, role, limit });
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}
