import { Router } from 'express';
import { getAllSettings, getPublicSettings, updateSetting, updateManySettings, downloadBackup } from '../controllers/settingsController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();
router.get('/public', authenticateToken, getPublicSettings);
router.get('/backup', authenticateToken, authorize('settings.edit'), downloadBackup);
router.get('/', authenticateToken, authorize('settings.view'), getAllSettings);
router.put('/', authenticateToken, authorize('settings.edit'), updateSetting);
router.post('/bulk', authenticateToken, authorize('settings.edit'), updateManySettings);

export default router;
