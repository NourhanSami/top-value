import { Router } from 'express';
import { getAllReturns, getReturnById, createReturn, getReturnStatistics } from '../controllers/saleReturnController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();
router.use(authenticateToken);
router.get('/statistics', authorize('sales.view'), getReturnStatistics);
router.get('/', authorize('sales.view'), getAllReturns);
router.get('/:id', authorize('sales.view'), getReturnById);
router.post('/', authorize('sales.create'), createReturn);

export default router;
