import { Router } from 'express';
import { getAllBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount } from '../controllers/bankAccountController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();
router.use(authenticateToken);
router.get('/', authorize('settings.view'), getAllBankAccounts);
router.post('/', authorize('settings.edit'), createBankAccount);
router.put('/:id', authorize('settings.edit'), updateBankAccount);
router.delete('/:id', authorize('settings.edit'), deleteBankAccount);

export default router;
