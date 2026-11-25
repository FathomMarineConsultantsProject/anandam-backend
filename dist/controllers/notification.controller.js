"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllNotificationsRead = exports.markNotificationRead = exports.getMyNotifications = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ======================================================
// GET LOGGED-IN USER NOTIFICATIONS
// USER OR PRACTITIONER
// ======================================================
const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        const [notifications, unreadCount,] = await Promise.all([
            prisma.notification.findMany({
                where: {
                    userId,
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 50,
            }),
            prisma.notification.count({
                where: {
                    userId,
                    isRead: false,
                },
            }),
        ]);
        return res.status(200).json({
            notifications,
            unreadCount,
        });
    }
    catch (error) {
        console.error("getMyNotifications:", error);
        return res.status(500).json({
            message: "Unable to load notifications",
        });
    }
};
exports.getMyNotifications = getMyNotifications;
// ======================================================
// MARK ONE NOTIFICATION READ
// ======================================================
const markNotificationRead = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        const notificationId = String(req.params.notificationId);
        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId,
            },
        });
        if (!notification) {
            return res.status(404).json({
                message: "Notification not found",
            });
        }
        const updated = await prisma.notification.update({
            where: {
                id: notificationId,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
        return res.status(200).json({
            notification: updated,
        });
    }
    catch (error) {
        console.error("markNotificationRead:", error);
        return res.status(500).json({
            message: "Unable to update notification",
        });
    }
};
exports.markNotificationRead = markNotificationRead;
// ======================================================
// MARK ALL NOTIFICATIONS READ
// ======================================================
const markAllNotificationsRead = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        await prisma.notification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
        return res.status(200).json({
            message: "Notifications marked as read",
        });
    }
    catch (error) {
        console.error("markAllNotificationsRead:", error);
        return res.status(500).json({
            message: "Unable to update notifications",
        });
    }
};
exports.markAllNotificationsRead = markAllNotificationsRead;
