import "dotenv/config";

import {
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


  const amount =
    Number(
      rawAmount
    );


  if (
    !Number.isInteger(
      amount
    ) ||
    amount === 0
  ) {
    throw new Error(
      "Amount must be a non-zero integer."
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
        0,
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
          current.balance +
          amount;


        if (
          nextBalance <
          0
        ) {
          throw new Error(
            `Cannot reduce balance below zero. Current balance: ${current.balance}`
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
              amount > 0
                ? TokenTransactionType.CREDIT
                : TokenTransactionType.ADJUSTMENT,

            source:
              TokenTransactionSource.ADMIN,

            amount:
              Math.abs(
                amount
              ),

            balanceBefore:
              current.balance,

            balanceAfter:
              nextBalance,

            reason,
          },
        });


        return wallet;
      }
    );


  console.log(
    "Token balance updated."
  );

  console.log({
    user:
      user.email,

    balance:
      result.balance,
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