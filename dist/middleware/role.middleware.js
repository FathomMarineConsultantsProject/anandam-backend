"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const requireRole = (...allowedRoles) => async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                role: true,
            },
        });
        if (!user) {
            return res.status(401).json({
                message: "User not found",
            });
        }
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({
                message: "You do not have permission to access this resource",
            });
        }
        return next();
    }
    catch (error) {
        console.error("requireRole:", error);
        return res.status(500).json({
            message: "Unable to verify permissions",
        });
    }
};
exports.requireRole = requireRole;
