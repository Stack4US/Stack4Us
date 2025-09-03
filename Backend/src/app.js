import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import userRoutes from './routes/user.routes.js';
import postRoutes from './routes/post.routes.js';
import answerRoutes from './routes/answer.routes.js';
import conversationRoutes from './routes/conversation.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import ratingRoutes from './routes/ratings.routes.js';
import stackoverflowRoutes from './routes/stackoverflow.routes.js';

import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Base middlewares
app.use(cors());           // allow cross-origin requests
app.use(express.json());   // parse JSON bodies

// Routes (API endpoints)
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/stackoverflow', stackoverflowRoutes);

// Healthcheck (simple status route)
app.get('/', (_req, res) => res.json({ ok: true }));

// Global error handler (always last)
app.use(errorHandler);

export default app;
