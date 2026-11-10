import {
  Request,
  Response,
} from "express";

import {
  PrismaClient,
} from "@prisma/client";

import {
  ensureTokenWallet,
  tokenNumber,
} from "../services/token.service";


const prisma =
  new PrismaClient();


const configuredTokenPrice =
  Number(
    process.env.TOKEN_PRICE_INR ??
    100
  );


const TOKEN_PRICE_INR =
  Number.isFinite(
    configuredTokenPrice
  ) &&
  configuredTokenPrice >= 0
    ? configuredTokenPrice
    : 100;


const DEFAULT_CONTACT_EMAIL =
  "contact@fathommarineconsultants.com";


type AuthenticatedRequest =
  Request & {
    userId?: string;

    user?: {
      id?: string;
      userId?: string;
      role?: string;
    };
  };


function getUserId(
  req: AuthenticatedRequest
) {
  return (
    req.userId ||
    req.user?.userId ||
    req.user?.id ||
    null
  );
}


// ======================================================
// GET MY TOKEN SUMMARY
//
// GET /api/tokens/me
// ======================================================

export async function getMyTokenSummary(
  req: Request,
  res: Response
) {
  try {
    const userId =
      getUserId(
        req as AuthenticatedRequest
      );


    if (!userId) {
      return res
        .status(401)
        .json({
          message:
            "Unauthorized.",
        });
    }


    const wallet =
      await ensureTokenWallet(
        userId
      );


    return res
      .status(200)
      .json({
        balance:
          tokenNumber(
            wallet.balance
          ),

        tokenPriceInr:
          TOKEN_PRICE_INR,

        currency:
          "INR",

        selfPurchaseEnabled:
          false,

        contactEmail:
          process.env
            .ANANDAM_CONTACT_EMAIL ||
          DEFAULT_CONTACT_EMAIL,
      });
  } catch (error) {
    console.error(
      "getMyTokenSummary error:",
      error
    );


    return res
      .status(500)
      .json({
        message:
          "Unable to load token information.",
      });
  }
}


// ======================================================
// GET MY TOKEN HISTORY
//
// GET /api/tokens/history
// ======================================================

export async function getMyTokenHistory(
  req: Request,
  res: Response
) {
  try {
    const userId =
      getUserId(
        req as AuthenticatedRequest
      );


    if (!userId) {
      return res
        .status(401)
        .json({
          message:
            "Unauthorized.",
        });
    }


    const transactions =
      await prisma
        .tokenTransaction
        .findMany({
          where: {
            userId,
          },

          orderBy: {
            createdAt:
              "desc",
          },

          take:
            100,
        });


    return res
      .status(200)
      .json({
        transactions:
          transactions.map(
            (transaction) => ({
              ...transaction,

              amount:
                tokenNumber(
                  transaction.amount
                ),

              balanceBefore:
                tokenNumber(
                  transaction.balanceBefore
                ),

              balanceAfter:
                tokenNumber(
                  transaction.balanceAfter
                ),
            })
          ),
      });
  } catch (error) {
    console.error(
      "getMyTokenHistory error:",
      error
    );


    return res
      .status(500)
      .json({
        message:
          "Unable to load token history.",
      });
  }
}
