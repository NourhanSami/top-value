import { Router } from 'express';
import { getCapitalSummary, initializeCapital } from '../controllers/capitalController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);
router.get('/summary', getCapitalSummary);
router.post('/initialize', initializeCapital);

export default router;
