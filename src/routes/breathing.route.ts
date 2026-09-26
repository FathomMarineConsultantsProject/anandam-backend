import {
  Router,
} from "express";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

import {
  getBreathingTracks,
} from "../controllers/breathing.controller";


const router =
  Router();


router.get(
  "/tracks",
  authenticateToken,
  getBreathingTracks
);


export default router;