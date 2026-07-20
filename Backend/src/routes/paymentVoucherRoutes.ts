import { Router } from 'express';
import { getAllVouchers, createVoucher, getVoucherStatistics } from '../controllers/paymentVoucherController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();
router.use(authenticateToken);
router.get('/statistics', authorize('reports.view'), getVoucherStatistics);
router.get('/', authorize('sales.view'), getAllVouchers);
router.post('/', authorize('sales.create'), createVoucher);

export default router;
