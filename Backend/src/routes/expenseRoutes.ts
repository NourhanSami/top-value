import { Router } from 'express';
import {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseStatistics,
  approveExpense,
  rejectExpense,
  getAllExpenseCategories
} from '../controllers/expenseController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Categories
router.get('/categories', getAllExpenseCategories);

// Statistics
router.get('/statistics', getExpenseStatistics);

// CRUD operations
router.get('/', getAllExpenses);
router.get('/:id', getExpenseById);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

// Approval
router.post('/:id/approve', approveExpense);
router.post('/:id/reject', rejectExpense);

export default router;
