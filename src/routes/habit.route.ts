import { Router } from 'express';
import { 
    createHabit, getDailyHabits, toggleHabit, deleteHabit 
} from '../controllers/habit.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// 1. Create a new habit
router.post('/', authenticateToken, createHabit);

// 2. Get daily habits and completion percentage (e.g., /api/habits/2026-03-15)
router.get('/:date', authenticateToken, getDailyHabits);

// 3. Toggle a habit for a specific day
router.post('/:habitId/toggle', authenticateToken, toggleHabit);

// 4. Delete a habit forever
router.delete('/:habitId', authenticateToken, deleteHabit);

export default router;