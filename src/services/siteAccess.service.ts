import {
  Prisma,
  PrismaClient,
  UserRole,
} from "@prisma/client";

import {
  debitTokensInTransaction,
  TokenServiceError,
  tokenNumber,
} from "./token.service";


const prisma =
  new PrismaClient();


const MS_PER_DAY =
  24 * 60 * 60 * 1000;


// ======================================================
// CONFIG
//
// Default rule:
// 30 tokens = 30 days
// 1 token   = 1 day
// 0.5 token = 12 hours
// ======================================================

function positiveNumberFromEnv(
  value: string | undefined,
  fallback: number
) {
  const parsed =
    Number(value);


  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return fallback;
  }


  return parsed;
}


export function getSiteAccessConfig() {
  const tokenCost =
    positiveNumberFromEnv(
      process.env
        .SITE_ACCESS_TOKEN_COST,
      30
    );


  const daysPerToken =
    positiveNumberFromEnv(
      process.env
        .SITE_ACCESS_DAYS_PER_TOKEN,
      1
    );


  const durationDays =
    tokenCost *
    daysPerToken;


  return {
    tokenCost,
    daysPerToken,
    durationDays,
  };
}


function normalizeRequestedTokenAmount(
  value: unknown
) {
  const config =
    getSiteAccessConfig();


  const parsed =
    value === undefined ||
      value === null ||
      value === ""
      ? config.tokenCost
      : Number(value);


  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    throw new SiteAccessError(
      "Token amount must be greater than zero.",
      {
        statusCode: 400,
        code:
          "INVALID_SITE_ACCESS_TOKEN_AMOUNT",
      }
    );
  }


  const decimalText =
    String(value ?? parsed);


  const decimals =
    decimalText.includes(".")
      ? decimalText
        .split(".")[1]
        ?.length ?? 0
      : 0;


  if (
    decimals > 6
  ) {
    throw new SiteAccessError(
      "Site-access token amount can have a maximum of 6 decimal places.",
      {
        statusCode: 400,
        code:
          "INVALID_SITE_ACCESS_TOKEN_PRECISION",
      }
    );
  }


  return parsed;
}


function cleanNumber(
  value: number
) {
  return Number(
    value.toFixed(6)
  );
}


// ======================================================
// CUSTOM ERROR
// ======================================================

export class SiteAccessError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, unknown>;


  constructor(
    message: string,
    options: {
      statusCode: number;
      code: string;
      details?: Record<string, unknown>;
    }
  ) {
    super(message);

    this.name =
      "SiteAccessError";

    this.statusCode =
      options.statusCode;

    this.code =
      options.code;

    this.details =
      options.details;
  }
}


// ======================================================
// CHECK ACTIVE SITE ACCESS
// ======================================================

export async function hasActiveSiteAccess(
  userId: string
) {
  const now =
    new Date();


  const [
    user,
    pass,
  ] =
    await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          role: true,
        },
      }),

      prisma.siteAccessPass.findUnique({
        where: {
          userId,
        },

        select: {
          endsAt: true,
        },
      }),
    ]);


  if (!user) {
    return false;
  }


  // Only SUPER_ADMIN bypasses the site-access system.
  // USER and PRACTITIONER require an active pass.
  if (
    user.role ===
    UserRole.SUPER_ADMIN
  ) {
    return true;
  }


  return Boolean(
    pass &&
    pass.endsAt.getTime() >
    now.getTime()
  );
}


// ======================================================
// GET COMPLETE ACCESS STATUS
// ======================================================

export async function getSiteAccessStatus(
  userId: string
) {
  const config =
    getSiteAccessConfig();


  const now =
    new Date();


  const [
    user,
    wallet,
    pass,
  ] =
    await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          role: true,
        },
      }),

      prisma.tokenWallet.upsert({
        where: {
          userId,
        },

        update: {},

        create: {
          userId,
          balance:
            new Prisma.Decimal(0),
        },
      }),

      prisma.siteAccessPass.findUnique({
        where: {
          userId,
        },
      }),
    ]);


  if (!user) {
    throw new SiteAccessError(
      "User account was not found.",
      {
        statusCode: 404,
        code:
          "USER_NOT_FOUND",
      }
    );
  }


  const roleBypass =
    user.role ===
    UserRole.SUPER_ADMIN;


  const passActive =
    Boolean(
      pass &&
      pass.endsAt.getTime() >
      now.getTime()
    );


  const active =
    roleBypass ||
    passActive;


  const remainingMs =
    passActive && pass
      ? Math.max(
        0,
        pass.endsAt.getTime() -
        now.getTime()
      )
      : 0;


  const daysRemaining =
    remainingMs > 0
      ? Math.ceil(
        remainingMs /
        MS_PER_DAY
      )
      : 0;


  const hoursRemaining =
    remainingMs > 0
      ? Number(
        (
          remainingMs /
          (60 * 60 * 1000)
        ).toFixed(2)
      )
      : 0;


  const tokenBalance =
    tokenNumber(
      wallet.balance
    );


  return {
    active,

    accessType:
      roleBypass
        ? "ROLE_BYPASS"
        : passActive
          ? "SITE_ACCESS_PASS"
          : "NONE",

    startsAt:
      passActive && pass
        ? pass.startsAt
        : null,

    endsAt:
      passActive && pass
        ? pass.endsAt
        : null,

    daysRemaining,
    hoursRemaining,

    tokenCost:
      config.tokenCost,

    durationDays:
      config.durationDays,

    daysPerToken:
      config.daysPerToken,

    tokenBalance,

    canActivate:
      tokenBalance >=
      config.tokenCost,

    canExtend:
      active &&
      tokenBalance > 0,

    missingTokens:
      active
        ? 0
        : cleanNumber(
          Math.max(
            0,
            config.tokenCost -
            tokenBalance
          )
        ),

    freeAccess: {
      dashboard:
        true,

      quickMood:
        true,

      blogs:
        true,

      wellbeingQuestionnaires:
        false,

      psychometrics:
        false,

      profile:
        true,

      tokens:
        true,

      notifications:
        true,
    },
  };
}


