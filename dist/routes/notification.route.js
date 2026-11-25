"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notification_controller_1 = require("../controllers/notification.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticateToken);
router.get("/mine", notification_controller_1.getMyNotifications);
router.patch("/read-all", notification_controller_1.markAllNotificationsRead);
router.patch("/:notificationId/read", notification_controller_1.markNotificationRead);
exports.default = router;
