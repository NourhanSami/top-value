import { Router } from 'express';
import { getAllTransfers, createTransfer } from '../controllers/inventoryTransferController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();
router.use(authenticateToken);
router.get('/', authorize('inventory.view'), getAllTransfers);
router.post('/', authorize('inventory.adjust'), createTransfer);

export default router;
