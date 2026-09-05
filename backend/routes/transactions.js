import { Router } from 'express';
import { getTransactions } from '../services/transactions.js';
import { validateWallet } from '../services/blockchain/validator.js';

const router = Router();

router.get('/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    const network = String(req.query.network || 'bitcoin').toLowerCase();

    const validation = validateWallet(network, address);
    if (!validation.valid) {
      return res.status(422).json({
        error: true,
        code: validation.code,
        message: validation.message,
      });
    }

    const result = await getTransactions(address, network);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
