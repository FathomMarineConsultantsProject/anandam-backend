import { Router } from 'express';
import { getDailyGrid, saveMyGrid } from '../controllers/workHours.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// 1. Get the entire STCW grid for everyone on a specific date (e.g., /api/work-hours/2026-03-14)
router.get('/:date', authenticateToken, getDailyGrid);

// 2. Save the logged-in user's 48-block grid selection
router.post('/', authenticateToken, saveMyGrid);

export default router;