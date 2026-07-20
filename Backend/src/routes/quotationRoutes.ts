import { Router } from 'express';
import { getAllQuotations, getQuotationById, createQuotation, updateQuotationStatus, convertQuotationToSale, deleteQuotation } from '../controllers/quotationController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();
router.use(authenticateToken);
router.get('/', authorize('sales.view'), getAllQuotations);
router.get('/:id', authorize('sales.view'), getQuotationById);
router.post('/', authorize('sales.create'), createQuotation);
router.put('/:id/status', authorize('sales.edit'), updateQuotationStatus);
router.post('/:id/convert', authorize('sales.create'), convertQuotationToSale);
router.delete('/:id', authorize('sales.delete'), deleteQuotation);

export default router;
