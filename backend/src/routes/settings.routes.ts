import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../../../shared/src/types';

const router = Router();

// General config fetching
router.get('/', authenticateToken, SettingsController.getSettings);

// Admin-only operations
router.put('/', authenticateToken, requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]), SettingsController.updateSettings);
router.get('/logs', authenticateToken, requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]), SettingsController.getSystemLogs);

// Backup system
router.get('/backup/export', authenticateToken, requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]), SettingsController.exportBackup);
router.post('/backup/restore', authenticateToken, requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]), SettingsController.restoreBackup);

export default router;
