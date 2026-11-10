import {
  Prisma,
  PrismaClient,
  TokenTransactionSource,
  TokenTransactionType,
} from "@prisma/client";


const prisma =
  new PrismaClient();


export type TokenAmountInput =
  number |
  string |
  Prisma.Decimal;


export class TokenServiceError extends Error {
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
      "TokenServiceError";

    this.statusCode =
      options.statusCode;

    this.code =
      options.code;

    this.details =
      options.details;
  }
}


export function tokenDecimal(
  value: TokenAmountInput,
  fieldName = "Token amount"
) {
  let amount: Prisma.Decimal;


  try {
    amount =
      new Prisma.Decimal(
        String(value)
      );
  } catch {
    throw new TokenServiceError(
      `${fieldName} must be a valid number.`,
      {
        statusCode: 400,
        code:
          "INVALID_TOKEN_AMOUNT",
      }
    );
  }


  if (
    !amount.isFinite() ||
    amount.lte(0)
  ) {
    throw new TokenServiceError(
      `${fieldName} must be greater than zero.`,
      {
        statusCode: 400,
        code:
          "INVALID_TOKEN_AMOUNT",
      }
    );
  }


  if (
    amount.decimalPlaces() >
    6
  ) {
    throw new TokenServiceError(
      `${fieldName} can have a maximum of 6 decimal places.`,
      {
        statusCode: 400,
        code:
          "INVALID_TOKEN_PRECISION",
      }
    );
  }


  return amount;
}


export function tokenNumber(
  value:
    | Prisma.Decimal
    | number
    | string
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }


  return Number(
    String(value)
  );
}


export async function ensureTokenWallet(
  userId: string
) {
  return prisma.tokenWallet.upsert({
    where: {
      userId,
    },

    update: {},

    create: {
      userId,
      balance:
        new Prisma.Decimal(0),
    },
  });
}


export async function getTokenBalance(
  userId: string
) {
  const wallet =
    await ensureTokenWallet(
      userId
    );


  return tokenNumber(
    wallet.balance
  );
}


export type DebitTokensInput = {
  userId: string;
  amount: TokenAmountInput;
  featureKey: string;
  referenceId?: string;
  reason?: string;
  source?: TokenTransactionSource;
};


export async function debitTokensInTransaction(
  tx: Prisma.TransactionClient,
  {
    userId,
    amount,
    featureKey,
    referenceId,
    reason,
    source =
      TokenTransactionSource.FEATURE,
  }: DebitTokensInput
) {
  const debitAmount =
    tokenDecimal(
      amount
    );


  const current =
    await tx.tokenWallet.upsert({
      where: {
        userId,
      },

      update: {},

      create: {
        userId,
        balance:
          new Prisma.Decimal(0),
      },
    });


  if (
    current.balance.lt(
      debitAmount
    )
  ) {
    const currentBalance =
      tokenNumber(
        current.balance
      );


    throw new TokenServiceError(
      "Insufficient token balance.",
      {
        statusCode: 402,
        code:
          "INSUFFICIENT_TOKENS",

        details: {
          requiredTokens:
            tokenNumber(
              debitAmount
            ),

          currentBalance,

          missingTokens:
            tokenNumber(
              debitAmount.minus(
                current.balance
              )
            ),

          featureKey,
          referenceId,
        },
      }
    );
  }


  const updated =
    await tx.tokenWallet.update({
      where: {
        userId,
      },

      data: {
        balance: {
          decrement:
            debitAmount,
        },
      },
    });


  await tx.tokenTransaction.create({
    data: {
      userId,

      type:
        TokenTransactionType.DEBIT,

      source,

      amount:
        debitAmount,

      balanceBefore:
        current.balance,

      balanceAfter:
        updated.balance,

      featureKey,
      referenceId,
      reason,
    },
  });


  return updated;
}


type CreditTokensInput = {
  userId: string;
  amount: TokenAmountInput;

  source?:
    TokenTransactionSource;

  reason?: string;
  featureKey?: string;
  referenceId?: string;
};


export async function creditTokens({
  userId,
  amount,
  source =
    TokenTransactionSource.ADMIN,
  reason,
  featureKey,
  referenceId,
}: CreditTokensInput) {
  const creditAmount =
    tokenDecimal(
      amount
    );


  return prisma.$transaction(
    async (tx) => {
      const current =
        await tx.tokenWallet.upsert({
          where: {
            userId,
          },

          update: {},

          create: {
            userId,
            balance:
              new Prisma.Decimal(0),
          },
        });


      const updated =
        await tx.tokenWallet.update({
          where: {
            userId,
          },

          data: {
            balance: {
              increment:
                creditAmount,
            },
          },
        });


      await tx.tokenTransaction.create({
        data: {
          userId,

          type:
            TokenTransactionType.CREDIT,

          source,

          amount:
            creditAmount,

          balanceBefore:
            current.balance,

          balanceAfter:
            updated.balance,

          reason,
          featureKey,
          referenceId,
        },
      });


      return updated;
    },
    {
      isolationLevel:
        Prisma.TransactionIsolationLevel
          .Serializable,
    }
  );
}


type SpendTokensInput = {
  userId: string;
  amount: TokenAmountInput;
  featureKey: string;
  referenceId?: string;
  reason?: string;
};


export async function spendTokens({
  userId,
  amount,
  featureKey,
  referenceId,
  reason,
}: SpendTokensInput) {
  return prisma.$transaction(
    async (tx) => {
      return debitTokensInTransaction(
        tx,
        {
          userId,
          amount,
          featureKey,
          referenceId,
          reason,
        }
      );
    },
    {
      isolationLevel:
        Prisma.TransactionIsolationLevel
          .Serializable,
    }
  );
}


type RefundTokensInput = {
  userId: string;
  amount: TokenAmountInput;
  featureKey?: string;
  referenceId?: string;
  reason?: string;
};


export async function refundTokens({
  userId,
  amount,
  featureKey,
  referenceId,
  reason,
}: RefundTokensInput) {
  const refundAmount =
    tokenDecimal(
      amount
    );


  return prisma.$transaction(
    async (tx) => {
      const current =
        await tx.tokenWallet.upsert({
          where: {
            userId,
          },

          update: {},

          create: {
            userId,
            balance:
              new Prisma.Decimal(0),
          },
        });


      const updated =
        await tx.tokenWallet.update({
          where: {
            userId,
          },

          data: {
            balance: {
              increment:
                refundAmount,
            },
          },
        });


      await tx.tokenTransaction.create({
        data: {
          userId,

          type:
            TokenTransactionType.REFUND,

          source:
            TokenTransactionSource.REFUND,

          amount:
            refundAmount,

          balanceBefore:
            current.balance,

          balanceAfter:
            updated.balance,

          featureKey,
          referenceId,
          reason,
        },
      });


      return updated;
    },
    {
      isolationLevel:
        Prisma.TransactionIsolationLevel
          .Serializable,
    }
  );
}
