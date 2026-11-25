"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenServiceError = void 0;
exports.tokenDecimal = tokenDecimal;
exports.tokenNumber = tokenNumber;
exports.ensureTokenWallet = ensureTokenWallet;
exports.getTokenBalance = getTokenBalance;
exports.debitTokensInTransaction = debitTokensInTransaction;
exports.creditTokens = creditTokens;
exports.spendTokens = spendTokens;
exports.refundTokens = refundTokens;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class TokenServiceError extends Error {
    statusCode;
    code;
    details;
    constructor(message, options) {
        super(message);
        this.name =
            "TokenServiceError";
        this.statusCode =
            options.statusCode;
        this.code =
            options.code;
        this.details =
            options.details;
    }
}
exports.TokenServiceError = TokenServiceError;
function tokenDecimal(value, fieldName = "Token amount") {
    let amount;
    try {
        amount =
            new client_1.Prisma.Decimal(String(value));
    }
    catch {
        throw new TokenServiceError(`${fieldName} must be a valid number.`, {
            statusCode: 400,
            code: "INVALID_TOKEN_AMOUNT",
        });
    }
    if (!amount.isFinite() ||
        amount.lte(0)) {
        throw new TokenServiceError(`${fieldName} must be greater than zero.`, {
            statusCode: 400,
            code: "INVALID_TOKEN_AMOUNT",
        });
    }
    if (amount.decimalPlaces() >
        6) {
        throw new TokenServiceError(`${fieldName} can have a maximum of 6 decimal places.`, {
            statusCode: 400,
            code: "INVALID_TOKEN_PRECISION",
        });
    }
    return amount;
}
function tokenNumber(value) {
    if (value === null ||
        value === undefined) {
        return 0;
    }
    return Number(String(value));
}
async function ensureTokenWallet(userId) {
    return prisma.tokenWallet.upsert({
        where: {
            userId,
        },
        update: {},
        create: {
            userId,
            balance: new client_1.Prisma.Decimal(0),
        },
    });
}
async function getTokenBalance(userId) {
    const wallet = await ensureTokenWallet(userId);
    return tokenNumber(wallet.balance);
}
async function debitTokensInTransaction(tx, { userId, amount, featureKey, referenceId, reason, source = client_1.TokenTransactionSource.FEATURE, }) {
    const debitAmount = tokenDecimal(amount);
    const current = await tx.tokenWallet.upsert({
        where: {
            userId,
        },
        update: {},
        create: {
            userId,
            balance: new client_1.Prisma.Decimal(0),
        },
    });
    if (current.balance.lt(debitAmount)) {
        const currentBalance = tokenNumber(current.balance);
        throw new TokenServiceError("Insufficient token balance.", {
            statusCode: 402,
            code: "INSUFFICIENT_TOKENS",
            details: {
                requiredTokens: tokenNumber(debitAmount),
                currentBalance,
                missingTokens: tokenNumber(debitAmount.minus(current.balance)),
                featureKey,
                referenceId,
            },
        });
    }
    const updated = await tx.tokenWallet.update({
        where: {
            userId,
        },
        data: {
            balance: {
                decrement: debitAmount,
            },
        },
    });
    await tx.tokenTransaction.create({
        data: {
            userId,
            type: client_1.TokenTransactionType.DEBIT,
            source,
            amount: debitAmount,
            balanceBefore: current.balance,
            balanceAfter: updated.balance,
            featureKey,
            referenceId,
            reason,
        },
    });
    return updated;
}
async function creditTokens({ userId, amount, source = client_1.TokenTransactionSource.ADMIN, reason, featureKey, referenceId, }) {
    const creditAmount = tokenDecimal(amount);
    return prisma.$transaction(async (tx) => {
        const current = await tx.tokenWallet.upsert({
            where: {
                userId,
            },
            update: {},
            create: {
                userId,
                balance: new client_1.Prisma.Decimal(0),
            },
        });
        const updated = await tx.tokenWallet.update({
            where: {
                userId,
            },
            data: {
                balance: {
                    increment: creditAmount,
                },
            },
        });
        await tx.tokenTransaction.create({
            data: {
                userId,
                type: client_1.TokenTransactionType.CREDIT,
                source,
                amount: creditAmount,
                balanceBefore: current.balance,
                balanceAfter: updated.balance,
                reason,
                featureKey,
                referenceId,
            },
        });
        return updated;
    }, {
        isolationLevel: client_1.Prisma.TransactionIsolationLevel
            .Serializable,
    });
}
async function spendTokens({ userId, amount, featureKey, referenceId, reason, }) {
    return prisma.$transaction(async (tx) => {
        return debitTokensInTransaction(tx, {
            userId,
            amount,
            featureKey,
            referenceId,
            reason,
        });
    }, {
        isolationLevel: client_1.Prisma.TransactionIsolationLevel
            .Serializable,
    });
}
async function refundTokens({ userId, amount, featureKey, referenceId, reason, }) {
    const refundAmount = tokenDecimal(amount);
    return prisma.$transaction(async (tx) => {
        const current = await tx.tokenWallet.upsert({
            where: {
                userId,
            },
            update: {},
            create: {
                userId,
                balance: new client_1.Prisma.Decimal(0),
            },
        });
        const updated = await tx.tokenWallet.update({
            where: {
                userId,
            },
            data: {
                balance: {
                    increment: refundAmount,
                },
            },
        });
        await tx.tokenTransaction.create({
            data: {
                userId,
                type: client_1.TokenTransactionType.REFUND,
                source: client_1.TokenTransactionSource.REFUND,
                amount: refundAmount,
                balanceBefore: current.balance,
                balanceAfter: updated.balance,
                featureKey,
                referenceId,
                reason,
            },
        });
        return updated;
    }, {
        isolationLevel: client_1.Prisma.TransactionIsolationLevel
            .Serializable,
    });
}
