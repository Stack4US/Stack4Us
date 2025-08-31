// Backend/src/routes/stackoverflow.routes.js
import { Router } from 'express';
import so from '../services/stackoverflow.service.js';

const router = Router();

// GET /api/stackoverflow/hot?tagged=javascript&pagesize=5
router.get('/hot', async (req, res) => {
  try {
    const data = await so.getHot({
      tagged: req.query.tagged,
      pagesize: req.query.pagesize
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/stackoverflow/newest?tagged=reactjs
router.get('/newest', async (req, res) => {
  try {
    const data = await so.getNewest({
      tagged: req.query.tagged,
      pagesize: req.query.pagesize
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/stackoverflow/search?q=useEffect&tagged=reactjs
router.get('/search', async (req, res) => {
  try {
    const data = await so.searchAdvanced({
      q: req.query.q,
      tagged: req.query.tagged,
      pagesize: req.query.pagesize
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/stackoverflow/questions/:questionId/answers
router.get('/questions/:questionId/answers', async (req, res) => {
  try {
    const data = await so.getAnswers(req.params.questionId, {
      pagesize: req.query.pagesize
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
