import { Router } from 'express';
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  receivePurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  getPurchaseOrderStatistics
} from '../controllers/purchaseOrderController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Statistics
router.get('/statistics', getPurchaseOrderStatistics);

// CRUD operations
router.get('/', getAllPurchaseOrders);
router.get('/:id', getPurchaseOrderById);
router.post('/', createPurchaseOrder);
router.delete('/:id', deletePurchaseOrder);

// Receive items
router.post('/:id/receive', receivePurchaseOrder);

// Update status
router.put('/:id/status', updatePurchaseOrderStatus);

export default router;
