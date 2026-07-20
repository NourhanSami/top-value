import { Router } from 'express';
import { getAllSchedules, createSchedule, markSchedulePaid, getOverdueSchedules } from '../controllers/paymentScheduleController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();
router.use(authenticateToken);
router.get('/overdue', authorize('sales.view'), getOverdueSchedules);
router.get('/', authorize('sales.view'), getAllSchedules);
router.post('/', authorize('sales.create'), createSchedule);
router.put('/:id/pay', authorize('sales.edit'), markSchedulePaid);

export default router;
