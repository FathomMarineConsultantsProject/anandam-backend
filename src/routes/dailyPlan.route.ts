import { Router } from 'express';
import { 
    getAllTemplates, applyTemplate, getDailyPlan, toggleActivityStatus 
} from '../controllers/dailyPlan.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();


// 1. Get all static templates for the frontend UI cards
router.get('/templates', authenticateToken, getAllTemplates);

// 2. Apply a template to a specific date
router.post('/apply', authenticateToken, applyTemplate);

// 3. Get the active plan and tasks for a specific date (e.g., /api/daily-plan/2026-03-13)
router.get('/:date', authenticateToken, getDailyPlan);

// 4. Check or uncheck a specific activity box
router.patch('/activity/:activityId', authenticateToken, toggleActivityStatus);

export default router;