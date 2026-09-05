import { Router } from 'express';
import { analyzeWallet } from '../services/investigation.js';
import { validateWallet } from '../services/blockchain/validator.js';
import investigationService from '../services/investigations/investigationService.js';

const router = Router();

router.post('/wallet', async (req, res, next) => {
  try {
    const { address, network } = req.body || {};
    if (!address || !network) {
      return res.status(400).json({ error: true, code: 'INVALID_REQUEST', message: 'address and network are required' });
    }

    const validation = validateWallet(network, address);
    if (!validation.valid) {
      return res.status(422).json({
        error: true,
        code: validation.code,
        message: validation.message,
      });
    }

    const existingRecord = await investigationService.createInvestigation({ wallet_address: address, network });
    const result = await analyzeWallet(address, network);

    const withInvestigation = {
      ...result,
      investigation_id: existingRecord.investigation_id,
      status: 'COMPLETED',
      synthetic: Boolean(result.synthetic),
      mode: result.mode || 'DEMO',
    };

    await investigationService.updateInvestigation(existingRecord.investigation_id, {
      status: 'COMPLETED',
      progress: 100,
      current_step: 'INVESTIGATION COMPLETED',
      completed_at: new Date().toISOString(),
      results: withInvestigation,
    });

    return res.json(withInvestigation);
  } catch (error) {
    next(error);
  }
});

export default router;
