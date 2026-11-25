"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyTokenSummary = getMyTokenSummary;
exports.getMyTokenHistory = getMyTokenHistory;
const client_1 = require("@prisma/client");
const token_service_1 = require("../services/token.service");
const prisma = new client_1.PrismaClient();
const configuredTokenPrice = Number(process.env.TOKEN_PRICE_INR ??
    100);
const TOKEN_PRICE_INR = Number.isFinite(configuredTokenPrice) &&
    configuredTokenPrice >= 0
    ? configuredTokenPrice
    : 100;
const DEFAULT_CONTACT_EMAIL = "contact@fathommarineconsultants.com";
function getUserId(req) {
    return (req.userId ||
        req.user?.userId ||
        req.user?.id ||
        null);
}
// ======================================================
// GET MY TOKEN SUMMARY
//
// GET /api/tokens/me
// ======================================================
async function getMyTokenSummary(req, res) {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res
                .status(401)
                .json({
                message: "Unauthorized.",
            });
        }
        const wallet = await (0, token_service_1.ensureTokenWallet)(userId);
        return res
            .status(200)
            .json({
            balance: (0, token_service_1.tokenNumber)(wallet.balance),
            tokenPriceInr: TOKEN_PRICE_INR,
            currency: "INR",
            selfPurchaseEnabled: false,
            contactEmail: process.env
                .ANANDAM_CONTACT_EMAIL ||
                DEFAULT_CONTACT_EMAIL,
        });
    }
    catch (error) {
        console.error("getMyTokenSummary error:", error);
        return res
            .status(500)
            .json({
            message: "Unable to load token information.",
        });
    }
}
// ======================================================
// GET MY TOKEN HISTORY
//
// GET /api/tokens/history
// ======================================================
async function getMyTokenHistory(req, res) {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res
                .status(401)
                .json({
                message: "Unauthorized.",
            });
        }
        const transactions = await prisma
            .tokenTransaction
            .findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 100,
        });
        return res
            .status(200)
            .json({
            transactions: transactions.map((transaction) => ({
                ...transaction,
                amount: (0, token_service_1.tokenNumber)(transaction.amount),
                balanceBefore: (0, token_service_1.tokenNumber)(transaction.balanceBefore),
                balanceAfter: (0, token_service_1.tokenNumber)(transaction.balanceAfter),
            })),
        });
    }
    catch (error) {
        console.error("getMyTokenHistory error:", error);
        return res
            .status(500)
            .json({
            message: "Unable to load token history.",
        });
    }
}
