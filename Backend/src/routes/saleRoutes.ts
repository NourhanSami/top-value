import { Router } from 'express';
import {
  getAllSales,
  getSaleById,
  createSale,
  getSalesStatistics,
  getSaleByInvoiceNumber
} from '../controllers/saleController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Statistics
router.get('/statistics', getSalesStatistics);

// Get by invoice number
router.get('/invoice/:invoiceNumber', getSaleByInvoiceNumber);

// CRUD operations
router.get('/', getAllSales);
router.get('/:id', getSaleById);
router.post('/', createSale);

export default router;
