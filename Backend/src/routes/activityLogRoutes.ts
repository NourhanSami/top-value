import { Router } from 'express';
import { getAllActivityLogs, getActivityStatistics } from '../controllers/activityLogController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);
router.get('/statistics', getActivityStatistics);
router.get('/', getAllActivityLogs);

export default router;
