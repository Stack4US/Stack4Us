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
  const { user_name, email, password, register_date } = req.body;

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await pool.query(
      `INSERT INTO users (user_name, email, password, register_date) VALUES ($1, $2, $3, $4)`,
      [user_name, email, hashedPassword, register_date]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// Login endpoint (admin only)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Search only for admin user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND rol_id = $2',
      [email, '']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Admin user not found' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        nombre: user.nombre,
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



