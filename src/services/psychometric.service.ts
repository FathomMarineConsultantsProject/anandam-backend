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
  // ======================================================
// ASSESSMENT DISCLAIMER
// ======================================================

const PSYCHOMETRIC_DISCLAIMER_VERSION =
  "1.1";

const PSYCHOMETRIC_DISCLAIMER_WAIT_SECONDS =
  45;

const PSYCHOMETRIC_DISCLAIMER_TITLE =
  "Important Disclaimer - Not a clinical diagnosis";

const PSYCHOMETRIC_DISCLAIMER_TEXT = `
This assessment is intended for self-awareness and personal development only.

Your results are based on the responses you provide and reflect your reported state at the time of the assessment. They are indicative and informational, not diagnostic.

This assessment does not constitute a medical, psychological, or psychiatric diagnosis and is not a substitute for evaluation by a qualified professional.

The results should not be used as the sole basis for employment, promotion, disciplinary, medical, or other high-stakes decisions.

After you complete and submit this assessment, your completed assessment result report will be automatically shared with Fathom Marine Consultants for authorised review and support purposes.

Fathom Marine Consultants and Anandüm by Fathom do not guarantee the accuracy, completeness, or suitability of the results for any particular purpose and, to the fullest extent permitted by law, accept no liability for decisions or actions taken solely on the basis of these results.
`.trim();

const PSYCHOMETRIC_ACKNOWLEDGEMENT_TEXT = `
I understand and acknowledge that this assessment is intended for indicative and informational purposes only, does not constitute a medical, psychological, or psychiatric diagnosis, and should not be relied upon as a substitute for professional evaluation.

I confirm that I have read and understood the Assessment Disclaimer and Limitation of Liability.

I understand and agree that, after I submit the assessment, my completed result report will be automatically sent to Fathom Marine Consultants for authorised review and support purposes.
`.trim();

  
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

// ======================================================
// DISCLAIMER HELPERS
// ======================================================

async function ensurePsychometricDisclaimerRecord(
  userId: string,
  attemptId: string
) {
  const attempt =
    await prisma.psychometricAttempt.findFirst({
      where: {
        id: attemptId,
        userId,
      },

      select: {
        id: true,
        testId: true,
      },
    });

  if (!attempt) {
    throw new PsychometricError(
      "Assessment attempt not found.",
      404,
      "ATTEMPT_NOT_FOUND"
    );
  }

  const acknowledgement =
    await prisma.psychometricDisclaimerAcknowledgement.upsert({
      where: {
        attemptId,
      },

      update: {},

      create: {
        userId,
        testId:
          attempt.testId,
        attemptId:
          attempt.id,

        disclaimerVersion:
          PSYCHOMETRIC_DISCLAIMER_VERSION,

        disclaimerTextSnapshot:
          PSYCHOMETRIC_DISCLAIMER_TEXT,

        acknowledgementTextSnapshot:
          PSYCHOMETRIC_ACKNOWLEDGEMENT_TEXT,
      },
    });


  /*
    If an existing attempt has NOT yet been acknowledged,
    bring its disclosure up to the current version.

    Never rewrite an already-accepted historical snapshot.
  */

  if (
    !acknowledgement.accepted &&
    acknowledgement.disclaimerVersion !==
      PSYCHOMETRIC_DISCLAIMER_VERSION
  ) {
    return prisma.psychometricDisclaimerAcknowledgement.update({
      where: {
        attemptId,
      },

      data: {
        disclaimerVersion:
          PSYCHOMETRIC_DISCLAIMER_VERSION,

        disclaimerTextSnapshot:
          PSYCHOMETRIC_DISCLAIMER_TEXT,

        acknowledgementTextSnapshot:
          PSYCHOMETRIC_ACKNOWLEDGEMENT_TEXT,

        presentedAt:
          null,

        canAcknowledgeAt:
          null,
      },
    });
  }


  return acknowledgement;
}


