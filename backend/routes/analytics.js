import { Router } from 'express';
import { getAnalytics } from '../services/analytics.js';

const router = Router();

router.get('/overview', async (req, res) => {
  try {
    const result = await getAnalytics();
    res.json(result);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
