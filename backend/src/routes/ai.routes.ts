import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../../../shared/src/types';

const router = Router();

// Run predictions (Backoffice only)
router.post('/predict-approval', authenticateToken, requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.AGENT]), AIController.predictApproval);
router.post('/predict-default', authenticateToken, requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.AGENT]), AIController.predictDefault);

// Fetch scores and details (Open to authenticated clients)
router.get('/customer-score/:id', authenticateToken, AIController.getCustomerScore);
router.get('/history', authenticateToken, AIController.getPredictionHistory);

export default router;
