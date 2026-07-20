import { Router } from 'express';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStatistics,
  updateCustomerBalance,
  addCustomerAddress,
  getCustomerStatement
} from '../controllers/customerController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/statistics', getCustomerStatistics);
router.get('/', getAllCustomers);
router.get('/:id/statement', getCustomerStatement);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.post('/:id/update-balance', updateCustomerBalance);
router.post('/:id/addresses', addCustomerAddress);

export default router;
