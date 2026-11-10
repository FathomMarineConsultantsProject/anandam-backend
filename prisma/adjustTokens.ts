import "dotenv/config";

import {
  Prisma,
  PrismaClient,
  TokenTransactionSource,
  TokenTransactionType,
} from "@prisma/client";


const prisma =
  new PrismaClient();


async function main() {
  const email =
    process.argv[2]
      ?.trim()
      .toLowerCase();

  const rawAmount =
    process.argv[3];

  const reason =
    process.argv
      .slice(4)
      .join(" ")
      .trim() ||
    "Manual token adjustment";


  if (
    !email ||
    !rawAmount
  ) {
    throw new Error(
      "Usage: npx tsx prisma/adjustTokens.ts <email> <amount> [reason]"
    );
  }


  let amount:
    Prisma.Decimal;


  try {
    amount =
      new Prisma.Decimal(
        rawAmount
      );
  } catch {
    throw new Error(
      "Amount must be a valid number."
    );
  }


  if (
    !amount.isFinite() ||
    amount.isZero()
  ) {
    throw new Error(
      "Amount must be a non-zero number."
    );
  }


  if (
    amount.decimalPlaces() >
    6
  ) {
    throw new Error(
      "Amount can have a maximum of 6 decimal places."
    );
  }


  const user =
    await prisma.user.findFirst({
      where: {
        email: {
          equals:
            email,

          mode:
            "insensitive",
        },
      },

      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });


  if (!user) {
    throw new Error(
      "User not found."
    );
  }


  await prisma.tokenWallet.upsert({
    where: {
      userId:
        user.id,
    },

    update: {},

    create: {
      userId:
        user.id,

      balance:
        new Prisma.Decimal(0),
    },
  });


  const result =
    await prisma.$transaction(
      async (tx) => {
        const current =
          await tx.tokenWallet.findUniqueOrThrow({
            where: {
              userId:
                user.id,
            },
          });


        const nextBalance =
          current.balance.plus(
            amount
          );


        if (
          nextBalance.lt(0)
        ) {
          throw new Error(
            `Cannot reduce balance below zero. Current balance: ${current.balance.toString()}`
          );
        }


        const wallet =
          await tx.tokenWallet.update({
            where: {
              userId:
                user.id,
            },

            data: {
              balance:
                nextBalance,
            },
          });


        await tx.tokenTransaction.create({
          data: {
            userId:
              user.id,

            type:
              amount.gt(0)
                ? TokenTransactionType.CREDIT
                : TokenTransactionType.ADJUSTMENT,

            source:
              TokenTransactionSource.ADMIN,

            amount:
              amount.abs(),

            balanceBefore:
              current.balance,

            balanceAfter:
              nextBalance,

            reason,
          },
        });


        return wallet;
      },
      {
        isolationLevel:
          Prisma
            .TransactionIsolationLevel
            .Serializable,
      }
    );


  console.log(
    "Token balance updated."
  );

  console.log({
    user:
      user.email,

    balance:
      Number(
        result.balance.toString()
      ),
  });
}


main()
  .catch(
    (error) => {
      console.error(
        error
      );

      process.exit(1);
    }
  )
  .finally(
    async () => {
      await prisma.$disconnect();
    }
  );
