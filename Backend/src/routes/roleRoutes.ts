import { Router } from 'express';
import {
  listRoles,
  getRoleById,
  listPermissions,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/roleController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/permissions', authorize('users.view'), listPermissions);
router.get('/', authorize('users.view'), listRoles);
router.get('/:id', authorize('users.view'), getRoleById);
router.post('/', authorize('users.create'), createRole);
router.put('/:id', authorize('users.edit'), updateRole);
router.delete('/:id', authorize('users.delete'), deleteRole);

export default router;
