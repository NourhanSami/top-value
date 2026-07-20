import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStatistics
} from '../controllers/productController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Statistics
router.get('/statistics', authorize('products.view'), getProductStatistics);

// Get product by barcode
router.get('/barcode/:barcode', authorize('products.view'), getProductByBarcode);

// CRUD operations
router.get('/', authorize('products.view'), getAllProducts);
router.get('/:id', authorize('products.view'), getProductById);
router.post('/', authorize('products.create'), createProduct);
router.put('/:id', authorize('products.edit'), updateProduct);
router.delete('/:id', authorize('products.delete'), deleteProduct);

export default router;
