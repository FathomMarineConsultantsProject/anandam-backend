import {
  PrismaClient,
  TokenTransactionSource,
  TokenTransactionType,
} from "@prisma/client";


const prisma =
  new PrismaClient();


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
      balance: 0,
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

  return wallet.balance;
}


type CreditTokensInput = {
  userId: string;
  amount: number;

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
  if (
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Token amount must be a positive integer."
    );
  }


  await ensureTokenWallet(
    userId
  );


  return prisma.$transaction(
    async (tx) => {
      const wallet =
        await tx.tokenWallet.findUniqueOrThrow({
          where: {
            userId,
          },
        });


      const updatedWallet =
        await tx.tokenWallet.update({
          where: {
            userId,
          },

          data: {
            balance: {
              increment:
                amount,
            },
          },
        });


      await tx.tokenTransaction.create({
        data: {
          userId,

          type:
            TokenTransactionType.CREDIT,

          source,

          amount,

          balanceBefore:
            wallet.balance,

          balanceAfter:
            updatedWallet.balance,

          reason,

          featureKey,

          referenceId,
        },
      });


      return updatedWallet;
    }
  );
}


type SpendTokensInput = {
  userId: string;

  amount: number;

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
  if (
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Token amount must be a positive integer."
    );
  }


  await ensureTokenWallet(
    userId
  );


  return prisma.$transaction(
    async (tx) => {
      const current =
        await tx.tokenWallet.findUniqueOrThrow({
          where: {
            userId,
          },
        });


      if (
        current.balance <
        amount
      ) {
        throw new Error(
          "INSUFFICIENT_TOKENS"
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
                amount,
            },
          },
        });


      await tx.tokenTransaction.create({
        data: {
          userId,

          type:
            TokenTransactionType.DEBIT,

          source:
            TokenTransactionSource.FEATURE,

          amount,

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
  );
}


type RefundTokensInput = {
  userId: string;

  amount: number;

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
  if (
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Token amount must be a positive integer."
    );
  }


  await ensureTokenWallet(
    userId
  );


  return prisma.$transaction(
    async (tx) => {
      const current =
        await tx.tokenWallet.findUniqueOrThrow({
          where: {
            userId,
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
                amount,
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

          amount,

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
  );
}