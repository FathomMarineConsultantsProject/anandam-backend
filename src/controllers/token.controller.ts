import {
  Request,
  Response,
} from "express";

import {
  PrismaClient,
} from "@prisma/client";

import {
  ensureTokenWallet,
} from "../services/token.service";


const prisma =
  new PrismaClient();


const TOKEN_PRICE_INR =
  100;


export async function getMyTokenSummary(
  req: Request,
  res: Response
) {
  try {
    const userId =
      (req as any).userId;


    if (!userId) {
      return res.status(401).json({
        message:
          "Unauthorized",
      });
    }


    const wallet =
      await ensureTokenWallet(
        userId
      );


    return res.status(200).json({
      balance:
        wallet.balance,

      tokenPriceInr:
        TOKEN_PRICE_INR,

      currency:
        "INR",

      selfPurchaseEnabled:
        false,

      contactEmail:
        process.env
          .ANANDAM_CONTACT_EMAIL ||
        null,
    });
  } catch (error) {
    console.error(
      "getMyTokenSummary error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load token information.",
    });
  }
}


export async function getMyTokenHistory(
  req: Request,
  res: Response
) {
  try {
    const userId =
      (req as any).userId;


    if (!userId) {
      return res.status(401).json({
        message:
          "Unauthorized",
      });
    }


    const transactions =
      await prisma.tokenTransaction.findMany({
        where: {
          userId,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take: 100,
      });


    return res.status(200).json({
      transactions,
    });
  } catch (error) {
    console.error(
      "getMyTokenHistory error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load token history.",
    });
  }
}