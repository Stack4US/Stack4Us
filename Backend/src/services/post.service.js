import pool from '../config/data_base_conection.js';
import cloudinary from '../config/cloudinary.js';
import { uploadImage } from './cloudinary.service.js';

// Get all posts (latest first)
export async function getAllPosts() {
  const result = await pool.query(`
    SELECT post_id, type, date, title, description, user_id, image, status
    FROM post
    ORDER BY post_id DESC
  `);

  return result.rows;
}

// Create new post (optional image upload)
export async function createPost(user_id, body, file) {
  try {
    let { type, title, description, status } = body;
    const cleanType  = String(type || '').trim().toLowerCase();
    const cleanTitle = String(title || '').trim();
    const cleanDesc  = String(description || '').trim();
    const uid = parseInt(user_id, 10);

    // Basic validations
    if (!cleanType)  throw new Error('Need a type to work :c');
    if (!cleanTitle) throw new Error('Need a title to work :c');
    if (!cleanDesc)  throw new Error('Need a description to work :c');
    if (!Number.isInteger(uid)) throw new Error('Need a valid user_id to work :c');

    // Check user exists
    const userExists = await pool.query(
      'SELECT user_id FROM users WHERE user_id = $1',
      [uid]
    );
    if (userExists.rows.length === 0) {
      throw new Error('User_id does not exist :c');
    }

    // Normalize status (default: unsolved)
    const validStatuses = ['unsolved', 'solved'];
    const cleanStatus = validStatuses.includes(String(status).toLowerCase())
      ? String(status).toLowerCase()
      : 'unsolved';

    // Upload image if provided
    let imageUrl = null;
    if (file) {
      const b64 = file.buffer.toString("base64");
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      const uploadResult = await cloudinary.uploader.upload(dataURI, { folder: "posts" });
      imageUrl = uploadResult.secure_url;
    }

    // Insert post
    const postIns = await pool.query(
      `INSERT INTO post (type, date, title, description, user_id, image, status)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6)
       RETURNING *`,
      [cleanType, cleanTitle, cleanDesc, uid, imageUrl, cleanStatus]
    );

    return postIns.rows[0];
  } catch (err) {
    console.error('[INSERT-POST] Error:', err);
    throw err;
  }
}

// Delete post (owner or admin only)
export async function removePost(postId, user) {
    const pid = parseInt(postId, 10);
    if (!Number.isInteger(pid)) {
        return { status: 400, error: 'Invalid post ID' };
    }

    // Check post exists + owner
    const postRes = await pool.query(
        'SELECT user_id FROM post WHERE post_id = $1',
        [pid]
    );

    if (postRes.rows.length === 0) {
        return { status: 404, error: 'Post not found' };
    }

    const postOwnerId = parseInt(postRes.rows[0].user_id, 10);

    // Auth data
    const rolId = parseInt(user.rol_id, 10);
    const userId = parseInt(user.user_id, 10);

    if (!Number.isInteger(rolId) || !Number.isInteger(userId)) {
        return { status: 400, error: 'Invalid user data' };
    }

    const isAdmin = rolId === 2;
    const isOwner = userId === postOwnerId;

    // Permission check
    if (!isAdmin && !isOwner) {
        return { status: 403, error: 'Not authorized to delete this post' };
    }

    await pool.query('DELETE FROM post WHERE post_id = $1', [pid]);

    return { status: 200, message: 'Post deleted successfully' };
}

// Update post (partial update + optional new image)
export async function modifyPost(postId, body, file, user) {
    const pid = parseInt(postId, 10);
    if (!Number.isInteger(pid)) {
        return { status: 400, error: 'Invalid post ID' };
    }

    // Load current data (for owner/image)
    const postRes = await pool.query(
        'SELECT user_id, image FROM post WHERE post_id = $1',
        [pid]
    );
    if (postRes.rows.length === 0) {
        return { status: 404, error: 'Post not found' };
    }

    // Permission: admin or owner
    if (user.rol_id !== 2 && user.user_id !== postRes.rows[0].user_id) {
        return { status: 403, error: 'Not authorized to update this post' };
    }

    // Clean fields (optional)
    let { type, title, description, status } = body;

    const cleanType  = type ? String(type).trim().toLowerCase() : null;
    const cleanTitle = title ? String(title).trim() : null;
    const cleanDesc  = description ? String(description).trim() : null;

    const validStatuses = ['unsolved', 'solved'];
    const cleanStatus = status && validStatuses.includes(String(status).toLowerCase())
      ? String(status).toLowerCase()
      : null;

    // Keep current image or upload new one
    let imageUrl = postRes.rows[0].image;
    if (file) {
      const b64 = file.buffer.toString("base64");
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      const uploadResult = await uploadImage(dataURI, "posts");
      imageUrl = uploadResult.secure_url;
    }

    // Build dynamic UPDATE
    const fields = [];
    const values = [];
    let idx = 1;

    if (cleanType)  { fields.push(`type = $${idx++}`); values.push(cleanType); }
    if (cleanTitle) { fields.push(`title = $${idx++}`); values.push(cleanTitle); }
    if (cleanDesc)  { fields.push(`description = $${idx++}`); values.push(cleanDesc); }
    if (cleanStatus){ fields.push(`status = $${idx++}`); values.push(cleanStatus); }
    if (file)       { fields.push(`image = $${idx++}`); values.push(imageUrl); }

    if (fields.length === 0) {
        return { status: 400, error: 'No valid fields to update' };
    }

    const query = `
      UPDATE post SET ${fields.join(', ')}
      WHERE post_id = $${idx}
      RETURNING *
    `;
    values.push(pid);

    try {
        const updateRes = await pool.query(query, values);
        return { status: 200, post: updateRes.rows[0] };
    } catch (err) {
        console.error('[MODIFY-POST] Error:', err);
        return {
            status: 500,
            error: 'Error updating post',
            detail: err.message,
            code: err.code || null
        };
    }
}

// Get posts by user (latest first)
export async function getPostsByUser(userId) {
    const uid = parseInt(userId, 10);
    if (!Number.isInteger(uid)) {
        throw new Error('Invalid user ID');
    }

    const result = await pool.query(
        `SELECT post_id, type, date, title, description, user_id, image, status
         FROM post
         WHERE user_id = $1
         ORDER BY post_id DESC`,
        [uid]
    );
    return result.rows;
}