// ======================================================
// ACTIVATE / EXTEND SITE ACCESS
//
// Default request:
//   POST /api/site-access/activate
//   -> 30 tokens -> 30 days
//
// Optional fractional request:
//   { "tokenAmount": 0.5 }
//   -> 0.5 token -> 12 hours
//
// If a pass is already active, the purchased duration is
// added to the CURRENT expiry instead of replacing it.
// ======================================================

export async function activateSiteAccess(
  userId: string,
  requestedTokenAmount?: unknown
) {
  const config =
    getSiteAccessConfig();


  const tokenAmount =
    normalizeRequestedTokenAmount(
      requestedTokenAmount
    );


  const durationDays =
    tokenAmount *
    config.daysPerToken;


  const durationMs =
    Math.max(
      1,
      Math.round(
        durationDays *
        MS_PER_DAY
      )
    );


  const runTransaction =
    async () => {
      return prisma.$transaction(
        async (tx) => {
          const user =
            await tx.user.findUnique({
              where: {
                id: userId,
              },

              select: {
                role: true,
              },
            });


          if (!user) {
            throw new SiteAccessError(
              "User account was not found.",
              {
                statusCode: 404,
                code:
                  "USER_NOT_FOUND",
              }
            );
          }


          if (
            user.role ===
            UserRole.SUPER_ADMIN
          ) {
            return;
          }


          const now =
            new Date();


          const existingPass =
            await tx.siteAccessPass.findUnique({
              where: {
                userId,
              },
            });


          const existingActive =
            Boolean(
              existingPass &&
              existingPass.endsAt.getTime() >
              now.getTime()
            );


          const startsAt =
            existingActive &&
              existingPass
              ? existingPass.startsAt
              : now;


          const extensionBase =
            existingActive &&
              existingPass
              ? existingPass.endsAt
              : now;


          const endsAt =
            new Date(
              extensionBase.getTime() +
              durationMs
            );


          const tokenAmountDecimal =
            new Prisma.Decimal(
              String(tokenAmount)
            );


          const pass =
            await tx.siteAccessPass.upsert({
              where: {
                userId,
              },

              update: {
                tokensSpent:
                  existingActive
                    ? {
                      increment:
                        tokenAmountDecimal,
                    }
                    : tokenAmountDecimal,

                startsAt,
                endsAt,
              },

              create: {
                userId,

                tokensSpent:
                  tokenAmountDecimal,

                startsAt,
                endsAt,
              },
            });


          await debitTokensInTransaction(
            tx,
            {
              userId,

              amount:
                tokenAmountDecimal,

              featureKey:
                "SITE_ACCESS_PASS",

              referenceId:
                pass.id,

              reason:
                `Activated/extended Anandam access by ${cleanNumber(durationDays)} day(s).`,
            }
          );
        },
        {
          isolationLevel:
            Prisma
              .TransactionIsolationLevel
              .Serializable,
        }
      );
    };


  for (
    let attempt = 0;
    attempt < 3;
    attempt += 1
  ) {
    try {
      await runTransaction();


      return {
        ...(
          await getSiteAccessStatus(
            userId
          )
        ),

        activation: {
          tokensUsed:
            cleanNumber(
              tokenAmount
            ),

          durationDays:
            cleanNumber(
              durationDays
            ),

          durationHours:
            Number(
              (
                durationDays *
                24
              ).toFixed(2)
            ),
        },
      };
    } catch (error) {
      if (
        error instanceof
        SiteAccessError
      ) {
        throw error;
      }


      if (
        error instanceof
        TokenServiceError
      ) {
        throw new SiteAccessError(
          error.message,
          {
            statusCode:
              error.statusCode,

            code:
              error.code,

            details:
              error.details,
          }
        );
      }


      const retryable =
        error instanceof
        Prisma
          .PrismaClientKnownRequestError &&
        error.code ===
        "P2034";


      if (
        retryable &&
        attempt < 2
      ) {
        continue;
      }


      throw error;
    }
  }


  throw new SiteAccessError(
    "Unable to activate site access.",
    {
      statusCode: 500,
      code:
        "SITE_ACCESS_ACTIVATION_FAILED",
    }
  );
}
