import { Router } from 'express';
import { ReportsController } from '../controllers/reports.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../../../shared/src/types';

const router = Router();

// Reports downloadable by backoffice personnel
const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.AGENT];

router.get('/customers', authenticateToken, requireRole(allowedRoles), ReportsController.downloadCustomersReport);
router.get('/loans', authenticateToken, requireRole(allowedRoles), ReportsController.downloadLoansReport);
router.get('/chits', authenticateToken, requireRole(allowedRoles), ReportsController.downloadChitsReport);
router.get('/lic', authenticateToken, requireRole(allowedRoles), ReportsController.downloadLICReport);
router.get('/defaulters', authenticateToken, requireRole(allowedRoles), ReportsController.downloadDefaultersReport);
router.get('/cash-flow', authenticateToken, requireRole(allowedRoles), ReportsController.downloadCashFlowReport);
router.post('/send-reminders', authenticateToken, requireRole(allowedRoles), ReportsController.triggerOverdueReminders);
router.get('/monthly-status', authenticateToken, requireRole(allowedRoles), ReportsController.downloadMonthlyStatusReport);

export default router;
