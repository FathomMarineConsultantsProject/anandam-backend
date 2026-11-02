import {
  Router,
} from "express";

import {
  getMyTokenHistory,
  getMyTokenSummary,
} from "../controllers/token.controller";

import {
  authenticateToken,
} from "../middleware/auth.middleware";


const router =
  Router();


router.use(
  authenticateToken
);


router.get(
  "/me",
  getMyTokenSummary
);


router.get(
  "/history",
  getMyTokenHistory
);


export default router;