import {Router} from 'express';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  sendForgotPasswordCode,
  verifyForgotPasswordCode,
  resetForgotPassword,
} from "../controllers/auth.controller";

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshAccessToken);
router.post(
  "/forgot-password/send-code",
  sendForgotPasswordCode
);

router.post(
  "/forgot-password/verify-code",
  verifyForgotPasswordCode
);

router.post(
  "/forgot-password/reset",
  resetForgotPassword
);
export default router;