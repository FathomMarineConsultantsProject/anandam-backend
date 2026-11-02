import {
  Prisma,
  PrismaClient,
  PsychometricAttemptStatus,
  PsychometricQuestionType,
  PsychometricSectionCode,
  PsychometricTestType,
  TokenTransactionSource,
  TokenTransactionType,
} from "@prisma/client";


const prisma =
  new PrismaClient();

  
export class PsychometricError
  extends Error {
  statusCode: number;

  code: string;

  details?: Record<
    string,
    unknown
  >;


  constructor(
    message: string,
    statusCode = 400,
    code =
      "PSYCHOMETRIC_ERROR",
    details?: Record<
      string,
      unknown
    >
  ) {
    super(message);

    this.name =
      "PsychometricError";

    this.statusCode =
      statusCode;

    this.code =
      code;

    this.details =
      details;
  }
}


function shuffle<T>(
  items: T[]
) {
  const copy =
    [...items];

  for (
    let index =
      copy.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(
        Math.random() *
        (index + 1)
      );

    [
      copy[index],
      copy[randomIndex],
    ] = [
        copy[randomIndex],
        copy[index],
      ];
  }

  return copy;
}


function sanitizeQuestion(
  question: any
) {
  if (
    question.questionType ===
    PsychometricQuestionType.LIKERT_5
  ) {
    return {
      id:
        question.id,

      itemCode:
        question.itemCode,

      questionText:
        question.questionText,

      questionType:
        question.questionType,

      traitKey:
        question.traitKey,

      reverseScored:
        question.reverseScored,

      domain:
        question.domain,

      competency:
        question.competency,

      options: [
        {
          value: 1,
          label:
            "Strongly Disagree",
        },
        {
          value: 2,
          label:
            "Disagree",
        },
        {
          value: 3,
          label:
            "Neutral",
        },
        {
          value: 4,
          label:
            "Agree",
        },
        {
          value: 5,
          label:
            "Strongly Agree",
        },
      ],
    };
  }


  return {
    id:
      question.id,

    itemCode:
      question.itemCode,

    domain:
      question.domain,

    competency:
      question.competency,

    questionText:
      question.questionText,

    questionType:
      question.questionType,

    // Keep these because the current FE
    // PsychometricQuestion component uses them.
    optionA:
      question.optionA,

    optionB:
      question.optionB,

    optionC:
      question.optionC,

    optionD:
      question.optionD,

    // Also provide a normalized array.
    options: [
      {
        value: "A",
        key: "A",
        label:
          question.optionA,
        text:
          question.optionA,
      },
      {
        value: "B",
        key: "B",
        label:
          question.optionB,
        text:
          question.optionB,
      },
      {
        value: "C",
        key: "C",
        label:
          question.optionC,
        text:
          question.optionC,
      },
      {
        value: "D",
        key: "D",
        label:
          question.optionD,
        text:
          question.optionD,
      },
    ].filter(
      (option) =>
        Boolean(
          option.label
        )
    ),
  };
}


async function getWalletBalance(
  userId: string
) {
  const wallet =
    await prisma.tokenWallet
      .findUnique({
        where: {
          userId,
        },
      });

  return wallet?.balance ?? 0;
}


