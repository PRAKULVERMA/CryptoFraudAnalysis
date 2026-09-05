import { Router } from 'express';
import { getMonitoring } from '../services/monitoring.js';

const router = Router();

router.get('/status', async (req, res) => {
  try {
    const result = await getMonitoring();
    res.json(result);
  } catch (error) {
    console.error('Monitoring error:', error);
    res.status(500).json({ error: 'Failed to fetch monitoring data' });
  }
});

export default router;
