import { Router } from 'express';
import investigationService from '../services/investigations/investigationService.js';
import reportService from '../services/reportService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const investigations = await investigationService.listInvestigations();
    res.json({ investigations });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await investigationService.getInvestigation(req.params.id);
    if (!item) {
      return res.status(404).json({ error: true, code: 'INVESTIGATION_NOT_FOUND', message: 'Investigation not found.' });
    }
    return res.json(item);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await investigationService.deleteInvestigation(req.params.id);
    return res.json({ deleted });
  } catch (error) {
    next(error);
  }
});

export default router;
