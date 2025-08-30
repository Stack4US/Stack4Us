import pool from '../config/data_base_conection.js';

export async function getAnswersRatingsSummary() {
  const sql = `
    SELECT answer_id,
           AVG(rating)::float AS avg_rating,
           COUNT(*)::int AS ratings_count
    FROM answer_ratings
    GROUP BY answer_id
  `;
  const result = await pool.query(sql);
  return result.rows;
}

export async function getMyRatings(userId) {
  const sql = `
    SELECT rating_id, answer_id, user_id, rating
    FROM answer_ratings
    WHERE user_id = $1
  `;
  const result = await pool.query(sql, [userId]);
  return result.rows;
}

export async function getUserRatingSummary(userId) {
  if (!Number.isInteger(userId)) throw new Error('Invalid user_id');

  const sql = `
    SELECT a.user_id,
           AVG(ar.rating)::float AS avg_rating,
           COUNT(ar.rating)::int AS ratings_count,
           COUNT(DISTINCT a.answer_id)::int AS answers_with_votes
    FROM answer a
    LEFT JOIN answer_ratings ar ON ar.answer_id = a.answer_id
    WHERE a.user_id = $1
    GROUP BY a.user_id
  `;
  const result = await pool.query(sql, [userId]);
  if (!result.rows.length) {
    return { user_id: userId, avg_rating: 0, ratings_count: 0, answers_with_votes: 0 };
  }
  return result.rows[0];
}

export async function getRanking({ minVotes = 1, role = null, limit = 10 }) {
  let sql = `
    SELECT u.user_id,
           u.user_name,
           u.email,
           u.rol_id,
           u.profile_image,
           AVG(ar.rating)::float AS avg_rating,
           COUNT(ar.rating)::int AS ratings_count,
           COUNT(DISTINCT a.answer_id)::int AS answers_with_votes
    FROM users u
    JOIN answer a ON a.user_id = u.user_id
    LEFT JOIN answer_ratings ar ON ar.answer_id = a.answer_id
  `;

  const params = [];
  if (role) {
    sql += ` WHERE u.rol_id = $1`;
    params.push(role);
  }

  sql += `
    GROUP BY u.user_id
    HAVING COUNT(ar.rating) >= ${minVotes}
    ORDER BY avg_rating DESC NULLS LAST,
             answers_with_votes DESC,
             u.user_id ASC
    LIMIT ${limit}
  `;

  const result = await pool.query(sql, params);
  return result.rows;
}