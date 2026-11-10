import {
  Prisma,
  PrismaClient,
  TokenTransactionSource,
  TokenTransactionType,
  UserRole,
} from "@prisma/client";


const prisma =
  new PrismaClient();


const MS_PER_DAY =
  24 * 60 * 60 * 1000;


// ======================================================
// CONFIG
// ======================================================

function positiveIntegerFromEnv(
  value: string | undefined,
  fallback: number
) {
  const parsed =
    Number(value);


  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return fallback;
  }


  return parsed;
}


export function getSiteAccessConfig() {
  const tokenCost =
    positiveIntegerFromEnv(
      process.env
        .SITE_ACCESS_TOKEN_COST,
      5
    );


  const durationDays =
    positiveIntegerFromEnv(
      process.env
        .SITE_ACCESS_DURATION_DAYS,
      30
    );


  return {
    tokenCost,
    durationDays,
  };
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
    super(
      message
    );


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


  // Practitioner and admin accounts
  // are not restricted by USER subscription.
  if (
    user.role !==
    UserRole.USER
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
          balance: 0,
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
        statusCode:
          404,

        code:
          "USER_NOT_FOUND",
      }
    );
  }


  const roleBypass =
    user.role !==
    UserRole.USER;


  const passActive =
    Boolean(
      pass &&
      pass.endsAt.getTime() >
        now.getTime()
    );


  const active =
    roleBypass ||
    passActive;


  let daysRemaining =
    0;


  if (
    passActive &&
    pass
  ) {
    daysRemaining =
      Math.max(
        1,
        Math.ceil(
          (
            pass.endsAt.getTime() -
            now.getTime()
          ) /
          MS_PER_DAY
        )
      );
  }


  return {
    active,

    accessType:
      roleBypass
        ? "ROLE_BYPASS"
        : passActive
          ? "SITE_ACCESS_PASS"
          : "NONE",

    startsAt:
      passActive &&
      pass
        ? pass.startsAt
        : null,

    endsAt:
      passActive &&
      pass
        ? pass.endsAt
        : null,

    daysRemaining,

    tokenCost:
      config.tokenCost,

    durationDays:
      config.durationDays,

    tokenBalance:
      wallet.balance,

    canActivate:
      !active &&
      wallet.balance >=
        config.tokenCost,

    missingTokens:
      active
        ? 0
        : Math.max(
            0,
            config.tokenCost -
              wallet.balance
          ),

    // These are intentionally accessible
    // without the 30-day site subscription.
    freeAccess: {
      dashboard:
        true,

      blogs:
        true,

      wellbeingQuestionnaires:
        true,

      psychometrics:
        true,

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
// ACTIVATE SITE ACCESS
//
// 5 tokens -> 30 days by default.
//
// Deduction + transaction history + access pass
// happen atomically.
// ======================================================

export async function activateSiteAccess(
  userId: string
) {
  const config =
    getSiteAccessConfig();


  const runTransaction =
    async () => {
      return prisma.$transaction(
        async (
          tx
        ) => {
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
                statusCode:
                  404,

                code:
                  "USER_NOT_FOUND",
              }
            );
          }


          // Practitioner / admin accounts
          // never need to buy USER access.
          if (
            user.role !==
            UserRole.USER
          ) {
            return;
          }


          const now =
            new Date();


          const existingPass =
            await tx
              .siteAccessPass
              .findUnique({
                where: {
                  userId,
                },
              });


          // Already active:
          // do NOT charge again.
          if (
            existingPass &&
            existingPass
              .endsAt
              .getTime() >
              now.getTime()
          ) {
            return;
          }


          const wallet =
            await tx
              .tokenWallet
              .upsert({
                where: {
                  userId,
                },

                update: {},

                create: {
                  userId,
                  balance: 0,
                },
              });


          if (
            wallet.balance <
            config.tokenCost
          ) {
            throw new SiteAccessError(
              `You need ${config.tokenCost} tokens to activate ${config.durationDays} days of Anandam access.`,
              {
                statusCode:
                  402,

                code:
                  "INSUFFICIENT_TOKENS",

                details: {
                  requiredTokens:
                    config.tokenCost,

                  currentBalance:
                    wallet.balance,

                  missingTokens:
                    config.tokenCost -
                    wallet.balance,

                  durationDays:
                    config.durationDays,
                },
              }
            );
          }


          const startsAt =
            now;


          const endsAt =
            new Date(
              startsAt.getTime() +
              (
                config.durationDays *
                MS_PER_DAY
              )
            );


          const updatedWallet =
            await tx
              .tokenWallet
              .update({
                where: {
                  userId,
                },

                data: {
                  balance: {
                    decrement:
                      config.tokenCost,
                  },
                },
              });


          const pass =
            await tx
              .siteAccessPass
              .upsert({
                where: {
                  userId,
                },

                update: {
                  tokensSpent:
                    config.tokenCost,

                  startsAt,
                  endsAt,
                },

                create: {
                  userId,

                  tokensSpent:
                    config.tokenCost,

                  startsAt,
                  endsAt,
                },
              });


          await tx
            .tokenTransaction
            .create({
              data: {
                userId,

                type:
                  TokenTransactionType.DEBIT,

                source:
                  TokenTransactionSource.FEATURE,

                amount:
                  config.tokenCost,

                balanceBefore:
                  wallet.balance,

                balanceAfter:
                  updatedWallet.balance,

                featureKey:
                  "SITE_ACCESS_PASS",

                referenceId:
                  pass.id,

                reason:
                  `Activated Anandam access for ${config.durationDays} days.`,
              },
            });
        },

        {
          isolationLevel:
            Prisma
              .TransactionIsolationLevel
              .Serializable,
        }
      );
    };


  // Protect against double-click /
  // simultaneous activation requests.
  for (
    let attempt = 0;
    attempt < 3;
    attempt += 1
  ) {
    try {
      await runTransaction();


      return getSiteAccessStatus(
        userId
      );
    } catch (
      error
    ) {
      if (
        error instanceof
        SiteAccessError
      ) {
        throw error;
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
      statusCode:
        500,

      code:
        "SITE_ACCESS_ACTIVATION_FAILED",
    }
  );
}