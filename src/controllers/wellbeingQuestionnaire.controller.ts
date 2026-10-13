import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";

const prisma = new PrismaClient();

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getParam = (
  value: string | string[] | undefined
): string | undefined => {
  return Array.isArray(value) ? value[0] : value;
};

const buildEligibility = (
  latestSubmission:
    | {
        submittedAt: Date;
        nextEligibleAt: Date;
      }
    | null
    | undefined
) => {
  if (!latestSubmission) {
    return {
      canSubmit: true,
      lastSubmittedAt: null,
      nextEligibleAt: null,
      daysRemaining: 0,
    };
  }

  const now = new Date();
  const canSubmit =
    now.getTime() >= latestSubmission.nextEligibleAt.getTime();

  const daysRemaining = canSubmit
    ? 0
    : Math.max(
        1,
        Math.ceil(
          (latestSubmission.nextEligibleAt.getTime() - now.getTime()) /
            MS_PER_DAY
        )
      );

  return {
    canSubmit,
    lastSubmittedAt: latestSubmission.submittedAt,
    nextEligibleAt: latestSubmission.nextEligibleAt,
    daysRemaining,
  };
};

// ======================================================
// LIST ACTIVE QUESTIONNAIRES
//
// GET /api/wellbeing-questionnaires
//
// Used by the "Your Wellbeing" landing page.
// Returns the latest PUBLISHED version of each questionnaire
// plus the current user's 15-day eligibility.
// ======================================================

export const getWellbeingQuestionnaires = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const questionnaires =
      await prisma.wellbeingQuestionnaire.findMany({
        where: {
          isActive: true,
        },

        orderBy: {
          createdAt: "asc",
        },

        include: {
          versions: {
            where: {
              status: "PUBLISHED",
            },

            orderBy: {
              version: "desc",
            },

            take: 1,

            select: {
              id: true,
              version: true,
              title: true,
              subtitle: true,
              description: true,
              publishedAt: true,

              _count: {
                select: {
                  questions: true,
                },
              },
            },
          },

          submissions: {
            where: {
              userId,
            },

            orderBy: {
              submittedAt: "desc",
            },

            take: 1,

            select: {
              id: true,
              submittedAt: true,
              nextEligibleAt: true,
            },
          },
        },
      });

    const data = questionnaires
      .filter((questionnaire) => questionnaire.versions.length > 0)
      .map((questionnaire) => {
        const version = questionnaire.versions[0];
        const latestSubmission = questionnaire.submissions[0] ?? null;

        return {
          id: questionnaire.id,
          slug: questionnaire.slug,
          category: questionnaire.category,
          refillIntervalDays: questionnaire.refillIntervalDays,

          version: {
            id: version.id,
            number: version.version,
            title: version.title,
            subtitle: version.subtitle,
            description: version.description,
            publishedAt: version.publishedAt,
          },

          questionCount: version._count.questions,

          eligibility: buildEligibility(latestSubmission),
        };
      });

    return res.status(200).json({
      status: "success",
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Get wellbeing questionnaires error:", error);

    return res.status(500).json({
      error: "Failed to fetch wellbeing questionnaires",
    });
  }
};

// ======================================================
// GET ONE QUESTIONNAIRE
//
// GET /api/wellbeing-questionnaires/:slug
//
// Returns the latest PUBLISHED version with questions
// and answer options for the frontend.
// ======================================================

