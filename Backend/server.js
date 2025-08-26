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

// just listening server
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto http://localhost:${PORT}`);
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


// Endpoint to insert a new post with image upload - need fix
app.post('/insert-post', upload.single("image"), async (req, res) => {
  try {
    const { type, title, description, user_id, status } = req.body;
    let image = null;

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
      [type, title, description, user_id, image, status]
    );
    res.status(201).json(result.rows[0]); 
  }
  catch (err) {
    console.error('Error inserting post:', err);
    res.status(500).json({ error: 'Error inserting post' });
  }
});

app.get('/answers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM answer');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching answers:', err);
    res.status(500).json({ error: 'Error fetching answer' });
  }
});