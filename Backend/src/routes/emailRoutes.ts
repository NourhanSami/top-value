import { Router } from 'express';
import { sendInvoiceEmail, sendQuotationEmail } from '../controllers/emailController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();
router.use(authenticateToken);
router.post('/send-invoice', sendInvoiceEmail);
router.post('/send-quotation', sendQuotationEmail);

export default router;
