import { Router } from 'express';
import { ChitsController } from '../controllers/chits.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../../../shared/src/types';

const router = Router();

// Listings
router.get('/', authenticateToken, ChitsController.getChitGroups);

// Creation & enrollment
router.post('/', authenticateToken, requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]), ChitsController.createChitGroup);
router.post('/:id/join', authenticateToken, ChitsController.joinChitGroup);

// Monthly auctions & collections
router.post('/:id/auction', authenticateToken, requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]), ChitsController.conductAuction);
router.post('/:id/installment/:installmentId/pay', authenticateToken, ChitsController.payInstallment);

export default router;
