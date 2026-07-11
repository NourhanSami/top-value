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
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Roles
router.get('/roles', getAllRoles);

// Statistics
router.get('/statistics', getUserStatistics);

// Activity
router.get('/:id/activity', getUserActivity);

// CRUD operations
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
