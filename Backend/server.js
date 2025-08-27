import express from 'express';
import cors from 'cors';
import pool from './src/config/data_base_conection.js';
import bcrypt from 'bcryptjs';
import { cloudinary, upload } from './src/config/cloudinary_config.js';

const app = express();
const PORT = 3000;

// Middleware configuration
app.use(express.json());
app.use(cors());

// Register user endpoint
app.post('/register', async (req, res) => {
  console.log("Body recibido:", req.body);

  const { user_name, email, password} = req.body;
  const rol_id = '1'; 

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await pool.query(
      `INSERT INTO users (user_name, email, password, rol_id) VALUES ($1, $2, $3, $4)`,
      [user_name, email, hashedPassword, rol_id]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// Login endpoint coder mode
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

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        user_name: user.user_name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint to fetch all users
app.get('/Users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Error fetching users' });
  }
});


//Endpoint to fetch all posts
app.get('/all-posts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM post');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Error fetching post' });
  }
});

// Endpoint to insert a new post with image upload
app.post('/insert-post', upload.single("image"), async (req, res) => {
  try {
    const { type, title, description, user_id, status } = req.body;
    let image = null;

    // Basic validation
    if (!type || type.trim() === '') {
      return res.status(400).json({ error: 'Need a type to work :c'});
    }
    
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Need a title to work :c'});
    }

    if (!description || description.trim() === '') {
      return res.status(400).json({ error: 'Need a description to work :c'});
    }

    if (!user_id || isNaN(user_id)) {
      return res.status(400).json({ error: 'Need a valid user_id to work :c'});
    }

    // Check if user_id exists in users table
    const userExists = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [user_id]);
    if (userExists.rows.length === 0) {
      return res.status(400).json({ error: 'User_id does not exist :c'});
    }

    // Process status to ensure it's either 'unsolved' or 'solved'
    const validStatuses = ['unsolved', 'solved'];
    const finalStatus = status && validStatuses.includes(status) ? status : 'unsolved';

    // If an image file is provided, upload it to Cloudinary
    if (req.file) {
      const b64 = req.file.buffer.toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;

      const uploadResult = await cloudinary.uploader.upload(dataURI, {
        folder: "posts",
      });
      image = uploadResult.secure_url;
    }
    
    const result = await pool.query(
      'INSERT INTO post (type, title, description, user_id, image, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [type. trim(), title.trim(), description.trim(), user_id, image, finalStatus]
    );
    res.status(201).json(result.rows[0]); 
  }
  catch (err) {
    console.error('Error inserting post:', err);

    if (err.code === '23503') {
      return res.status(400).json({ error: 'Foreign key violation: user_id does not exist' });
    }

    res.status(500).json({ error: 'Error inserting post' });
  }
});

// Get answers
app.get('/answers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM answer');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching answers:', err);
    res.status(500).json({ error: 'Error fetching answer' });
  }
});

// Endpoint to create a answer 
app.post('/answer', upload.single("image"), async (req, res) => {
  const { description, user_id, post_id } = req.body;
  let image = null;
  // Basic validations
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
    // Verify that the post exists
    const postExists = await pool.query('SELECT post_id FROM post WHERE post_id = $1', [post_id]);
    if (postExists.rows.length === 0) {
      return res.status(400).json({ error: 'Post does not exist' });
    }
    // Verify that the user exists
    const userExists = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [user_id]);
    if (userExists.rows.length === 0) {
      return res.status(400).json({ error: 'User does not exist' });
    }
    // If an image is provided, upload it to Cloudinary
    if (req.file) {
      const b64 = req.file.buffer.toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;

      const uploadResult = await cloudinary.uploader.upload(dataURI, {
        folder: "answers",
      });
      image = uploadResult.secure_url;
    }
    // Insert answer
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

// just listening server
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto http://localhost:${PORT}`);
});
