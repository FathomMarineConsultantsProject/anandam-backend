"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const habit_controller_1 = require("../controllers/habit.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// 1. Create a new habit
router.post('/', auth_middleware_1.authenticateToken, habit_controller_1.createHabit);
// 2. Get daily habits and completion percentage (e.g., /api/habits/2026-03-15)
router.get('/:date', auth_middleware_1.authenticateToken, habit_controller_1.getDailyHabits);
// 3. Toggle a habit for a specific day
router.post('/:habitId/toggle', auth_middleware_1.authenticateToken, habit_controller_1.toggleHabit);
// 4. Delete a habit forever
router.delete('/:habitId', auth_middleware_1.authenticateToken, habit_controller_1.deleteHabit);
exports.default = router;
