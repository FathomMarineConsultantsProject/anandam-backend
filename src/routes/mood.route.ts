import {Router} from 'express';
import {createMoodLog, getMyMoodHistory} from '../controllers/mood.controller';

const router = Router();

router.post('/log', createMoodLog);
router.get('/history/:userId', getMyMoodHistory);

export default router;