async function requirePsychometricDisclaimerAcknowledged(
  userId: string,
  attemptId: string
) {
  const acknowledgement =
    await prisma.psychometricDisclaimerAcknowledgement.findFirst({
      where: {
        userId,
        attemptId,
        accepted: true,

        acknowledgedAt: {
          not: null,
        },
      },

      select: {
        id: true,
        acknowledgedAt: true,
      },
    });

  if (!acknowledgement) {
    throw new PsychometricError(
      "You must read and acknowledge the assessment disclaimer before beginning the assessment.",
      403,
      "DISCLAIMER_ACKNOWLEDGEMENT_REQUIRED",
      {
        attemptId,
      }
    );
  }

  return acknowledgement;
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


const PROFILE_QUESTIONS_PER_ATTEMPT =
  60;

function isSectionedAssessment(
  type: PsychometricTestType
) {
  return (
    type ===
      PsychometricTestType.MARITIME_HUMAN_PERFORMANCE ||
    type ===
      PsychometricTestType.SENIOR_LEADERSHIP_PERSONALITY
  );
}


function getAttemptTokenCost(
  test: {
    firstAttemptFree: boolean;
    firstAttemptTokenCost: number;
    repeatTokenCost: number;
  },
  previousCount: number
) {
  if (
    previousCount ===
    0
  ) {
    return test.firstAttemptFree
      ? 0
      : Number(
          test.firstAttemptTokenCost ||
          0
        );
  }

  return Number(
    test.repeatTokenCost ||
    0
  );
}



const PROFILE_TRAITS_BY_TEST:
  Partial<
    Record<
      PsychometricTestType,
      readonly string[]
    >
  > = {
    [PsychometricTestType.BIG_FIVE]: [
      "OPENNESS",
      "CONSCIENTIOUSNESS",
      "EXTRAVERSION",
      "AGREEABLENESS",
      "EMOTIONAL_STABILITY",
    ],

    [PsychometricTestType.PERSONALITY_16PF]: [
      "ANALYTICAL_THINKING",
      "ASSERTIVE_COMMUNICATION",
      "RESERVED_EXPRESSION",
      "STRUCTURE_ORIENTATION",
      "ADAPTABILITY",
      "DECISIVENESS_INITIATIVE",
      "SENSITIVITY_REFLECTION",
      "FOCUS_RESILIENCE",
      "SOCIAL_INSIGHT_DIPLOMACY",
      "INDEPENDENT_JUDGEMENT",
    ],

    [PsychometricTestType.MOTIVATION_VALUES]: [
      "GROWTH_ACHIEVEMENT",
      "AUTONOMY_LEADERSHIP",
      "COLLABORATION_RELATIONSHIPS",
      "STABILITY_WELLBEING",
      "PURPOSE_ETHICS",
    ],
  };


function getLikertOptionsForQuestion(
  question: any
) {
  const sourceFormat =
    String(
      question.competency ||
      ""
    ).trim();


  if (
    sourceFormat ===
    "Observed-behaviour frequency"
  ) {
    return [
      {
        value: 1,
        label: "Never",
      },
      {
        value: 2,
        label: "Rarely",
      },
      {
        value: 3,
        label: "Sometimes",
      },
      {
        value: 4,
        label: "Often",
      },
      {
        value: 5,
        label: "Almost always",
      },
    ];
  }


  if (
    sourceFormat ===
    "Self-report Likert"
  ) {
    return [
      {
        value: 1,
        label:
          "Never / Strongly Disagree",
      },
      {
        value: 2,
        label:
          "Rarely / Disagree",
      },
      {
        value: 3,
        label:
          "Sometimes / Neutral",
      },
      {
        value: 4,
        label:
          "Often / Agree",
      },
      {
        value: 5,
        label:
          "Almost always / Strongly Agree",
      },
    ];
  }


  return [
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
  ];
}


async function selectProfileQuestions(
  tx: Prisma.TransactionClient,
  testId: string,
  testType: PsychometricTestType
) {
  const traits =
    PROFILE_TRAITS_BY_TEST[
      testType
    ];


  if (
    !traits ||
    traits.length === 0
  ) {
    throw new PsychometricError(
      "No profile-dimension configuration is available for this assessment.",
      500,
      "PROFILE_TRAITS_NOT_CONFIGURED"
    );
  }


  if (
    PROFILE_QUESTIONS_PER_ATTEMPT %
      traits.length !==
    0
  ) {
    throw new PsychometricError(
      "Profile question-count configuration is invalid.",
      500,
      "PROFILE_QUESTION_COUNT_INVALID"
    );
  }


  const questionsPerTrait =
    PROFILE_QUESTIONS_PER_ATTEMPT /
    traits.length;


  const questions =
    await tx
      .psychometricQuestion
      .findMany({
        where: {
          testId,

          isActive:
            true,

          questionType:
            PsychometricQuestionType
              .LIKERT_5,

          traitKey: {
            in:
              [...traits],
          },
        },
      });


  const selected:
    typeof questions =
    [];


  for (
    const traitKey
    of traits
  ) {
    const pool =
      shuffle(
        questions.filter(
          (question) =>
            question.traitKey ===
            traitKey
        )
      );


    if (
      pool.length <
      questionsPerTrait
    ) {
      throw new PsychometricError(
        `Not enough active ${traitKey} questions. Need ${questionsPerTrait}, found ${pool.length}.`,
        500,
        "PROFILE_QUESTION_POOL_TOO_SMALL",
        {
          testType,
          traitKey,
          required:
            questionsPerTrait,
          available:
            pool.length,
        }
      );
    }


    selected.push(
      ...pool.slice(
        0,
        questionsPerTrait
      )
    );
  }


  /*
    Every profile attempt gets 60 total questions.

    - Personality Insights: 12 from each of 5 dimensions
    - Behavioural Patterns: 6 from each of 10 dimensions
    - Motivation & Values: 12 from each of 5 dimensions

    Shuffle once more so dimensions are mixed throughout
    the assessment rather than appearing in blocks.
  */

  return shuffle(
    selected
  );
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

      options:
        getLikertOptionsForQuestion(
          question
        ),
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

  return Number(
    wallet?.balance?.toString() ??
    0
  );
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
    Number(
      wallet.balance.toString()
    ) <
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
          Number(
            wallet.balance.toString()
          ),

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


async function selectSeniorLeadershipQuestions(
  tx: Prisma.TransactionClient,
  testId: string,
  userId: string
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
            questionType:
              PsychometricQuestionType.LIKERT_5,
          },
        });

    if (
      questions.length <
      section.questionsPerAttempt
    ) {
      throw new PsychometricError(
        `Not enough active questions for ${section.code}. Need ${section.questionsPerAttempt}, found ${questions.length}.`,
        500,
        "SENIOR_LEADERSHIP_POOL_TOO_SMALL"
      );
    }

    const previouslyAnswered =
      await tx.psychometricAttemptQuestion
        .findMany({
          where: {
            sectionCode:
              section.code,
            likertValue: {
              not:
                null,
            },
            attempt: {
              userId,
              testId,
            },
          },
          select: {
            questionId:
              true,
          },
        });

    const usedIds =
      new Set(
        previouslyAnswered.map(
          (item) =>
            item.questionId
        )
      );

    const unseen =
      questions.filter(
        (question) =>
          !usedIds.has(
            question.id
          )
      );

    const pool =
      unseen.length >=
      section.questionsPerAttempt
        ? unseen
        : questions;

    const selected =
      shuffle(
        pool
      ).slice(
        0,
        section.questionsPerAttempt
      );

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

      globalOrder +=
        1;
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
            testAttempts.length ===
            0;


          const nextAttemptTokenCost =
            getAttemptTokenCost(
              test,
              testAttempts.length
            );


          const paymentRequired =
            !activeAttempt &&
            nextAttemptTokenCost >
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

            firstAttemptTokenCost:
              test.firstAttemptTokenCost,

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
                ? nextAttemptTokenCost
                : 0,

            hasEnoughTokens:
              !paymentRequired ||
              walletBalance >=
              nextAttemptTokenCost,

            walletBalance,

            questionCount:
              isSectionedAssessment(
                test.type
              )
                ? test.sections.reduce(
                    (
                      total,
                      section
                    ) =>
                      total +
                      section.questionsPerAttempt,
                    0
                  )
                : PROFILE_QUESTIONS_PER_ATTEMPT,

            questionBankCount:
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

              firstAttemptTokenCost:
                test.firstAttemptTokenCost,

              repeatTokenCost:
                test.repeatTokenCost,

              paymentRequired,

              requiredTokens:
                paymentRequired
                  ? nextAttemptTokenCost
                  : 0,

              walletBalance,

              hasEnoughTokens:
                !paymentRequired ||
                walletBalance >=
                nextAttemptTokenCost,

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
    attempts.length ===
    0;


  const nextAttemptTokenCost =
    getAttemptTokenCost(
      test,
      attempts.length
    );


  const paymentRequired =
    !activeAttempt &&
    nextAttemptTokenCost >
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

    firstAttemptTokenCost:
      test.firstAttemptTokenCost,

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
        ? nextAttemptTokenCost
        : 0,

    hasEnoughTokens:
      !paymentRequired ||
      walletBalance >=
      nextAttemptTokenCost,

    walletBalance,

    questionCount:
      isSectionedAssessment(
        test.type
      )
        ? test.sections.reduce(
            (
              total,
              section
            ) =>
              total +
              section.questionsPerAttempt,
            0
          )
        : PROFILE_QUESTIONS_PER_ATTEMPT,

    questionBankCount:
      test._count.questions,

    sections:
      test.sections,

    eligibility: {
      attemptCount:
        attempts.length,

      completedAttemptCount,

      firstAttemptUsed,

      nextAttemptFree,

      firstAttemptTokenCost:
        test.firstAttemptTokenCost,

      repeatTokenCost:
        test.repeatTokenCost,

      paymentRequired,

      requiredTokens:
        paymentRequired
          ? nextAttemptTokenCost
          : 0,

      walletBalance,

      hasEnoughTokens:
        !paymentRequired ||
        walletBalance >=
        nextAttemptTokenCost,

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
          getAttemptTokenCost(
            test,
            previousCount
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
          Number(
            wallet?.balance ??
            0
          );


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


          await tx.psychometricDisclaimerAcknowledgement.create({
  data: {
    userId,

    testId:
      test.id,

    attemptId:
      created.id,

    disclaimerVersion:
      PSYCHOMETRIC_DISCLAIMER_VERSION,

    disclaimerTextSnapshot:
      PSYCHOMETRIC_DISCLAIMER_TEXT,

    acknowledgementTextSnapshot:
      PSYCHOMETRIC_ACKNOWLEDGEMENT_TEXT,
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
        // SENIOR LEADERSHIP PERSONALITY
        // =================================================

        else if (
          test.type ===
          PsychometricTestType.SENIOR_LEADERSHIP_PERSONALITY
        ) {
          const selected =
            await selectSeniorLeadershipQuestions(
              tx,
              test.id,
              userId
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
            await selectProfileQuestions(
              tx,
              test.id,
              test.type
            );


          await tx
            .psychometricAttemptQuestion
            .createMany({
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
  await ensurePsychometricDisclaimerRecord(
    userId,
    attemptId
  );

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

          disclaimerAcknowledgement:
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
      "Assessment attempt not found.",
      404
    );
  }

  const disclaimerAccepted =
    Boolean(
      attempt
        .disclaimerAcknowledgement
        ?.accepted &&
      attempt
        .disclaimerAcknowledgement
        ?.acknowledgedAt
    );

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

    requiresDisclaimer:
      !disclaimerAccepted,

    canBeginAssessment:
      disclaimerAccepted,

    disclaimer: {
      required:
        true,

      accepted:
        disclaimerAccepted,

      acknowledgedAt:
        attempt
          .disclaimerAcknowledgement
          ?.acknowledgedAt ??
        null,
    },

    sections,

    questions:
      disclaimerAccepted
        ? attempt.questions.map(
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
      )
        : [],
  };
}


export async function startPsychometricSection(
  userId: string,
  attemptId: string,
  sectionCode: PsychometricSectionCode
) {
  await requirePsychometricDisclaimerAcknowledged(
    userId,
    attemptId
  );

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
    !isSectionedAssessment(
      attempt.test.type
    )
  ) {
    throw new PsychometricError(
      "This assessment does not use sections.",
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


  if (
    attempt.test.type ===
    PsychometricTestType.MARITIME_HUMAN_PERFORMANCE
  ) {
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
  }


  const current =
    ordered[
    currentIndex
    ];


  if (
    attempt.test.type ===
      PsychometricTestType.MARITIME_HUMAN_PERFORMANCE &&
    (
      current.submittedAt ||
      current.lockedAt
    )
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
      attempt.test.type ===
        PsychometricTestType.MARITIME_HUMAN_PERFORMANCE
        ? new Date(
            startedAt.getTime() +
            current.section
              .durationMinutes *
            60 *
            1000
          )
        : null;


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
  await requirePsychometricDisclaimerAcknowledged(
    userId,
    attemptId
  );

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
  await requirePsychometricDisclaimerAcknowledged(
    userId,
    attemptId
  );

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
        attempt.test.type ===
        PsychometricTestType.SENIOR_LEADERSHIP_PERSONALITY
      ) {
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

        const sectionQuestions =
          attempt.questions.filter(
            (question) =>
              question.sectionCode ===
              sectionCode
          );

        const unanswered =
          sectionQuestions.filter(
            (question) =>
              question.likertValue ===
              null
          );

        if (
          unanswered.length >
          0
        ) {
          throw new PsychometricError(
            `Please answer all questions in this section before continuing. ${unanswered.length} question${unanswered.length === 1 ? "" : "s"} remaining.`,
            400,
            "INCOMPLETE_SECTION",
            {
              unansweredCount:
                unanswered.length,
            }
          );
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
              startedAt:
                section.startedAt ||
                now,
              submittedAt:
                now,
              lockedAt:
                null,
              score:
                null,
              maxScore:
                null,
            },
          });

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

        return {
          success:
            true,
          sectionCode,
          locked:
            false,
          completed:
            false,
          nextSection:
            currentIndex >= 0 &&
            currentIndex <
              orderedSections.length - 1
              ? orderedSections[
                  currentIndex + 1
                ].section.code
              : null,
        };
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
  await requirePsychometricDisclaimerAcknowledged(
    userId,
    attemptId
  );

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

// ======================================================
// UNLOCK MARITIME CORRECT ANSWERS
//
// Cost: 1 token
//
// Important:
// - only COMPLETED maritime assessments can be unlocked
// - the same result is NEVER charged twice
// - token debit + unlock transaction are atomic
// - TokenTransaction acts as the persistent unlock record
// ======================================================

export async function unlockPsychometricAnswers(
  userId: string,
  attemptId: string
) {
  const UNLOCK_TOKEN_COST =
    1;

  const FEATURE_KEY =
    "psychometric:correct-answers";


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
                PsychometricAttemptStatus.COMPLETED,
            },

            include: {
              test:
                true,

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
          404,
          "RESULT_NOT_FOUND"
        );
      }


      if (
        attempt.test.type !==
        PsychometricTestType.MARITIME_HUMAN_PERFORMANCE
      ) {
        throw new PsychometricError(
          "Correct-answer unlocking is only available for the Maritime Human Performance assessment.",
          400,
          "ANSWER_UNLOCK_NOT_AVAILABLE"
        );
      }


      // ==================================================
      // CHECK WHETHER THIS RESULT WAS ALREADY UNLOCKED
      // ==================================================

      const existingUnlock =
        await tx.tokenTransaction
          .findFirst({
            where: {
              userId,

              featureKey:
                FEATURE_KEY,

              referenceId:
                attempt.id,

              type:
                TokenTransactionType.DEBIT,

              source:
                TokenTransactionSource.FEATURE,
            },

            orderBy: {
              createdAt:
                "desc",
            },
          });


      // ==================================================
      // CHARGE ONLY IF NOT ALREADY UNLOCKED
      // ==================================================

      if (
        !existingUnlock
      ) {
        const wallet =
          await tx.tokenWallet
            .upsert({
              where: {
                userId,
              },

              update: {},

              create: {
                userId,

                balance:
                  0,
              },
            });


        if (
          Number(
            wallet.balance.toString()
          ) <
          UNLOCK_TOKEN_COST
        ) {
          throw new PsychometricError(
            "Insufficient token balance. You need 1 token to unlock the correct answers.",
            402,
            "INSUFFICIENT_TOKENS",
            {
              requiredTokens:
                UNLOCK_TOKEN_COST,

              walletBalance:
                Number(
                  wallet.balance.toString()
                ),

              hasEnoughTokens:
                false,
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
                    UNLOCK_TOKEN_COST,
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

              amount:
                UNLOCK_TOKEN_COST,

              balanceBefore:
                wallet.balance,

              balanceAfter:
                updatedWallet.balance,

              featureKey:
                FEATURE_KEY,

              referenceId:
                attempt.id,

              reason:
                "Unlock psychometric correct answers",
            },
          });
      }


      // ==================================================
      // CURRENT BALANCE AFTER POSSIBLE DEBIT
      // ==================================================

      const currentWallet =
        await tx.tokenWallet
          .findUnique({
            where: {
              userId,
            },
          });


      // ==================================================
      // RETURN ANSWER REVIEW
      // ==================================================

      const answers =
  attempt.questions.map(
    (
      item,
      index
    ) => {
      const question =
        item.question;


      const selectedOption =
        item.selectedOption;


      const correctOption =
        question.correctOption;


      const optionMap: Record<
        string,
        string | null
      > = {
        A:
          question.optionA,

        B:
          question.optionB,

        C:
          question.optionC,

        D:
          question.optionD,
      };


      return {
        id:
          item.id,

        attemptQuestionId:
          item.id,

        questionId:
          item.questionId,

        questionNumber:
          index + 1,

        questionOrder:
          item.questionOrder,

        sectionCode:
          item.sectionCode,

        itemCode:
          question.itemCode,

        domain:
          question.domain,

        competency:
          question.competency,

        questionText:
          question.questionText,


        // ==========================================
        // ALL FOUR OPTIONS
        // ==========================================

        optionA:
          question.optionA,

        optionB:
          question.optionB,

        optionC:
          question.optionC,

        optionD:
          question.optionD,


        // Normalized options array for frontend
        options: [
          {
            key: "A",
            value: "A",
            text:
              question.optionA,
            label:
              question.optionA,
          },

          {
            key: "B",
            value: "B",
            text:
              question.optionB,
            label:
              question.optionB,
          },

          {
            key: "C",
            value: "C",
            text:
              question.optionC,
            label:
              question.optionC,
          },

          {
            key: "D",
            value: "D",
            text:
              question.optionD,
            label:
              question.optionD,
          },
        ].filter(
          (
            option
          ) =>
            Boolean(
              option.text
            )
        ),


        // ==========================================
        // USER ANSWER
        // ==========================================

        selectedOption,

        selectedOptionText:
          selectedOption
            ? optionMap[
                selectedOption
              ] ||
              null
            : null,


        // ==========================================
        // CORRECT ANSWER
        // ==========================================

        correctOption,

        correctOptionText:
          correctOption
            ? optionMap[
                correctOption
              ] ||
              null
            : null,


        isCorrect:
          item.isCorrect,
      };
    }
  );


      return {
        answersUnlocked:
          true,

        correctAnswersUnlocked:
          true,

        answers,

        answerReview:
          answers,

        tokenCost:
          UNLOCK_TOKEN_COST,

        tokenSpent:
          existingUnlock
            ? 0
            : UNLOCK_TOKEN_COST,

        alreadyUnlocked:
          Boolean(
            existingUnlock
          ),

        walletBalance:
          Number(
            currentWallet
              ?.balance
              ?.toString() ??
            0
          ),
      };
    }
  );
}

// ======================================================
// GET / PRESENT DISCLAIMER
// ======================================================

export async function getPsychometricDisclaimer(
  userId: string,
  attemptId: string
) {
  let acknowledgement =
    await ensurePsychometricDisclaimerRecord(
      userId,
      attemptId
    );

  // Start the 45-second reading period only when
  // the disclaimer is actually shown for the first time.
  if (
    !acknowledgement.presentedAt ||
    !acknowledgement.canAcknowledgeAt
  ) {
    const presentedAt =
      new Date();

    const canAcknowledgeAt =
      new Date(
        presentedAt.getTime() +
          PSYCHOMETRIC_DISCLAIMER_WAIT_SECONDS *
            1000
      );

    acknowledgement =
      await prisma.psychometricDisclaimerAcknowledgement.update({
        where: {
          attemptId,
        },

        data: {
          presentedAt,
          canAcknowledgeAt,
        },
      });
  }

  const serverTime =
    new Date();

  const secondsRemaining =
    acknowledgement.accepted
      ? 0
      : Math.max(
          0,
          Math.ceil(
            (
              acknowledgement.canAcknowledgeAt!.getTime() -
              serverTime.getTime()
            ) / 1000
          )
        );

  return {
    attemptId,

    title:
      PSYCHOMETRIC_DISCLAIMER_TITLE,

    disclaimerVersion:
      acknowledgement.disclaimerVersion,

    disclaimerText:
      acknowledgement.disclaimerTextSnapshot,

    acknowledgementText:
      acknowledgement.acknowledgementTextSnapshot,

    presentedAt:
      acknowledgement.presentedAt,

    canAcknowledgeAt:
      acknowledgement.canAcknowledgeAt,

    acknowledgedAt:
      acknowledgement.acknowledgedAt,

    accepted:
      acknowledgement.accepted,

    serverTime,

    secondsRemaining,

    canAcknowledge:
      !acknowledgement.accepted &&
      secondsRemaining === 0,

    canBeginAssessment:
      acknowledgement.accepted &&
      Boolean(
        acknowledgement.acknowledgedAt
      ),
  };
}

// ======================================================
// ACKNOWLEDGE DISCLAIMER
// ======================================================

export async function acknowledgePsychometricDisclaimer(
  userId: string,
  attemptId: string
) {
  let acknowledgement =
    await ensurePsychometricDisclaimerRecord(
      userId,
      attemptId
    );

  // Idempotent.
  // If already accepted, do NOT create another acknowledgement
  // for the same attempt.
  if (
    acknowledgement.accepted &&
    acknowledgement.acknowledgedAt
  ) {
    return {
      attemptId,

      accepted: true,

      acknowledgedAt:
        acknowledgement.acknowledgedAt,

      alreadyAcknowledged:
        true,

      canBeginAssessment:
        true,
    };
  }

  // If somebody directly calls the acknowledge endpoint
  // without ever opening the disclaimer screen,
  // start the timer here and reject the acknowledgement.
  if (
    !acknowledgement.presentedAt ||
    !acknowledgement.canAcknowledgeAt
  ) {
    const presentedAt =
      new Date();

    const canAcknowledgeAt =
      new Date(
        presentedAt.getTime() +
          PSYCHOMETRIC_DISCLAIMER_WAIT_SECONDS *
            1000
      );

    acknowledgement =
      await prisma.psychometricDisclaimerAcknowledgement.update({
        where: {
          attemptId,
        },

        data: {
          presentedAt,
          canAcknowledgeAt,
        },
      });
  }

  const now =
    new Date();

  if (
    now.getTime() <
    acknowledgement.canAcknowledgeAt!.getTime()
  ) {
    const secondsRemaining =
      Math.max(
        1,
        Math.ceil(
          (
            acknowledgement.canAcknowledgeAt!.getTime() -
            now.getTime()
          ) / 1000
        )
      );

    throw new PsychometricError(
      `Please review the disclaimer before continuing. ${secondsRemaining} second${
        secondsRemaining === 1
          ? ""
          : "s"
      } remaining.`,
      409,
      "DISCLAIMER_WAIT_REQUIRED",
      {
        secondsRemaining,
        canAcknowledgeAt:
          acknowledgement.canAcknowledgeAt,
      }
    );
  }

  const updated =
    await prisma.psychometricDisclaimerAcknowledgement.update({
      where: {
        attemptId,
      },

      data: {
        accepted: true,
        acknowledgedAt:
          now,
      },
    });

  return {
    attemptId,

    accepted:
      updated.accepted,

    acknowledgedAt:
      updated.acknowledgedAt,

    alreadyAcknowledged:
      false,

    canBeginAssessment:
      true,
  };
}