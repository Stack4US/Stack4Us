import jwt from 'jsonwebtoken';
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET || 'DEV_LOCAL_ONLY_SECRET';

// Create JWT token (valid 5h)
function generateToken(user) {
    try {
        return jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                rol_id: user.rol_id,
            },
            JWT_SECRET,
            { expiresIn: '5h' }
        );
    } catch (err) {
        console.error('[generateToken] error:', err.message);
        return null;
    }
}

// Middleware: check JWT in Authorization header
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // attach decoded user data
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid token' });
    }
}

export { generateToken, authenticateToken };
