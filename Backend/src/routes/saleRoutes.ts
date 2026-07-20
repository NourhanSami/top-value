import { Router } from 'express';
import {
  getAllSales,
  getSaleById,
  createSale,
  getSalesStatistics,
  getSaleByInvoiceNumber
} from '../controllers/saleController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Statistics
router.get('/statistics', authorize('reports.view', 'sales.view'), getSalesStatistics);

// Get by invoice number
router.get('/invoice/:invoiceNumber', authorize('sales.view'), getSaleByInvoiceNumber);

// CRUD operations
router.get('/', authorize('sales.view'), getAllSales);
router.get('/:id', authorize('sales.view'), getSaleById);
router.post('/', authorize('sales.create'), createSale);

export default router;
