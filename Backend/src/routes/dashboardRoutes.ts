import { Router } from 'express';
import {
  getDashboardStatistics,
  getChartData
} from '../controllers/dashboardController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Dashboard statistics
router.get('/', getDashboardStatistics);
router.get('/charts', getChartData);

export default router;
