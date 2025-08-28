import express from 'express';
import cors from 'cors';
import pool from './src/config/data_base_conection.js';
import bcrypt from 'bcryptjs';
import { cloudinary, upload } from './src/config/cloudinary_config.js';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const app = express();
const PORT = 3000;

// Middlewares
app.use(express.json());
app.use(cors());

function generateToken(user) {
  return jwt.sign({ 
    user_id: user.user_id, 
    email: user.email,
    rol: user.rol_id }, 
    process.env.JWT_SECRET, { expiresIn: '5h' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// ========================= REGISTER =========================
app.post('/register', async (req, res) => {
  console.log("Body recibido:", req.body);
  const { user_name, email, password } = req.body;
  const rol_id = '1';

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await pool.query(
      `INSERT INTO users (user_name, email, password, rol_id)
       VALUES ($1, $2, $3, $4)`,
      [user_name, email, hashedPassword, rol_id]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// =========================== LOGIN ===========================
app.post('/login', async (req, res) => {
  const { user_name, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE user_name = $1',
      [user_name]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const token = generateToken(user);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        user_id: user.user_id,
        user_name: user.user_name,
        email: user.email,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================== ENDPOINTS FOR USERS ========================

// ======================= LIST USERS ==========================
app.get('/Users', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// ======================= EDIT USER ===========================
app.post('/edit-user/:user_id', upload.single("image"), async (req, res) => {
  const { description } = req.body;
  const { user_id } = req.params;

  try {

    let profile_image = null;
    
    if (req.file) {
      const b64 = req.file.buffer.toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const uploadResult = await cloudinary.uploader.upload(dataURI, { folder: "posts" });
      profile_image = uploadResult.secure_url;
    }

    const result = await pool.query(
      `UPDATE users
       SET description = $1, profile_image = $2
       WHERE user_id = $3
       RETURNING *`,
      [description, profile_image, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Error updating user' });
  }
});

// =================== GET ALL POSTS OF USER ==================
app.get('/users/:userId/posts', async (req, res) => {
  const { userId } = req.params;
  try {
    const userExists = await pool.query('SELECT 1 FROM users WHERE user_id = $1', [userId]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const result = await pool.query(
      'SELECT * FROM post WHERE user_id = $1 ORDER BY post_id ASC',
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(`Error fetching posts for user ${userId}:`, err);
    res.status(500).json({ error: 'Error fetching posts' });
  }
});

// ======================== DELETE OWN POST AS USER========================
app.delete('/owns-posts/:post_id', authenticateToken, async (req, res) => {
  const post_id = parseInt(req.params.post_id, 10);
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      'DELETE FROM post WHERE post_id = $1 AND user_id = $2 RETURNING *',
      [post_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found or you do not have permission to delete this post' });
    }

    res.status(200).json({ message: 'Post deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error(`Error deleting post ${post_id}:`, err);
    res.status(500).json({ error: 'Error deleting post' });
  }
});

// ======================== DELETE OWN ANSWER AS USER========================
app.delete('/owns-answers/:answer_id', authenticateToken, async (req, res) => {
  const answer_id = parseInt(req.params.answer_id, 10);
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      'DELETE FROM answer WHERE answer_id = $1 AND user_id = $2 RETURNING *',
      [answer_id, user_id]
    );  
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Answer not found or you do not have permission to delete this answer' });
    }
    res.status(200).json({ message: 'Answer deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error(`Error deleting answer ${answer_id}:`, err);
    res.status(500).json({ error: 'Error deleting answer' });
  }
});

// ======================== EDIT OWN POST AS USER========================
app.put('/owns-posts/:post_id', authenticateToken, upload.single("image"), async (req, res) => {
  const post_id = parseInt(req.params.post_id, 10);
  const user_id = req.user.user_id; 
  const { type, title, description, status } = req.body;
  const image = req.file ? req.file.path : null;

  try {
    const postResult = await pool.query(
      "SELECT * FROM post WHERE post_id = $1 AND user_id = $2",
      [post_id, user_id]
    );

    if (postResult.rows.length === 0) {
      return res.status(403).json({ error: "You dont have permissions to delete this post" });
    }

    const updateQuery = `
      UPDATE post
      SET 
        type = COALESCE($1, type),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        status = COALESCE($4, status),
        image = COALESCE($5, image),
        date = NOW()
      WHERE post_id = $6 AND user_id = $7
      RETURNING *;
    `;

    const updatedPost = await pool.query(updateQuery, [
      type || null,
      title || null,
      description || null,
      status || null,
      image || null,
      post_id,
      user_id
    ]);

    res.json({
      message: "Post updated successfully",
      post: updatedPost.rows[0]
    });

  } catch (err) {
    console.error("Error updating post:", err);
    res.status(500).json({ error: "Error server" });
  }
});

// ======================= RATE ANSWER AS USER ========================
app.post('/answers/:answer_id/rate', authenticateToken, async (req, res) => {
  const answer_id = parseInt(req.params.answer_id, 10);
  const user_id = req.user.user_id;
  const { rating } = req.body;

  try {
    const answerResult = await pool.query(
      'SELECT * FROM answer WHERE answer_id = $1',
      [answer_id]
    );
    if (answerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Answer dont found' });
    }

    const answer = answerResult.rows[0];

    if (answer.user_id === user_id) {
      return res.status(403).json({ error: 'You cant rating your own answer' });
    }

    const existingRating = await pool.query(
      'SELECT * FROM answer_ratings WHERE answer_id = $1 AND user_id = $2',
      [answer_id, user_id]
    );

    if (existingRating.rows.length > 0) {
      return res.status(400).json({ error: 'This answer is already rating' });
    }

    await pool.query(
      'INSERT INTO answer_ratings (answer_id, user_id, rating) VALUES ($1, $2, $3)',
      [answer_id, user_id, rating]
    );

    res.status(201).json({ message: 'Rating register succesfully' });

  } catch (error) {
    console.error('Error rating answer:', error);
    res.status(500).json({ error: 'Error in server' });
  }
});

// =================== GET ALL ANSWERS OF USER ==================
app.get('/users/:userId/answers', async (req, res) => {
  const { userId } = req.params;
  try {
    const userExists = await pool.query('SELECT 1 FROM users WHERE user_id = $1', [userId]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const result = await pool.query(
      'SELECT * FROM answer WHERE user_id = $1 ORDER BY answer_id ASC',
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(`Error fetching answers for user ${userId}:`, err);
    res.status(500).json({ error: 'Error fetching answers' });
  }
});

// ======================== ENDPOINTS FOR POSTS ========================

// ======================== LIST POSTS =========================
app.get('/all-posts', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        post_id, type, date, title, description, user_id, image, status
      FROM post
      ORDER BY post_id DESC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Error fetching post' });
  }
});

// ===================== INSERT NEW POST =======================
app.post('/insert-post', upload.single("image"), async (req, res) => {
  console.log('[INSERT-POST] body:', req.body);
  console.log('[INSERT-POST] file?:', !!req.file);

  try {
    let { type, title, description, user_id, status } = req.body;

    const cleanType  = String(type || '').trim().toLowerCase();
    const cleanTitle = String(title || '').trim();
    const cleanDesc  = String(description || '').trim();
    const uid = parseInt(user_id, 10);

    if (!cleanType)  return res.status(400).json({ error: 'Need a type to work :c' });
    if (!cleanTitle) return res.status(400).json({ error: 'Need a title to work :c' });
    if (!cleanDesc)  return res.status(400).json({ error: 'Need a description to work :c' });
    if (!Number.isInteger(uid)) {
      return res.status(400).json({ error: 'Need a valid user_id to work :c' });
    }

    const userExists = await pool.query(
      'SELECT user_id FROM users WHERE user_id = $1',
      [uid]
    );
    if (userExists.rows.length === 0) {
      return res.status(400).json({ error: 'User_id does not exist :c' });
    }

    const validStatuses = ['unsolved', 'solved'];
    const cleanStatus = validStatuses.includes(String(status).toLowerCase())
      ? String(status).toLowerCase()
      : 'unsolved';


    let imageUrl = null;
    if (req.file) {
      const b64 = req.file.buffer.toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const uploadResult = await cloudinary.uploader.upload(dataURI, { folder: "posts" });
      imageUrl = uploadResult.secure_url;
    }

    const postIns = await pool.query(
      `INSERT INTO post (type, date, title, description, user_id, image, status)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6)
       RETURNING *`,
      [cleanType, cleanTitle, cleanDesc, uid, imageUrl, cleanStatus]
    );

    res.status(201).json(postIns.rows[0]);
  } catch (err) {
    console.error('[INSERT-POST] Error:', err);
    res.status(500).json({
      error: 'Error inserting post',
      detail: err.message,
      code: err.code || null
    });
  }
});

// ======================== DELETE POST ========================
app.delete('/post/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM post WHERE post_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.status(204).send();
    console.log(`Post ${id} deleted successfully.`);
  } catch (err) {
    console.error(`Error deleting post ${id}:`, err);
    res.status(500).json({ error: 'Error deleting post' });
  }
});


// ======================= LIST ANSWERS ========================
app.get('/answers', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM answer');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching answers:', err);
    res.status(500).json({ error: 'Error fetching answer' });
  }
});

// ============================ ENDPOINTS FOR ANSWERS ========================

// ======================= INSERT ANSWER ========================
app.post('/answer', upload.single("image"), async (req, res) => {
  const { description, user_id, post_id } = req.body;
  let image = null;

  if (!description || description.trim() === '') {
    return res.status(400).json({ error: 'Description is required' });
  }
  if (!user_id || isNaN(user_id)) {
    return res.status(400).json({ error: 'Valid user_id is required' });
  }
  if (!post_id || isNaN(post_id)) {
    return res.status(400).json({ error: 'Valid post_id is required' });
  }

  try {

    const postExists = await pool.query('SELECT post_id FROM post WHERE post_id = $1', [post_id]);
    if (postExists.rows.length === 0) {
      return res.status(400).json({ error: 'Post does not exist' });
    }
  
    const userExists = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [user_id]);
    if (userExists.rows.length === 0) {
      return res.status(400).json({ error: 'User does not exist' });
    }
  
    if (req.file) {
      const b64 = req.file.buffer.toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;

      const uploadResult = await cloudinary.uploader.upload(dataURI, {
        folder: "answers",
      });
      image = uploadResult.secure_url;
    }

    const result = await pool.query(
      'INSERT INTO answer (description, user_id, post_id, image) VALUES ($1, $2, $3, $4) RETURNING *',
      [description.trim(), user_id, post_id, image]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting answer:', err);
    res.status(500).json({ error: 'Error inserting answer' });
  }
});

// ======================== DELETE ANSWER ========================
app.delete('/answer/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM answer WHERE answer_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Answer not found' });
    }
    res.status(204).send();
    console.log(`Answer ${id} deleted successfully.`);
  } catch (err) {
    console.error(`Error deleting answer ${id}:`, err);
    res.status(500).json({ error: 'Error deleting answer' });
  }
});

// ========================= LISTEN ============================
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto http://localhost:${PORT}`);
});
