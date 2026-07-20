import { Router } from 'express';
import {
  getTreasuryOverview,
  openCashSession,
  closeCashSession,
  listCashSessions,
  checkPurchaseCapacity,
} from '../controllers/treasuryController';
import { authenticateToken, requireMenuAccess } from '../middlewares/auth';

const router = Router();
router.use(authenticateToken, requireMenuAccess('finance'));

router.get('/overview', getTreasuryOverview);
router.get('/sessions', listCashSessions);
router.post('/sessions/open', openCashSession);
router.post('/sessions/:id/close', closeCashSession);
router.post('/check-capacity', checkPurchaseCapacity);

export default router;
