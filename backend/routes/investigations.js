import { Router } from 'express';
import investigationService from '../services/investigations/investigationService.js';
import reportService from '../services/reportService.js';
import authenticate from '../middleware/authenticate.js';
import authorizeInvestigation from '../middleware/authorizeInvestigation.js';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const investigations = await investigationService.listInvestigations(req.user?.id);
    res.json({ investigations });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/report', authenticate, authorizeInvestigation, async (req, res, next) => {
  try {
    return reportService.generateInvestigationReport(req.investigation, res);
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', authenticate, authorizeInvestigation, async (req, res, next) => {
  try {
    return res.json(req.investigation);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorizeInvestigation, async (req, res, next) => {
  try {
    const deleted = await investigationService.deleteInvestigation(req.params.id, req.user?.id);
    return res.json({ deleted });
  } catch (error) {
    next(error);
  }
});

export default router;
