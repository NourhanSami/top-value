import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStatistics,
  getUserActivity,
  getAllRoles
} from '../controllers/userController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Roles
router.get('/roles', authorize('users.view'), getAllRoles);

// Statistics
router.get('/statistics', authorize('users.view'), getUserStatistics);

// Activity
router.get('/:id/activity', authorize('users.view'), getUserActivity);

// CRUD operations
router.get('/', authorize('users.view'), getAllUsers);
router.get('/:id', authorize('users.view'), getUserById);
router.post('/', authorize('users.create'), createUser);
router.put('/:id', authorize('users.edit'), updateUser);
router.delete('/:id', authorize('users.delete'), deleteUser);

export default router;
