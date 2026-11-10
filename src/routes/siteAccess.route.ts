import {
  Router,
} from "express";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

import {
  activateMySiteAccess,
  getMySiteAccess,
} from "../controllers/siteAccess.controller";


const router =
  Router();


router.use(
  authenticateToken
);


router.get(
  "/me",
  getMySiteAccess
);


router.post(
  "/activate",
  activateMySiteAccess
);


export default router;
