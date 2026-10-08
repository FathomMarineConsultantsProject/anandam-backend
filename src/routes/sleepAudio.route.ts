import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
  getSleepAudioTrackBySlug,
  getSleepAudioTracks,
} from "../controllers/sleepAudio.controller";

const router = Router();

router.use(authenticateToken);

router.get("/tracks", getSleepAudioTracks);
router.get("/tracks/:slug", getSleepAudioTrackBySlug);

export default router;
