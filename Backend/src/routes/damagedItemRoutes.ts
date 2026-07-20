import { Router } from 'express';
import { getAllDamagedItems, createDamagedItem, updateDamagedItemStatus, getDamagedStatistics } from '../controllers/damagedItemController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();
router.use(authenticateToken);
router.get('/statistics', authorize('inventory.view'), getDamagedStatistics);
router.get('/', authorize('inventory.view'), getAllDamagedItems);
router.post('/', authorize('inventory.adjust'), createDamagedItem);
router.put('/:id/status', authorize('inventory.adjust'), updateDamagedItemStatus);

export default router;
