import { Router } from 'express';
import {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchStatistics,
  getBranchPerformance
} from '../controllers/branchController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Statistics
router.get('/statistics', getBranchStatistics);

// Performance
router.get('/:id/performance', getBranchPerformance);

// CRUD operations
router.get('/', getAllBranches);
router.get('/:id', getBranchById);
router.post('/', createBranch);
router.put('/:id', updateBranch);
router.delete('/:id', deleteBranch);

export default router;