export const getWellbeingQuestionnaireBySlug = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const slug = getParam(req.params.slug);

    if (!slug) {
      return res.status(400).json({
        error: "Questionnaire slug is required",
      });
    }

    const questionnaire =
      await prisma.wellbeingQuestionnaire.findFirst({
        where: {
          slug,
          isActive: true,
        },

        include: {
          versions: {
            where: {
              status: "PUBLISHED",
            },

            orderBy: {
              version: "desc",
            },

            take: 1,

            include: {
              questions: {
                where: {
                  isActive: true,
                },

                orderBy: {
                  sortOrder: "asc",
                },

                include: {
                  options: {
                    where: {
                      isActive: true,
                    },

                    orderBy: {
                      sortOrder: "asc",
                    },

                    select: {
                      id: true,
                      value: true,
                      label: true,
                      sortOrder: true,
                    },
                  },
                },
              },
            },
          },

          submissions: {
            where: {
              userId,
            },

            orderBy: {
              submittedAt: "desc",
            },

            take: 1,

            select: {
              id: true,
              submittedAt: true,
              nextEligibleAt: true,
            },
          },
        },
      });

    if (!questionnaire || questionnaire.versions.length === 0) {
      return res.status(404).json({
        error: "Questionnaire not found",
      });
    }

    const version = questionnaire.versions[0];
    const latestSubmission = questionnaire.submissions[0] ?? null;

    const questions = version.questions.map((question) => ({
      id: question.id,
      questionKey: question.questionKey,
      questionText: question.questionText,
      helperText: question.helperText,
      questionType: question.questionType,
      isRequired: question.isRequired,
      sortOrder: question.sortOrder,

      // DURATION_MINUTES is used by the Sleep & Rest
      // "hours + minutes" screen. FE converts it to total minutes.
      inputConfig:
        question.questionType === "DURATION_MINUTES"
          ? {
              format: "HOURS_MINUTES",
              storedAs: "TOTAL_MINUTES",
            }
          : null,

      options: question.options,
    }));

    return res.status(200).json({
      status: "success",

      data: {
        id: questionnaire.id,
        slug: questionnaire.slug,
        category: questionnaire.category,
        refillIntervalDays: questionnaire.refillIntervalDays,

        version: {
          id: version.id,
          number: version.version,
          title: version.title,
          subtitle: version.subtitle,
          description: version.description,
          publishedAt: version.publishedAt,
        },

        eligibility: buildEligibility(latestSubmission),

        questions,
      },
    });
  } catch (error) {
    console.error("Get wellbeing questionnaire error:", error);

    return res.status(500).json({
      error: "Failed to fetch wellbeing questionnaire",
    });
  }
};

type ValidatedAnswer = {
  questionId: string;
  numericValue: number | null;
  textValue: string | null;
  selectedOptionIds: string[];
};

// ======================================================
// SUBMIT QUESTIONNAIRE
//
// POST /api/wellbeing-questionnaires/:slug/submit
//
// Creates a NEW submission.
// Old submissions are never overwritten.
//
// A user can submit the same questionnaire again only
// when nextEligibleAt has been reached.
// ======================================================

