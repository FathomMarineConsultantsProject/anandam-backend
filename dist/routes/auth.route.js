"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
// ======================================================
// REGISTER / LOGIN
// ======================================================
router.post("/register", auth_controller_1.registerUser);
router.post("/login", auth_controller_1.loginUser);
// ======================================================
// SESSION
// ======================================================
router.post("/refresh", auth_controller_1.refreshAccessToken);
router.post("/logout", auth_controller_1.logoutUser);
// ======================================================
// FORGOT PASSWORD
// ======================================================
router.post("/forgot-password/send-code", auth_controller_1.sendForgotPasswordCode);
router.post("/forgot-password/verify-code", auth_controller_1.verifyForgotPasswordCode);
router.post("/forgot-password/reset", auth_controller_1.resetForgotPassword);
exports.default = router;
