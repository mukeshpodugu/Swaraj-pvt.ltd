import { Router } from 'express';
import { LoansController } from '../controllers/loans.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../../../shared/src/types';

const router = Router();

// Backoffice listings
router.get('/', authenticateToken, LoansController.getAllLoans);

// Application
router.post('/apply', authenticateToken, LoansController.applyForLoan);

// Management workflow
router.post('/:id/approve', authenticateToken, requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF]), LoansController.approveLoan);
router.post('/:id/verify-collateral', authenticateToken, requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF]), LoansController.verifyCollateral);
router.post('/:id/disburse', authenticateToken, requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]), LoansController.disburseLoan);

// Repayment pathways
router.post('/:id/emi/:installmentId/pay', authenticateToken, LoansController.payEMI);
router.post('/:id/part-payment', authenticateToken, LoansController.makePartPayment);

export default router;
