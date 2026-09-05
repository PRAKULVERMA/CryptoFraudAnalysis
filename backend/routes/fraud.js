import { Router } from 'express';
import { detectFraud } from '../services/fraud.js';

const router = Router();

router.post('/analyze', async (req, res) => {
  try {
    const { address, network, transactions } = req.body;
    if (!address || !network) {
      return res.status(400).json({ error: 'address and network are required' });
    }
    const result = await detectFraud(address, network, transactions);
    res.json(result);
  } catch (error) {
    console.error('Fraud detection error:', error);
    res.status(500).json({ error: 'Fraud detection failed' });
  }
});

export default router;
