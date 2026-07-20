import { Router } from 'express';
import {
  listDriverRoutes,
  getDriverRouteById,
  createDriverRoute,
  dispatchDriverRoute,
  reconcileDriverRoute,
  closeDriverRoute,
  deleteDriverRoute,
} from '../controllers/driverRouteController';
import { authenticateToken, requireMenuAccess } from '../middlewares/auth';

const router = Router();
router.use(authenticateToken, requireMenuAccess('inventory'));

router.get('/', listDriverRoutes);
router.get('/:id', getDriverRouteById);
router.post('/', createDriverRoute);
router.post('/:id/dispatch', dispatchDriverRoute);
router.post('/:id/reconcile', reconcileDriverRoute);
router.post('/:id/close', closeDriverRoute);
router.delete('/:id', deleteDriverRoute);

export default router;
