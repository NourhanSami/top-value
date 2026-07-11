import { Router } from 'express';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStatistics,
  updateCustomerBalance,
  addCustomerAddress
} from '../controllers/customerController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Statistics
router.get('/statistics', getCustomerStatistics);

// CRUD operations
router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

// Balance operations
router.post('/:id/update-balance', updateCustomerBalance);

// Address management
router.post('/:id/addresses', addCustomerAddress);

export default router;
