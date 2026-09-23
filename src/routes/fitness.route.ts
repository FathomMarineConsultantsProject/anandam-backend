import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
  getFitnessOverview,
  getFitnessWorkouts,
  getFitnessWorkoutById,
  startFitnessWorkout,
  getActiveFitnessSession,
  updateFitnessProgress,
  completeFitnessSession,
  endFitnessSession,
  getFitnessHistory,
} from "../controllers/fitness.controller";

const router = Router();

router.get("/overview", authenticateToken, getFitnessOverview);

router.get("/workouts", authenticateToken, getFitnessWorkouts);
router.get("/workouts/:workoutId", authenticateToken, getFitnessWorkoutById);
router.post("/workouts/:workoutId/start", authenticateToken, startFitnessWorkout);

router.get("/sessions/active", authenticateToken, getActiveFitnessSession);
router.patch("/sessions/:sessionId/progress", authenticateToken, updateFitnessProgress);
router.post("/sessions/:sessionId/complete", authenticateToken, completeFitnessSession);
router.post("/sessions/:sessionId/end", authenticateToken, endFitnessSession);

router.get("/history", authenticateToken, getFitnessHistory);

export default router;