export const submitWellbeingQuestionnaire = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const slug = getParam(req.params.slug);

    if (!slug) {
      return res.status(400).json({
        error: "Questionnaire slug is required",
      });
    }

    if (!Array.isArray(req.body?.answers)) {
      return res.status(400).json({
        error: "answers must be an array",
      });
    }

    const questionnaire =
      await prisma.wellbeingQuestionnaire.findFirst({
        where: {
          slug,
          isActive: true,
        },

        include: {
          versions: {
            where: {
              status: "PUBLISHED",
            },

            orderBy: {
              version: "desc",
            },

            take: 1,

            include: {
              questions: {
                where: {
                  isActive: true,
                },

                orderBy: {
                  sortOrder: "asc",
                },

                include: {
                  options: {
                    where: {
                      isActive: true,
                    },

                    orderBy: {
                      sortOrder: "asc",
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!questionnaire || questionnaire.versions.length === 0) {
      return res.status(404).json({
        error: "Questionnaire not found",
      });
    }

    const latestSubmission =
      await prisma.wellbeingSubmission.findFirst({
        where: {
          userId,
          questionnaireId: questionnaire.id,
        },

        orderBy: {
          submittedAt: "desc",
        },

        select: {
          submittedAt: true,
          nextEligibleAt: true,
        },
      });

    const eligibility = buildEligibility(latestSubmission);

    if (!eligibility.canSubmit) {
      return res.status(409).json({
        error:
          "You have already completed this questionnaire for the current period.",
        eligibility,
      });
    }

    const version = questionnaire.versions[0];
    const questionsById = new Map(
      version.questions.map((question) => [question.id, question])
    );

    const rawAnswersByQuestionId = new Map<string, any>();

    for (const rawAnswer of req.body.answers) {
      if (
        !rawAnswer ||
        typeof rawAnswer !== "object" ||
        typeof rawAnswer.questionId !== "string" ||
        !rawAnswer.questionId.trim()
      ) {
        return res.status(400).json({
          error: "Every answer must include a valid questionId",
        });
      }

      const questionId = rawAnswer.questionId.trim();

      if (!questionsById.has(questionId)) {
        return res.status(400).json({
          error: "One or more answers belong to an invalid question",
        });
      }

      if (rawAnswersByQuestionId.has(questionId)) {
        return res.status(400).json({
          error: "A question cannot be answered more than once",
        });
      }

      rawAnswersByQuestionId.set(questionId, rawAnswer);
    }

    const validatedAnswers: ValidatedAnswer[] = [];

    let supportPromptRecommended = false;

    for (const question of version.questions) {
      const rawAnswer = rawAnswersByQuestionId.get(question.id);

      if (!rawAnswer) {
        if (question.isRequired) {
          return res.status(400).json({
            error: `Please answer: ${question.questionText}`,
            questionId: question.id,
          });
        }

        continue;
      }

      let selectedOptionIds: string[] = [];

      if (rawAnswer.selectedOptionIds !== undefined) {
        if (!Array.isArray(rawAnswer.selectedOptionIds)) {
          return res.status(400).json({
            error: "selectedOptionIds must be an array",
            questionId: question.id,
          });
        }

        selectedOptionIds = rawAnswer.selectedOptionIds.map((value: unknown) =>
          String(value)
        );
      }

      selectedOptionIds = [...new Set(selectedOptionIds)];

      let numericValue: number | null = null;

      if (
        rawAnswer.numericValue !== undefined &&
        rawAnswer.numericValue !== null &&
        rawAnswer.numericValue !== ""
      ) {
        numericValue = Number(rawAnswer.numericValue);

        if (!Number.isFinite(numericValue)) {
          return res.status(400).json({
            error: "numericValue must be a valid number",
            questionId: question.id,
          });
        }
      }

      let textValue: string | null = null;

      if (
        rawAnswer.textValue !== undefined &&
        rawAnswer.textValue !== null
      ) {
        textValue = String(rawAnswer.textValue).trim() || null;
      }

      const allowedOptions = new Map(
        question.options.map((option) => [option.id, option])
      );

      for (const optionId of selectedOptionIds) {
        if (!allowedOptions.has(optionId)) {
          return res.status(400).json({
            error:
              "One or more selected options do not belong to this question",
            questionId: question.id,
          });
        }
      }

      switch (question.questionType) {
        case "SINGLE_CHOICE":
        case "BOOLEAN": {
          if (selectedOptionIds.length !== 1) {
            return res.status(400).json({
              error: "Please select one answer",
              questionId: question.id,
            });
          }

          break;
        }

        case "MULTI_CHOICE": {
          if (question.isRequired && selectedOptionIds.length < 1) {
            return res.status(400).json({
              error: "Please select at least one answer",
              questionId: question.id,
            });
          }

          break;
        }

        case "DURATION_MINUTES": {
          if (
            numericValue === null ||
            !Number.isInteger(numericValue) ||
            numericValue < 0 ||
            numericValue > 1440
          ) {
            return res.status(400).json({
              error:
                "Sleep duration must be provided as total minutes between 0 and 1440",
              questionId: question.id,
            });
          }

          break;
        }

        case "SCALE": {
          if (numericValue === null) {
            return res.status(400).json({
              error: "Please provide a numeric answer",
              questionId: question.id,
            });
          }

          break;
        }

        case "TEXT": {
          if (question.isRequired && !textValue) {
            return res.status(400).json({
              error: "Please provide an answer",
              questionId: question.id,
            });
          }

          break;
        }

        default: {
          return res.status(400).json({
            error: `Unsupported question type: ${question.questionType}`,
            questionId: question.id,
          });
        }
      }

      // This is NOT clinical scoring.
      // It only tells the frontend to show its safety/support UI
      // when the self-harm question is answered with anything
      // other than "Not at all".
      if (
        question.questionKey === "thoughts_of_hurting_yourself" &&
        selectedOptionIds.length === 1
      ) {
        const selectedOption = allowedOptions.get(selectedOptionIds[0]);

        if (selectedOption?.value !== "NOT_AT_ALL") {
          supportPromptRecommended = true;
        }
      }

      validatedAnswers.push({
        questionId: question.id,
        numericValue,
        textValue,
        selectedOptionIds,
      });
    }

    const submittedAt = new Date();

    const nextEligibleAt = new Date(
      submittedAt.getTime() +
        questionnaire.refillIntervalDays * MS_PER_DAY
    );

    const submission =
      await prisma.wellbeingSubmission.create({
        data: {
          userId,
          questionnaireId: questionnaire.id,
          questionnaireVersionId: version.id,
          submittedAt,
          nextEligibleAt,

          answers: {
            create: validatedAnswers.map((answer) => ({
              questionId: answer.questionId,
              numericValue: answer.numericValue,
              textValue: answer.textValue,

              selectedOptions:
                answer.selectedOptionIds.length > 0
                  ? {
                      create: answer.selectedOptionIds.map((optionId) => ({
                        optionId,
                      })),
                    }
                  : undefined,
            })),
          },
        },

        select: {
          id: true,
          submittedAt: true,
          nextEligibleAt: true,
          questionnaireVersionId: true,
        },
      });

    return res.status(201).json({
      status: "success",
      message: "Wellbeing questionnaire submitted successfully",

      data: {
        submissionId: submission.id,
        questionnaireId: questionnaire.id,
        questionnaireSlug: questionnaire.slug,
        questionnaireVersionId: submission.questionnaireVersionId,
        version: version.version,
        submittedAt: submission.submittedAt,
        nextEligibleAt: submission.nextEligibleAt,

        eligibility: {
          canSubmit: false,
          lastSubmittedAt: submission.submittedAt,
          nextEligibleAt: submission.nextEligibleAt,
          daysRemaining: questionnaire.refillIntervalDays,
        },

        supportPromptRecommended,
      },
    });
  } catch (error) {
    console.error("Submit wellbeing questionnaire error:", error);

    return res.status(500).json({
      error: "Failed to submit wellbeing questionnaire",
    });
  }
};

// ======================================================
// USER QUESTIONNAIRE HISTORY
//
// GET /api/wellbeing-questionnaires/:slug/history
//
// Keeps every historical submission for future wellbeing
// trends and analysis.
// ======================================================

export const getWellbeingQuestionnaireHistory = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const slug = getParam(req.params.slug);

    if (!slug) {
      return res.status(400).json({
        error: "Questionnaire slug is required",
      });
    }

    const questionnaire =
      await prisma.wellbeingQuestionnaire.findUnique({
        where: {
          slug,
        },

        select: {
          id: true,
          slug: true,
          isActive: true,
        },
      });

    if (!questionnaire) {
      return res.status(404).json({
        error: "Questionnaire not found",
      });
    }

    const submissions =
      await prisma.wellbeingSubmission.findMany({
        where: {
          userId,
          questionnaireId: questionnaire.id,
        },

        orderBy: {
          submittedAt: "desc",
        },

        include: {
          questionnaireVersion: {
            select: {
              version: true,
              title: true,
            },
          },

          answers: {
            include: {
              question: {
                select: {
                  questionKey: true,
                  questionText: true,
                  questionType: true,
                  sortOrder: true,
                },
              },

              selectedOptions: {
                include: {
                  option: {
                    select: {
                      value: true,
                      label: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    const data = submissions.map((submission) => ({
      id: submission.id,
      submittedAt: submission.submittedAt,
      nextEligibleAt: submission.nextEligibleAt,

      version: {
        number: submission.questionnaireVersion.version,
        title: submission.questionnaireVersion.title,
      },

      answers: [...submission.answers]
        .sort(
          (a, b) =>
            a.question.sortOrder - b.question.sortOrder
        )
        .map((answer) => ({
          questionKey: answer.question.questionKey,
          questionText: answer.question.questionText,
          questionType: answer.question.questionType,
          numericValue: answer.numericValue,
          textValue: answer.textValue,

          selectedOptions: answer.selectedOptions.map(
            (selected) => ({
              value: selected.option.value,
              label: selected.option.label,
            })
          ),
        })),
    }));

    return res.status(200).json({
      status: "success",
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Get wellbeing questionnaire history error:", error);

    return res.status(500).json({
      error: "Failed to fetch wellbeing questionnaire history",
    });
  }
};
