import express from 'express';
import cors from 'cors';
import pool from './src/config/data_base_conection.js';
import bcrypt from 'bcryptjs';
//import { createClient } from '@supabase/supabase-js';


//const supabaseUrl = process.env.SUPABASE_URL;
//const supabaseKey = process.env.SUPABASE_KEY;
//const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = 3000;

// Middleware configuration
app.use(express.json());
app.use(cors());

// Register new user need fix -----------------------------------------------------------------
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

// Login endpoint (admin only)
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


app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto http://localhost:${PORT}`);
});


app.get('/Users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Error fetching users' });
  }
});



app.get('/post', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM post');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Error fetching post' });
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