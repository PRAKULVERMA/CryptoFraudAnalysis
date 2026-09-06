import { Router } from 'express';
import { analyzeWallet } from '../services/investigation.js';
import { validateWallet } from '../services/blockchain/validator.js';
import investigationService from '../services/investigations/investigationService.js';
import investigationJobService from '../services/investigations/investigationJobService.js';
import authenticate from '../middleware/authenticate.js';

const router = Router();

router.post('/wallet', authenticate, async (req, res, next) => {
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

    const existingRecord = await investigationService.createInvestigation({
      wallet_address: address,
      network,
      user_id: req.user?.id || null,
    });

    await investigationJobService.processInvestigation(existingRecord.investigation_id);

    const finalRecord = await investigationService.getInvestigation(existingRecord.investigation_id);
    const result = finalRecord?.results || finalRecord;

    if (!result || finalRecord?.status !== 'completed') {
      return res.status(500).json({
        error: true,
        code: 'INVESTIGATION_FAILED',
        message: finalRecord?.last_error?.message || 'Investigation processing failed.',
      });
    }

    return res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
