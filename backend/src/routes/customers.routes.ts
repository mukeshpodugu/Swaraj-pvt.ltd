import { Router } from 'express';
import { CustomersController } from '../controllers/customers.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../../../shared/src/types';

const router = Router();

// Backoffice roles can search and filter all customer profiles
router.get('/', authenticateToken, requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.AGENT]), CustomersController.getCustomers);

// Any authenticated user can view specific profiles (checked in frontend/route authorization level)
router.get('/:id', authenticateToken, CustomersController.getCustomerById);
router.get('/:id/timeline', authenticateToken, CustomersController.getCustomerTimeline);

// Profile updates
router.put('/:id', authenticateToken, CustomersController.updateProfile);

// Only compliance roles (Super Admin, Admin, Staff) can resolve KYC approvals
router.post('/:id/verify-kyc', authenticateToken, requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF]), CustomersController.verifyKYC);

export default router;
