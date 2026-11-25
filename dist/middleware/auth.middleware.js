"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ======================================================
// AUTHENTICATE ACCESS TOKEN
// ======================================================
const authenticateToken = async (req, res, next) => {
    try {
        // Already authenticated by a parent router.
        // Prevent duplicate session validation.
        if (req.user?.userId &&
            req.user?.sessionId) {
            return next();
        }
        const authHeader = req.headers.authorization;
        // --------------------------------------------------
        // No Authorization header
        // --------------------------------------------------
        if (!authHeader) {
            return res.status(401).json({
                status: "error",
                code: "ACCESS_TOKEN_MISSING",
                message: "Please sign in to continue.",
                action: "LOGIN_REQUIRED",
                shouldLogout: true,
            });
        }
        // --------------------------------------------------
        // Validate Bearer format
        // --------------------------------------------------
        const [scheme, token] = authHeader.split(" ");
        if (scheme !== "Bearer" ||
            !token) {
            return res.status(401).json({
                status: "error",
                code: "ACCESS_TOKEN_INVALID",
                message: "Your login session is invalid. Please sign in again.",
                action: "LOGIN_REQUIRED",
                shouldLogout: true,
            });
        }
        // --------------------------------------------------
        // Verify access token
        // --------------------------------------------------
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET);
        }
        catch (error) {
            // ----------------------------------------------
            // Token expired normally after 6 hours
            // ----------------------------------------------
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                return res.status(401).json({
                    status: "error",
                    code: "ACCESS_TOKEN_EXPIRED",
                    message: "Your session has expired. Refresh your session to continue.",
                    action: "REFRESH_ACCESS_TOKEN",
                    shouldRefresh: true,
                });
            }
            // ----------------------------------------------
            // Token invalid/tampered
            // ----------------------------------------------
            return res.status(401).json({
                status: "error",
                code: "ACCESS_TOKEN_INVALID",
                message: "Your login session is invalid. Please sign in again.",
                action: "LOGIN_REQUIRED",
                shouldLogout: true,
            });
        }
        // --------------------------------------------------
        // Validate token payload
        // --------------------------------------------------
        if (!decoded.userId ||
            !decoded.sessionId) {
            return res.status(401).json({
                status: "error",
                code: "SESSION_INVALID",
                message: "Your login session is no longer valid. Please sign in again.",
                action: "LOGIN_REQUIRED",
                shouldLogout: true,
            });
        }
        // --------------------------------------------------
        // Check server-side login session
        //
        // This makes logout actually revoke the access token.
        // --------------------------------------------------
        const session = await prisma.refreshToken.findUnique({
            where: {
                id: decoded.sessionId,
            },
        });
        if (!session ||
            session.userId !== decoded.userId) {
            return res.status(401).json({
                status: "error",
                code: "SESSION_EXPIRED",
                message: "You have been logged out or your session has expired. Please sign in again.",
                action: "LOGIN_REQUIRED",
                shouldLogout: true,
            });
        }
        // --------------------------------------------------
        // Check refresh/login session expiry
        // --------------------------------------------------
        if (session.expiresAt.getTime() <=
            Date.now()) {
            await prisma.refreshToken.deleteMany({
                where: {
                    id: session.id,
                },
            });
            return res.status(401).json({
                status: "error",
                code: "SESSION_EXPIRED",
                message: "Your login session has expired. Please sign in again.",
                action: "LOGIN_REQUIRED",
                shouldLogout: true,
            });
        }
        // --------------------------------------------------
        // Attach authenticated user
        // --------------------------------------------------
        req.user = {
            userId: decoded.userId,
            sessionId: decoded.sessionId,
        };
        return next();
    }
    catch (error) {
        console.error("Authentication middleware error:", error);
        return res.status(500).json({
            status: "error",
            code: "AUTHENTICATION_ERROR",
            message: "Unable to verify your login session.",
        });
    }
};
exports.authenticateToken = authenticateToken;
