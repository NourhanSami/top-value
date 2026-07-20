import { Router } from 'express';
import { getAllSettings, getPublicSettings, updateSetting, updateManySettings } from '../controllers/settingsController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();
router.get('/public', authenticateToken, getPublicSettings);
router.get('/', authenticateToken, authorize('settings.view'), getAllSettings);
router.put('/', authenticateToken, authorize('settings.edit'), updateSetting);
router.post('/bulk', authenticateToken, authorize('settings.edit'), updateManySettings);

export default router;
