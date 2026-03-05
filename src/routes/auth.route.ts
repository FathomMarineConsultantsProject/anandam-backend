import {Router} from 'express';
import {registerUser, loginUser, refreshAccessToken} from '../controllers/auth.controller'

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshAccessToken);

export default router;