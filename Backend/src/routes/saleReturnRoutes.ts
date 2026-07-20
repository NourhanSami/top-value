import { Router } from 'express';
import { getAllReturns, getReturnById, createReturn, getReturnStatistics } from '../controllers/saleReturnController';
import { authenticateToken, requireMenuAccess } from '../middlewares/auth';

const router = Router();

// Gate by the same menu sections the admin assigns to the user
router.use(authenticateToken, requireMenuAccess('returns'));
router.get('/statistics', getReturnStatistics);
router.get('/', getAllReturns);
router.get('/:id', getReturnById);
router.post('/', createReturn);

export default router;
