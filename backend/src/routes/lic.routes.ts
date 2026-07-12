import { Router } from 'express';
import { LICController } from '../controllers/lic.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../../../shared/src/types';

const router = Router();

// Policies registry
router.get('/', authenticateToken, LICController.getPolicies);
router.get('/alerts', authenticateToken, LICController.getRenewalAlerts);

// Creation & Payments
router.post('/', authenticateToken, requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.AGENT, UserRole.CUSTOMER]), LICController.createPolicy);
router.post('/:id/pay-premium', authenticateToken, LICController.payPremium);

export default router;
