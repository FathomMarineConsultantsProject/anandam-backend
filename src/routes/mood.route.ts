import {Router} from 'express';
import {createMoodLog, getMyMoodHistory} from '../controllers/mood.controller';
import { authenticateToken } from '../middleware/auth.middleware';
const router = Router();

router.post('/log',authenticateToken, createMoodLog);
router.get('/history/:userId',authenticateToken, getMyMoodHistory);

export default router;