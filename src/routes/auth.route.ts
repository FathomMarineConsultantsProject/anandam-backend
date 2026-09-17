import { Router } from "express";

import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,

  sendForgotPasswordCode,
  verifyForgotPasswordCode,
  resetForgotPassword,
} from "../controllers/auth.controller";


const router = Router();


// ======================================================
// REGISTER / LOGIN
// ======================================================

router.post(
  "/register",
  registerUser
);


router.post(
  "/login",
  loginUser
);


// ======================================================
// SESSION
// ======================================================

router.post(
  "/refresh",
  refreshAccessToken
);


router.post(
  "/logout",
  logoutUser
);


// ======================================================
// FORGOT PASSWORD
// ======================================================

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