async function debitTokens(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  featureKey: string,
  referenceId: string
) {
  if (
    amount <= 0
  ) {
    return;
  }

  const wallet =
    await tx.tokenWallet
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
    amount
  ) {
    throw new PsychometricError(
      `You need ${amount} token${amount === 1
        ? ""
        : "s"
      } to take this assessment again.`,

      402,

      "PSYCHOMETRIC_PAYMENT_REQUIRED",

      {
        requiredTokens:
          amount,

        walletBalance:
          wallet.balance,

        featureKey,

        referenceId,
      }
    );
  }

  const updatedWallet =
    await tx.tokenWallet
      .update({
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

  await tx.tokenTransaction
    .create({
      data: {
        userId,
        type:
          TokenTransactionType.DEBIT,
        source:
          TokenTransactionSource.FEATURE,
        amount,
        balanceBefore:
          wallet.balance,
        balanceAfter:
          updatedWallet.balance,
        featureKey,
        referenceId,
        reason:
          "Psychometric assessment repeat attempt",
      },
    });
}


async function selectMaritimeQuestions(
  tx: Prisma.TransactionClient,
  testId: string
) {
  const sections =
    await tx.psychometricSection
      .findMany({
        where: {
          testId,
        },
        orderBy: {
          sortOrder:
            "asc",
        },
      });

  const selectedResult: Array<{
    questionId: string;
    sectionCode: PsychometricSectionCode;
    questionOrder: number;
  }> = [];

  let globalOrder =
    1;

  for (
    const section
    of sections
  ) {
    const questions =
      await tx.psychometricQuestion
        .findMany({
          where: {
            testId,
            sectionId:
              section.id,
            isActive:
              true,
          },
        });

    if (
      questions.length <
      section.questionsPerAttempt
    ) {
      throw new PsychometricError(
        `Not enough active questions for ${section.code}.`,
        500
      );
    }

    const byDomain =
      new Map<
        string,
        typeof questions
      >();

    for (
      const question
      of questions
    ) {
      const domain =
        question.domain ||
        "OTHER";

      const pool =
        byDomain.get(
          domain
        ) || [];

      pool.push(
        question
      );

      byDomain.set(
        domain,
        pool
      );
    }

    const selected:
      typeof questions =
      [];

    const domains =
      shuffle(
        Array.from(
          byDomain.keys()
        )
      );

    // Pick one question from as many domains as possible first.
    for (
      const domain
      of domains
    ) {
      if (
        selected.length >=
        section.questionsPerAttempt
      ) {
        break;
      }

      const pool =
        shuffle(
          byDomain.get(
            domain
          ) || []
        );

      if (
        pool[0]
      ) {
        selected.push(
          pool[0]
        );
      }
    }

    // Fill remaining slots randomly from questions not already selected.
    const selectedIds =
      new Set(
        selected.map(
          (question) =>
            question.id
        )
      );

    const remaining =
      shuffle(
        questions.filter(
          (question) =>
            !selectedIds.has(
              question.id
            )
        )
      );

    while (
      selected.length <
      section.questionsPerAttempt
    ) {
      const question =
        remaining.shift();

      if (
        !question
      ) {
        break;
      }

      selected.push(
        question
      );
    }

    for (
      const question
      of shuffle(
        selected
      )
    ) {
      selectedResult.push({
        questionId:
          question.id,
        sectionCode:
          section.code,
        questionOrder:
          globalOrder,
      });

      globalOrder += 1;
    }
  }

  return selectedResult;
}


async function finishMaritimeAttempt(
  tx: Prisma.TransactionClient,
  attemptId: string
) {
  const questions =
    await tx.psychometricAttemptQuestion
      .findMany({
        where: {
          attemptId,
        },
      });

  const score =
    questions.reduce(
      (
        total,
        question
      ) =>
        total +
        (question.pointsAwarded || 0),
      0
    );

  const maxScore =
    questions.length;

  const percentage =
    maxScore > 0
      ? Number(
        (
          (score / maxScore) *
          100
        ).toFixed(2)
      )
      : 0;

  await tx.psychometricAttempt
    .update({
      where: {
        id:
          attemptId,
      },
      data: {
        status:
          PsychometricAttemptStatus.COMPLETED,
        completedAt:
          new Date(),
        score,
        maxScore,
        percentage,
      },
    });
}


export async function listPsychometricTests(
  userId: string
) {
  const [
    tests,
    walletBalance,
  ] =
    await Promise.all([
      prisma.psychometricTest
        .findMany({
          where: {
            isActive:
              true,
          },

          include: {
            sections: {
              orderBy: {
                sortOrder:
                  "asc",
              },
            },

            _count: {
              select: {
                questions:
                  true,
              },
            },
          },

          orderBy: {
            sortOrder:
              "asc",
          },
        }),

      getWalletBalance(
        userId
      ),
    ]);


  const attempts =
    await prisma.psychometricAttempt
      .findMany({
        where: {
          userId,
        },

        select: {
          id:
            true,

          testId:
            true,

          status:
            true,

          attemptNumber:
            true,

          startedAt:
            true,
        },

        orderBy: {
          startedAt:
            "desc",
        },
      });


  return {
    walletBalance,

    tests:
      tests.map(
        (test) => {
          const testAttempts =
            attempts.filter(
              (attempt) =>
                attempt.testId ===
                test.id
            );


          const completedCount =
            testAttempts.filter(
              (attempt) =>
                attempt.status ===
                PsychometricAttemptStatus.COMPLETED
            ).length;


          const activeAttempt =
            testAttempts.find(
              (attempt) =>
                attempt.status ===
                PsychometricAttemptStatus.IN_PROGRESS
            ) ||
            null;


          const firstAttemptUsed =
            completedCount >
            0;


          const nextAttemptFree =
            test.firstAttemptFree &&
            completedCount ===
            0;


          const paymentRequired =
            !activeAttempt &&
            !nextAttemptFree &&
            test.repeatTokenCost >
            0;


          return {
            id:
              test.id,

            code:
              test.code,

            title:
              test.title,

            description:
              test.description,

            type:
              test.type,

            firstAttemptFree:
              test.firstAttemptFree,

            repeatTokenCost:
              test.repeatTokenCost,

            attemptCount:
              testAttempts.length,

            completedAttemptCount:
              completedCount,

            firstAttemptUsed,

            nextAttemptFree,

            activeAttemptId:
              activeAttempt?.id ||
              null,

            canResume:
              Boolean(
                activeAttempt
              ),

            paymentRequired,

            requiredTokens:
              paymentRequired
                ? test.repeatTokenCost
                : 0,

            hasEnoughTokens:
              !paymentRequired ||
              walletBalance >=
              test.repeatTokenCost,

            walletBalance,

            questionCount:
              test._count.questions,

            sections:
              test.sections,

            // Compatibility with current FE.
            eligibility: {
              attemptCount:
                testAttempts.length,

              completedAttemptCount:
                completedCount,

              firstAttemptUsed,

              nextAttemptFree,

              repeatTokenCost:
                test.repeatTokenCost,

              paymentRequired,

              requiredTokens:
                paymentRequired
                  ? test.repeatTokenCost
                  : 0,

              walletBalance,

              hasEnoughTokens:
                !paymentRequired ||
                walletBalance >=
                test.repeatTokenCost,

              activeAttemptId:
                activeAttempt?.id ||
                null,

              canResume:
                Boolean(
                  activeAttempt
                ),
            },
          };
        }
      ),
  };
}


export async function getPsychometricTest(
  userId: string,
  code: string
) {
  const test =
    await prisma.psychometricTest
      .findUnique({
        where: {
          code,
        },

        include: {
          sections: {
            orderBy: {
              sortOrder:
                "asc",
            },
          },

          _count: {
            select: {
              questions:
                true,
            },
          },
        },
      });


  if (
    !test ||
    !test.isActive
  ) {
    throw new PsychometricError(
      "Assessment not found.",
      404,
      "ASSESSMENT_NOT_FOUND"
    );
  }


  const attempts =
    await prisma.psychometricAttempt
      .findMany({
        where: {
          userId,

          testId:
            test.id,
        },

        select: {
          id:
            true,

          status:
            true,

          attemptNumber:
            true,

          startedAt:
            true,
        },

        orderBy: {
          startedAt:
            "desc",
        },
      });


  const completedAttemptCount =
    attempts.filter(
      (attempt) =>
        attempt.status ===
        PsychometricAttemptStatus.COMPLETED
    ).length;


  const activeAttempt =
    attempts.find(
      (attempt) =>
        attempt.status ===
        PsychometricAttemptStatus.IN_PROGRESS
    ) ||
    null;


  const walletBalance =
    await getWalletBalance(
      userId
    );


  const firstAttemptUsed =
    completedAttemptCount >
    0;


  const nextAttemptFree =
    test.firstAttemptFree &&
    completedAttemptCount ===
    0;


  const paymentRequired =
    !activeAttempt &&
    !nextAttemptFree &&
    test.repeatTokenCost >
    0;


  return {
    id:
      test.id,

    code:
      test.code,

    title:
      test.title,

    description:
      test.description,

    type:
      test.type,

    firstAttemptFree:
      test.firstAttemptFree,

    repeatTokenCost:
      test.repeatTokenCost,

    attemptCount:
      attempts.length,

    completedAttemptCount,

    firstAttemptUsed,

    nextAttemptFree,

    activeAttemptId:
      activeAttempt?.id ||
      null,

    canResume:
      Boolean(
        activeAttempt
      ),

    paymentRequired,

    requiredTokens:
      paymentRequired
        ? test.repeatTokenCost
        : 0,

    hasEnoughTokens:
      !paymentRequired ||
      walletBalance >=
      test.repeatTokenCost,

    walletBalance,

    questionCount:
      test._count.questions,

    sections:
      test.sections,

    eligibility: {
      attemptCount:
        attempts.length,

      completedAttemptCount,

      firstAttemptUsed,

      nextAttemptFree,

      repeatTokenCost:
        test.repeatTokenCost,

      paymentRequired,

      requiredTokens:
        paymentRequired
          ? test.repeatTokenCost
          : 0,

      walletBalance,

      hasEnoughTokens:
        !paymentRequired ||
        walletBalance >=
        test.repeatTokenCost,

      activeAttemptId:
        activeAttempt?.id ||
        null,

      canResume:
        Boolean(
          activeAttempt
        ),

      nextAttemptNumber:
        attempts.length +
        1,
    },
  };
}


export async function startPsychometricAttempt(
  userId: string,
  testCode: string,
  confirmTokenSpend = false
) {
  // =====================================================
  // 1. LOAD TEST
  // =====================================================

  const test =
    await prisma.psychometricTest.findUnique({
      where: {
        code: testCode,
      },

      include: {
        sections: {
          orderBy: {
            sortOrder:
              "asc",
          },
        },
      },
    });


  if (
    !test ||
    !test.isActive
  ) {
    throw new PsychometricError(
      "Assessment not found.",
      404
    );
  }


  // =====================================================
  // 2. RESUME EXISTING ACTIVE ATTEMPT
  //
  // IMPORTANT:
  // Never charge tokens again when simply resuming
  // an assessment that has already been started.
  // =====================================================

  const existing =
    await prisma.psychometricAttempt.findFirst({
      where: {
        userId,

        testId:
          test.id,

        status:
          PsychometricAttemptStatus.IN_PROGRESS,
      },

      orderBy: {
        startedAt:
          "desc",
      },
    });


  if (existing) {
    return getPsychometricAttempt(
      userId,
      existing.id
    );
  }


  // =====================================================
  // 3. CREATE NEW ATTEMPT INSIDE TRANSACTION
  //
  // First attempt:
  //   free -> create immediately
  //
  // Repeat attempt:
  //   first request -> return token information
  //   confirmed request -> deduct tokens + create attempt
  // =====================================================

  const outcome =
    await prisma.$transaction(
      async (tx) => {
        // -----------------------------------------------
        // Count previous attempts
        // -----------------------------------------------

        const previousCount =
          await tx.psychometricAttempt.count({
            where: {
              userId,

              testId:
                test.id,
            },
          });


        const attemptNumber =
          previousCount + 1;


        // -----------------------------------------------
        // Decide whether this attempt is free
        // -----------------------------------------------

        const freeAttempt =
          test.firstAttemptFree &&
          previousCount === 0;


        const tokenCost =
          freeAttempt
            ? 0
            : Number(
                test.repeatTokenCost ||
                  0
              );


        // -----------------------------------------------
        // Load user's current token balance
        // -----------------------------------------------

        const wallet =
          await tx.tokenWallet.findUnique({
            where: {
              userId,
            },
          });


        const walletBalance =
          wallet?.balance ??
          0;


        // =================================================
        // TOKEN CONFIRMATION REQUIRED
        //
        // Do NOT create attempt.
        // Do NOT deduct tokens.
        //
        // Frontend will show popup from this response.
        // =================================================

        if (
          tokenCost > 0 &&
          !confirmTokenSpend
        ) {
          return {
            paymentRequired:
              true as const,

            requiredTokens:
              tokenCost,

            walletBalance,

            hasEnoughTokens:
              walletBalance >=
              tokenCost,

            attemptNumber,

            testCode:
              test.code,

            testTitle:
              test.title,
          };
        }


        // =================================================
        // USER CONFIRMED BUT DOES NOT HAVE ENOUGH TOKENS
        //
        // Still do NOT create anything.
        // =================================================

        if (
          tokenCost > 0 &&
          confirmTokenSpend &&
          walletBalance <
            tokenCost
        ) {
          return {
            paymentRequired:
              true as const,

            requiredTokens:
              tokenCost,

            walletBalance,

            hasEnoughTokens:
              false,

            attemptNumber,

            testCode:
              test.code,

            testTitle:
              test.title,
          };
        }


        // =================================================
        // CREATE ATTEMPT
        // =================================================

        const created =
          await tx.psychometricAttempt.create({
            data: {
              userId,

              testId:
                test.id,

              attemptNumber,

              status:
                PsychometricAttemptStatus.IN_PROGRESS,

              tokenCost,

              usedFreeAttempt:
                freeAttempt,
            },
          });


        // =================================================
        // DEDUCT TOKENS
        //
        // Only happens AFTER:
        // - repeat attempt detected
        // - user explicitly confirmed
        // - sufficient balance confirmed
        //
        // If anything below fails, transaction rolls back.
        // =================================================

        if (
          tokenCost > 0
        ) {
          await debitTokens(
            tx,
            userId,
            tokenCost,
            `psychometric:${test.code}`,
            created.id
          );
        }


        // =================================================
        // MARITIME HUMAN PERFORMANCE
        // =================================================

        if (
          test.type ===
          PsychometricTestType.MARITIME_HUMAN_PERFORMANCE
        ) {
          const selected =
            await selectMaritimeQuestions(
              tx,
              test.id
            );


          await tx.psychometricAttemptQuestion.createMany({
            data:
              selected.map(
                (item) => ({
                  attemptId:
                    created.id,

                  questionId:
                    item.questionId,

                  sectionCode:
                    item.sectionCode,

                  questionOrder:
                    item.questionOrder,
                })
              ),
          });


          await tx.psychometricAttemptSection.createMany({
            data:
              test.sections.map(
                (section) => ({
                  attemptId:
                    created.id,

                  sectionId:
                    section.id,
                })
              ),
          });
        }

        // =================================================
        // PERSONALITY / BEHAVIOURAL / MOTIVATION
        // =================================================

        else {
          const questions =
            await tx.psychometricQuestion.findMany({
              where: {
                testId:
                  test.id,

                isActive:
                  true,
              },

              orderBy: {
                sortOrder:
                  "asc",
              },
            });


          if (
            questions.length ===
            0
          ) {
            throw new PsychometricError(
              "No active questions are available for this assessment.",
              500
            );
          }


          await tx.psychometricAttemptQuestion.createMany({
            data:
              questions.map(
                (
                  question,
                  index
                ) => ({
                  attemptId:
                    created.id,

                  questionId:
                    question.id,

                  questionOrder:
                    index + 1,
                })
              ),
          });
        }


        return {
          paymentRequired:
            false as const,

          attemptId:
            created.id,
        };
      }
    );


  // =====================================================
  // 4. PAYMENT/TOKEN INFORMATION RESPONSE
  // =====================================================

  if (
    outcome.paymentRequired
  ) {
    return outcome;
  }


  // =====================================================
  // 5. RETURN COMPLETE CREATED ATTEMPT
  // =====================================================

  return getPsychometricAttempt(
    userId,
    outcome.attemptId
  );
}


export async function getPsychometricAttempt(
  userId: string,
  attemptId: string
) {
  const attempt =
    await prisma.psychometricAttempt
      .findFirst({
        where: {
          id:
            attemptId,
          userId,
        },
        include: {
          test: {
            include: {
              sections: {
                orderBy: {
                  sortOrder:
                    "asc",
                },
              },
            },
          },
          sections: {
            include: {
              section:
                true,
            },
          },
          questions: {
            include: {
              question:
                true,
            },
            orderBy: {
              questionOrder:
                "asc",
            },
          },
        },
      });

  if (!attempt) {
    throw new PsychometricError(
      "Assessment attempt not found.",
      404
    );
  }

  const sections =
    [...attempt.sections]
      .sort(
        (
          a,
          b
        ) =>
          a.section.sortOrder -
          b.section.sortOrder
      )
      .map(
        (item) => ({
          id:
            item.id,
          code:
            item.section.code,
          title:
            item.section.title,
          durationMinutes:
            item.section.durationMinutes,
          questionsPerAttempt:
            item.section.questionsPerAttempt,
          startedAt:
            item.startedAt,
          expiresAt:
            item.expiresAt,
          submittedAt:
            item.submittedAt,
          locked:
            Boolean(
              item.lockedAt
            ),
          score:
            attempt.status ===
              PsychometricAttemptStatus.COMPLETED
              ? item.score
              : undefined,
          maxScore:
            attempt.status ===
              PsychometricAttemptStatus.COMPLETED
              ? item.maxScore
              : undefined,
        })
      );

  return {
    id:
      attempt.id,
    attemptNumber:
      attempt.attemptNumber,
    status:
      attempt.status,
    tokenCost:
      attempt.tokenCost,
    usedFreeAttempt:
      attempt.usedFreeAttempt,
    startedAt:
      attempt.startedAt,
    completedAt:
      attempt.completedAt,
    score:
      attempt.status ===
        PsychometricAttemptStatus.COMPLETED
        ? attempt.score
        : undefined,
    maxScore:
      attempt.status ===
        PsychometricAttemptStatus.COMPLETED
        ? attempt.maxScore
        : undefined,
    percentage:
      attempt.status ===
        PsychometricAttemptStatus.COMPLETED
        ? attempt.percentage
        : undefined,
    test: {
      id:
        attempt.test.id,
      code:
        attempt.test.code,
      title:
        attempt.test.title,
      description:
        attempt.test.description,
      type:
        attempt.test.type,
    },
    sections,
    questions:
      attempt.questions.map(
        (item) => {
          const safeQuestion =
            sanitizeQuestion(
              item.question
            );

          return {
            // ID of PsychometricAttemptQuestion
            id:
              item.id,

            attemptQuestionId:
              item.id,

            // ID of original PsychometricQuestion
            questionId:
              item.questionId,

            questionOrder:
              item.questionOrder,

            sectionCode:
              item.sectionCode,

            selectedOption:
              item.selectedOption,

            likertValue:
              item.likertValue,

            answeredAt:
              item.answeredAt,

            // -------------------------------
            // FLAT FORMAT
            // -------------------------------

            ...safeQuestion,

            // -------------------------------
            // NESTED FORMAT
            // backwards compatibility
            // -------------------------------

            question:
              safeQuestion,
          };
        }
      ),
  };
}


export async function startPsychometricSection(
  userId: string,
  attemptId: string,
  sectionCode: PsychometricSectionCode
) {
  const attempt =
    await prisma.psychometricAttempt
      .findFirst({
        where: {
          id:
            attemptId,

          userId,

          status:
            PsychometricAttemptStatus.IN_PROGRESS,
        },

        include: {
          test:
            true,

          sections: {
            include: {
              section:
                true,
            },
          },

          questions: {
            include: {
              question:
                true,
            },

            orderBy: {
              questionOrder:
                "asc",
            },
          },
        },
      });


  if (!attempt) {
    throw new PsychometricError(
      "Active assessment attempt not found.",
      404,
      "ATTEMPT_NOT_FOUND"
    );
  }


  if (
    attempt.test.type !==
    PsychometricTestType.MARITIME_HUMAN_PERFORMANCE
  ) {
    throw new PsychometricError(
      "This assessment does not use timed sections.",
      400,
      "INVALID_ASSESSMENT_TYPE"
    );
  }


  const ordered =
    [...attempt.sections].sort(
      (
        a,
        b
      ) =>
        a.section.sortOrder -
        b.section.sortOrder
    );


  const currentIndex =
    ordered.findIndex(
      (item) =>
        item.section.code ===
        sectionCode
    );


  if (
    currentIndex === -1
  ) {
    throw new PsychometricError(
      "Section not found.",
      404,
      "SECTION_NOT_FOUND"
    );
  }


  for (
    let index = 0;
    index < currentIndex;
    index += 1
  ) {
    if (
      !ordered[index]
        .submittedAt
    ) {
      throw new PsychometricError(
        `Complete ${ordered[index].section.title} before starting this section.`,
        409,
        "PREVIOUS_SECTION_NOT_COMPLETED"
      );
    }
  }


  const current =
    ordered[
    currentIndex
    ];


  if (
    current.submittedAt ||
    current.lockedAt
  ) {
    throw new PsychometricError(
      "This section has already been submitted and is locked.",
      409,
      "SECTION_LOCKED"
    );
  }


  let startedAt =
    current.startedAt;

  let expiresAt =
    current.expiresAt;


  if (!startedAt) {
    startedAt =
      new Date();

    expiresAt =
      new Date(
        startedAt.getTime() +
        current.section
          .durationMinutes *
        60 *
        1000
      );


    await prisma
      .psychometricAttemptSection
      .update({
        where: {
          id:
            current.id,
        },

        data: {
          startedAt,
          expiresAt,
        },
      });
  }


  const sectionQuestions =
    attempt.questions
      .filter(
        (item) =>
          item.sectionCode ===
          sectionCode
      )
      .map(
        (item) => {
          const safeQuestion =
            sanitizeQuestion(
              item.question
            );

          return {
            id:
              item.id,

            attemptQuestionId:
              item.id,

            questionId:
              item.questionId,

            questionOrder:
              item.questionOrder,

            sectionCode:
              item.sectionCode,

            selectedOption:
              item.selectedOption,

            likertValue:
              item.likertValue,

            answeredAt:
              item.answeredAt,

            ...safeQuestion,

            question:
              safeQuestion,
          };
        }
      );


  if (
    sectionQuestions.length ===
    0
  ) {
    throw new PsychometricError(
      "No questions were assigned to this assessment section.",
      500,
      "SECTION_QUESTIONS_MISSING",
      {
        sectionCode,
        attemptId,
      }
    );
  }


  return {
    sectionCode,

    title:
      current.section.title,

    durationMinutes:
      current.section
        .durationMinutes,

    questionsPerAttempt:
      current.section
        .questionsPerAttempt,

    startedAt,

    expiresAt,

    serverTime:
      new Date(),

    questions:
      sectionQuestions,

    section: {
      code:
        sectionCode,

      title:
        current.section.title,

      durationMinutes:
        current.section
          .durationMinutes,

      questionsPerAttempt:
        current.section
          .questionsPerAttempt,

      startedAt,

      expiresAt,

      serverTime:
        new Date(),

      questions:
        sectionQuestions,
    },
  };
}


type AnswerPayload = {
  attemptQuestionId?: string;
  questionId?: string;
  selectedOption?: string;
  likertValue?: number;
};


export async function savePsychometricAnswers(
  userId: string,
  attemptId: string,
  answers: AnswerPayload[]
) {
  const attempt =
    await prisma.psychometricAttempt
      .findFirst({
        where: {
          id:
            attemptId,
          userId,
          status:
            PsychometricAttemptStatus.IN_PROGRESS,
        },
        include: {
          test:
            true,
          sections: {
            include: {
              section:
                true,
            },
          },
          questions: {
            include: {
              question:
                true,
            },
          },
        },
      });

  if (!attempt) {
    throw new PsychometricError(
      "Active assessment attempt not found.",
      404
    );
  }

  const questionMapByAttemptQuestionId =
    new Map(
      attempt.questions.map(
        (question) => [
          question.id,
          question,
        ]
      )
    );


  const questionMapByQuestionId =
    new Map(
      attempt.questions.map(
        (question) => [
          question.questionId,
          question,
        ]
      )
    );

  await prisma.$transaction(
    async (tx) => {
      for (
        const answer
        of answers
      ) {

        const attemptQuestion =
          (
            answer.attemptQuestionId
              ? questionMapByAttemptQuestionId.get(
                answer.attemptQuestionId
              )
              : undefined
          ) ||
          (
            answer.questionId
              ? questionMapByQuestionId.get(
                answer.questionId
              )
              : undefined
          );


        if (!attemptQuestion) {
          throw new PsychometricError(
            "One or more questions do not belong to this assessment."
          );
        }

        if (
          attempt.test.type ===
          PsychometricTestType.MARITIME_HUMAN_PERFORMANCE
        ) {
          if (
            !attemptQuestion.sectionCode
          ) {
            throw new PsychometricError(
              "Invalid maritime question."
            );
          }

          const section =
            attempt.sections.find(
              (item) =>
                item.section.code ===
                attemptQuestion.sectionCode
            );

          if (
            !section ||
            !section.startedAt
          ) {
            throw new PsychometricError(
              "Start this section before answering its questions."
            );
          }

          if (
            section.submittedAt ||
            section.lockedAt
          ) {
            const incomingSelected =
              String(
                answer.selectedOption ||
                ""
              )
                .trim()
                .toUpperCase();

            const savedSelected =
              String(
                attemptQuestion.selectedOption ||
                ""
              )
                .trim()
                .toUpperCase();


            // The frontend may resend answers from a
            // previously completed section together
            // with the current section answers.
            //
            // If the old answer is exactly the same,
            // simply ignore it.
            if (
              incomingSelected &&
              incomingSelected ===
              savedSelected
            ) {
              continue;
            }


            // But never allow a submitted / locked
            // section answer to be changed.
            throw new PsychometricError(
              "A submitted section cannot be changed.",
              409
            );
          }

          if (
            section.expiresAt &&
            section.expiresAt <
            new Date()
          ) {
            throw new PsychometricError(
              "The time limit for this section has expired.",
              409
            );
          }

          const selected =
            String(
              answer.selectedOption ||
              ""
            )
              .trim()
              .toUpperCase();

          if (
            ![
              "A",
              "B",
              "C",
              "D",
            ].includes(
              selected
            )
          ) {
            throw new PsychometricError(
              "A valid answer option is required."
            );
          }

          await tx.psychometricAttemptQuestion
            .update({
              where: {
                id:
                  attemptQuestion.id,
              },
              data: {
                selectedOption:
                  selected,
                likertValue:
                  null,
                answeredAt:
                  new Date(),
              },
            });
        } else {
          const value =
            Number(
              answer.likertValue
            );

          if (
            !Number.isInteger(
              value
            ) ||
            value < 1 ||
            value > 5
          ) {
            throw new PsychometricError(
              "Likert answers must be integers from 1 to 5."
            );
          }

          await tx.psychometricAttemptQuestion
            .update({
              where: {
                id:
                  attemptQuestion.id,
              },
              data: {
                likertValue:
                  value,
                selectedOption:
                  null,
                answeredAt:
                  new Date(),
              },
            });
        }
      }
    }
  );

  return {
    success:
      true,
  };
}


export async function submitPsychometricSection(
  userId: string,
  attemptId: string,
  sectionCode: PsychometricSectionCode
) {
  return prisma.$transaction(
    async (tx) => {
      const attempt =
        await tx.psychometricAttempt
          .findFirst({
            where: {
              id:
                attemptId,
              userId,
              status:
                PsychometricAttemptStatus.IN_PROGRESS,
            },
            include: {
              test:
                true,
              sections: {
                include: {
                  section:
                    true,
                },
              },
              questions: {
                include: {
                  question:
                    true,
                },
              },
            },
          });

      if (!attempt) {
        throw new PsychometricError(
          "Active assessment attempt not found.",
          404
        );
      }

      if (
        attempt.test.type !==
        PsychometricTestType.MARITIME_HUMAN_PERFORMANCE
      ) {
        throw new PsychometricError(
          "This assessment does not use sections."
        );
      }

      const section =
        attempt.sections.find(
          (item) =>
            item.section.code ===
            sectionCode
        );

      if (!section) {
        throw new PsychometricError(
          "Section not found.",
          404
        );
      }

      if (
        !section.startedAt
      ) {
        throw new PsychometricError(
          "Start the section before submitting it."
        );
      }

      if (
        section.submittedAt ||
        section.lockedAt
      ) {
        throw new PsychometricError(
          "This section has already been submitted."
        );
      }

      const orderedSections =
        [...attempt.sections]
          .sort(
            (
              a,
              b
            ) =>
              a.section.sortOrder -
              b.section.sortOrder
          );

      const currentIndex =
        orderedSections.findIndex(
          (item) =>
            item.section.code ===
            sectionCode
        );

      for (
        let index = 0;
        index < currentIndex;
        index += 1
      ) {
        if (
          !orderedSections[index]
            .submittedAt
        ) {
          throw new PsychometricError(
            "Previous section must be submitted first."
          );
        }
      }

      const sectionQuestions =
        attempt.questions.filter(
          (question) =>
            question.sectionCode ===
            sectionCode
        );

      let score =
        0;

      for (
        const item
        of sectionQuestions
      ) {
        const answered =
          Boolean(
            item.selectedOption
          );

        const correct =
          answered &&
          Boolean(
            item.question.correctOption
          ) &&
          item.selectedOption ===
          item.question.correctOption;

        const points =
          correct
            ? 1
            : 0;

        score +=
          points;

        await tx.psychometricAttemptQuestion
          .update({
            where: {
              id:
                item.id,
            },
            data: {
              isCorrect:
                answered
                  ? correct
                  : null,
              pointsAwarded:
                points,
            },
          });
      }

      const now =
        new Date();

      await tx.psychometricAttemptSection
        .update({
          where: {
            id:
              section.id,
          },
          data: {
            submittedAt:
              now,
            lockedAt:
              now,
            score,
            maxScore:
              sectionQuestions.length,
          },
        });

      const isLast =
        currentIndex ===
        orderedSections.length - 1;

      if (
        isLast
      ) {
        await finishMaritimeAttempt(
          tx,
          attempt.id
        );
      }

      return {
        success:
          true,
        sectionCode,
        locked:
          true,
        completed:
          isLast,
        nextSection:
          isLast
            ? null
            : orderedSections[
              currentIndex + 1
            ].section.code,
      };
    }
  );
}


export async function submitPsychometricAttempt(
  userId: string,
  attemptId: string
) {
  const attempt =
    await prisma.psychometricAttempt
      .findFirst({
        where: {
          id:
            attemptId,

          userId,

          status:
            PsychometricAttemptStatus.IN_PROGRESS,
        },

        include: {
          test:
            true,

          questions:
            true,
        },
      });


  if (!attempt) {
    throw new PsychometricError(
      "Active assessment attempt not found.",
      404,
      "ATTEMPT_NOT_FOUND"
    );
  }


  if (
    attempt.test.type ===
    PsychometricTestType.MARITIME_HUMAN_PERFORMANCE
  ) {
    throw new PsychometricError(
      "Submit each maritime section separately.",
      400,
      "MARITIME_SECTION_SUBMISSION_REQUIRED"
    );
  }


  const unanswered =
    attempt.questions.filter(
      (question) =>
        question.likertValue ===
        null
    );


  if (
    unanswered.length >
    0
  ) {
    throw new PsychometricError(
      `Please answer all questions before submitting. ${unanswered.length} question${unanswered.length === 1
        ? ""
        : "s"
      } remaining.`,
      400,
      "INCOMPLETE_ASSESSMENT",
      {
        unansweredCount:
          unanswered.length,
      }
    );
  }


  await prisma.psychometricAttempt
    .update({
      where: {
        id:
          attempt.id,
      },

      data: {
        status:
          PsychometricAttemptStatus.COMPLETED,

        completedAt:
          new Date(),
      },
    });


  return {
    success:
      true,

    completed:
      true,

    attemptId:
      attempt.id,
  };
}


export async function getPsychometricResult(
  userId: string,
  attemptId: string
) {
  const attempt =
    await prisma.psychometricAttempt
      .findFirst({
        where: {
          id:
            attemptId,
          userId,
          status:
            PsychometricAttemptStatus.COMPLETED,
        },
        include: {
          test:
            true,
          sections: {
            include: {
              section:
                true,
            },
          },
          questions: {
            include: {
              question:
                true,
            },
            orderBy: {
              questionOrder:
                "asc",
            },
          },
        },
      });

  if (!attempt) {
    throw new PsychometricError(
      "Completed assessment result not found.",
      404
    );
  }

  const answered =
    attempt.questions.filter(
      (item) =>
        item.selectedOption !==
        null ||
        item.likertValue !==
        null
    ).length;

  const unanswered =
    attempt.questions.length -
    answered;

  if (
    attempt.test.type ===
    PsychometricTestType.MARITIME_HUMAN_PERFORMANCE
  ) {
    return {
      attemptId:
        attempt.id,
      test: {
        code:
          attempt.test.code,
        title:
          attempt.test.title,
      },
      score:
        attempt.score,
      maxScore:
        attempt.maxScore,
      percentage:
        attempt.percentage,
      answered,
      unanswered,
      sections:
        [...attempt.sections]
          .sort(
            (
              a,
              b
            ) =>
              a.section.sortOrder -
              b.section.sortOrder
          )
          .map(
            (item) => ({
              code:
                item.section.code,
              title:
                item.section.title,
              score:
                item.score,
              maxScore:
                item.maxScore,
              percentage:
                item.maxScore
                  ? Number(
                    (
                      ((item.score || 0) /
                        item.maxScore) *
                      100
                    ).toFixed(2)
                  )
                  : 0,
            })
          ),
    };
  }

  const answeredLikert =
    attempt.questions.filter(
      (item) =>
        item.likertValue !==
        null
    );

  const traitMap =
    new Map<
      string,
      number[]
    >();

  for (
    const item
    of answeredLikert
  ) {
    const trait =
      item.question.traitKey;

    if (!trait) {
      continue;
    }

    let value =
      item.likertValue as number;

    if (
      item.question.reverseScored
    ) {
      value =
        6 - value;
    }

    const values =
      traitMap.get(
        trait
      ) || [];

    values.push(
      value
    );

    traitMap.set(
      trait,
      values
    );
  }

  const traitScores =
    Array.from(
      traitMap.entries()
    ).map(
      ([
        trait,
        values,
      ]) => ({
        trait,
        average:
          Number(
            (
              values.reduce(
                (
                  total,
                  value
                ) =>
                  total + value,
                0
              ) /
              values.length
            ).toFixed(2)
          ),
      })
    );

  const overallAverage =
    answeredLikert.length
      ? Number(
        (
          answeredLikert.reduce(
            (
              total,
              item
            ) =>
              total +
              (item.likertValue || 0),
            0
          ) /
          answeredLikert.length
        ).toFixed(2)
      )
      : null;

  return {
    attemptId:
      attempt.id,
    test: {
      code:
        attempt.test.code,
      title:
        attempt.test.title,
      type:
        attempt.test.type,
    },
    answered,
    unanswered,
    overallAverage,
    traitScores,
  };
}


export async function getPsychometricHistory(
  userId: string
) {
  return prisma.psychometricAttempt
    .findMany({
      where: {
        userId,
      },
      include: {
        test: {
          select: {
            code:
              true,
            title:
              true,
            type:
              true,
          },
        },
      },
      orderBy: {
        startedAt:
          "desc",
      },
    });
}
