import {
  PrismaClient,
  PsychometricAttemptStatus,
  PsychometricTestType,
  TokenTransactionSource,
  TokenTransactionType,
} from "@prisma/client";

import {
  PsychometricError,
} from "./psychometric.service";


const prisma =
  new PrismaClient();


const CORRECT_ANSWER_FEATURE_KEY =
  "psychometric:correct-answers";


const LIKERT_LABELS:
  Record<number, string> = {
  1: "Strongly Disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly Agree",
};


type DimensionDefinition = {
  label: string;

  profileTitle: string;

  description: string;
};


const BIG_FIVE_DIMENSIONS:
  Record<
    string,
    DimensionDefinition
  > = {
  OPENNESS: {
    label:
      "Openness",

    profileTitle:
      "Curious & Flexible",

    description:
      "Enjoys new ideas, unfamiliar perspectives and experimentation.",
  },

  CONSCIENTIOUSNESS: {
    label:
      "Conscientiousness",

    profileTitle:
      "Structured Achiever",

    description:
      "Shows planning, reliability, persistence and organization.",
  },

  EXTRAVERSION: {
    label:
      "Extraversion",

    profileTitle:
      "Social Energy",

    description:
      "Reflects comfort with social interaction, expression and active engagement.",
  },

  AGREEABLENESS: {
    label:
      "Agreeableness",

    profileTitle:
      "Cooperative Partner",

    description:
      "Emphasizes cooperation, empathy, trust and support.",
  },

  EMOTIONAL_STABILITY: {
    label:
      "Emotional Stability",

    profileTitle:
      "Steady Under Pressure",

    description:
      "Reflects composure, recovery from setbacks and emotional steadiness.",
  },
};


const BEHAVIOURAL_DIMENSIONS:
  Record<
    string,
    DimensionDefinition
  > = {
  ANALYTICAL_THINKING: {
    label:
      "Analytical Thinking",

    profileTitle:
      "Evidence-Led Thinker",

    description:
      "Reflects preference for logic, evidence and structured problem solving.",
  },

  ASSERTIVE_COMMUNICATION: {
    label:
      "Assertive Communication",

    profileTitle:
      "Confident Communicator",

    description:
      "Reflects comfort speaking up, expressing views and communicating publicly.",
  },

  RESERVED_EXPRESSION: {
    label:
      "Reserved Expression",

    profileTitle:
      "Private & Reflective",

    description:
      "Reflects preference for lower-profile interaction and keeping personal feelings private.",
  },

  STRUCTURE_ORIENTATION: {
    label:
      "Structure Orientation",

    profileTitle:
      "Structured Operator",

    description:
      "Reflects preference for established procedures, consistency and proven methods.",
  },

  ADAPTABILITY: {
    label:
      "Adaptability",

    profileTitle:
      "Flexible Adapter",

    description:
      "Reflects comfort adjusting to change and working when conditions are less predictable.",
  },

  DECISIVENESS_INITIATIVE: {
    label:
      "Decisiveness & Initiative",

    profileTitle:
      "Proactive Decision Maker",

    description:
      "Reflects willingness to make considered decisions and take initiative when direction is needed.",
  },

  SENSITIVITY_REFLECTION: {
    label:
      "Sensitivity & Reflection",

    profileTitle:
      "Reflective Observer",

    description:
      "Reflects attention to experiences, ideas, meaning and surrounding influences.",
  },

  FOCUS_RESILIENCE: {
    label:
      "Focus & Resilience",

    profileTitle:
      "Steady Performer",

    description:
      "Reflects ability to maintain focus and recover from distracting or critical situations.",
  },

  SOCIAL_INSIGHT_DIPLOMACY: {
    label:
      "Social Insight & Diplomacy",

    profileTitle:
      "Diplomatic Partner",

    description:
      "Reflects interest in understanding others while remaining respectful during disagreement.",
  },

  INDEPENDENT_JUDGEMENT: {
    label:
      "Independent Judgement",

    profileTitle:
      "Independent Contributor",

    description:
      "Reflects comfort working independently and questioning existing approaches when appropriate.",
  },
};


const MOTIVATION_DIMENSIONS:
  Record<
    string,
    DimensionDefinition
  > = {
  GROWTH_ACHIEVEMENT: {
    label:
      "Growth & Achievement",

    profileTitle:
      "Achievement Driven",

    description:
      "Motivated by advancement, challenging goals, recognition and opportunities to improve.",
  },

  AUTONOMY_LEADERSHIP: {
    label:
      "Autonomy & Leadership",

    profileTitle:
      "Ownership Oriented",

    description:
      "Values independence, responsibility, influence and opportunities to lead.",
  },

  COLLABORATION_RELATIONSHIPS: {
    label:
      "Collaboration & Relationships",

    profileTitle:
      "Team Contributor",

    description:
      "Values supportive relationships, mentoring and shared team success.",
  },

  STABILITY_WELLBEING: {
    label:
      "Stability & Wellbeing",

    profileTitle:
      "Stability Focused",

    description:
      "Values security, clear expectations, balance and organizational support for wellbeing.",
  },

  PURPOSE_ETHICS: {
    label:
      "Purpose & Ethics",

    profileTitle:
      "Purpose Led",

    description:
      "Values meaningful work, ethical alignment and positive impact beyond personal benefit.",
  },
};


function round(
  value: number,
  digits = 2
) {
  const multiplier =
    10 ** digits;

  return Math.round(
    value *
    multiplier
  ) /
    multiplier;
}


function clamp(
  value: number,
  minimum: number,
  maximum: number
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
}


function humanizeKey(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "Other";
  }

  return value
    .replace(
      /_/g,
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}


function likertPercentage(
  average: number
) {
  /*
    Likert values are 1-5.

    1 -> 0%
    3 -> 50%
    5 -> 100%

    This is a profile index,
    NOT a correct/wrong score.
  */

  return round(
    clamp(
      (
        (
          average -
          1
        ) /
        4
      ) *
      100,
      0,
      100
    ),
    1
  );
}


function dimensionLevel(
  percentage: number
) {
  if (
    percentage >=
    80
  ) {
    return "Highly Pronounced";
  }

  if (
    percentage >=
    65
  ) {
    return "Strong";
  }

  if (
    percentage >=
    45
  ) {
    return "Balanced";
  }

  if (
    percentage >=
    30
  ) {
    return "Moderate";
  }

  return "Less Pronounced";
}


function maritimePerformanceBand(
  percentage: number
) {
  if (
    percentage >=
    85
  ) {
    return "Very Strong";
  }

  if (
    percentage >=
    70
  ) {
    return "Strong";
  }

  if (
    percentage >=
    55
  ) {
    return "Developing";
  }

  return "Needs Further Development";
}


function getDimensionDefinitions(
  testType:
    PsychometricTestType
) {
  switch (
    testType
  ) {
    case PsychometricTestType.BIG_FIVE:
      return BIG_FIVE_DIMENSIONS;

    case PsychometricTestType.PERSONALITY_16PF:
      return BEHAVIOURAL_DIMENSIONS;

    case PsychometricTestType.MOTIVATION_VALUES:
      return MOTIVATION_DIMENSIONS;

    default:
      return {};
  }
}


function getResultKind(
  testType:
    PsychometricTestType
) {
  return (
    testType ===
    PsychometricTestType.MARITIME_HUMAN_PERFORMANCE
      ? "MARITIME_SCORED"
      : "PROFILE_ANALYTICS"
  );
}


function buildLikertHeadline(
  testType:
    PsychometricTestType,
  dimensions: any[]
) {
  if (
    dimensions.length ===
    0
  ) {
    return "Your assessment profile is ready.";
  }


  const first =
    dimensions[0];

  const second =
    dimensions[1];


  if (!second) {
    return `${first.label} is your most pronounced area.`;
  }


  if (
    testType ===
    PsychometricTestType.BIG_FIVE
  ) {
    return `${first.label} and ${second.label} are your strongest areas.`;
  }


  if (
    testType ===
    PsychometricTestType.PERSONALITY_16PF
  ) {
    return `${first.label} and ${second.label} are your most pronounced behavioural patterns.`;
  }


  return `${first.label} and ${second.label} are your strongest motivational drivers.`;
}


function buildLikertSummary(
  testType:
    PsychometricTestType,
  dimensions: any[]
) {
  if (
    dimensions.length ===
    0
  ) {
    return (
      "Your responses have been recorded. " +
      "This profile is intended for reflection and personal development."
    );
  }


  const strongest =
    dimensions
      .slice(
        0,
        2
      )
      .map(
        (dimension) =>
          dimension.label
      )
      .join(
        " and "
      );


  if (
    testType ===
    PsychometricTestType.BIG_FIVE
  ) {
    return (
      `Your responses show the strongest relative tendencies in ${strongest}. ` +
      "The profile describes self-reported preferences and should be interpreted as developmental information rather than a diagnosis."
    );
  }


  if (
    testType ===
    PsychometricTestType.PERSONALITY_16PF
  ) {
    return (
      `Your responses show the most pronounced behavioural preferences in ${strongest}. ` +
      "These results describe workplace-style tendencies and are not a judgement of ability or suitability."
    );
  }


  return (
    `Your responses indicate that ${strongest} currently have the strongest influence on what motivates you. ` +
    "Motivational priorities can change with role, circumstances and experience."
  );
}


function buildMaritimeGroup(
  questions: any[],
  field:
    | "domain"
    | "competency"
) {
  const groups =
    new Map<
      string,
      {
        correct: number;
        total: number;
      }
    >();


  for (
    const item
    of questions
  ) {
    const key =
      item
        .question[
        field
      ] ||
      "Other";


    const current =
      groups.get(
        key
      ) || {
        correct: 0,
        total: 0,
      };


    current.total +=
      1;


    if (
      item.isCorrect ===
      true
    ) {
      current.correct +=
        1;
    }


    groups.set(
      key,
      current
    );
  }


  return Array.from(
    groups.entries()
  )
    .map(
      ([
        key,
        values,
      ]) => {
        const percentage =
          values.total
            ? round(
                (
                  values.correct /
                  values.total
                ) *
                  100,
                1
              )
            : 0;


        return {
          key,

          label:
            humanizeKey(
              key
            ),

          score:
            values.correct,

          maxScore:
            values.total,

          percentage,

          level:
            maritimePerformanceBand(
              percentage
            ),
        };
      }
    )
    .sort(
      (
        left,
        right
      ) =>
        right.percentage -
        left.percentage
    );
}


async function correctAnswersAreUnlocked(
  userId: string,
  attemptId: string
) {
  const transaction =
    await prisma
      .tokenTransaction
      .findFirst({
        where: {
          userId,

          featureKey:
            CORRECT_ANSWER_FEATURE_KEY,

          referenceId:
            attemptId,

          type:
            TokenTransactionType.DEBIT,

          source:
            TokenTransactionSource.FEATURE,
        },

        select: {
          id:
            true,
        },
      });


  return Boolean(
    transaction
  );
}


export async function getPsychometricAnalysis(
  userId: string,
  attemptId: string
) {
  const attempt =
    await prisma
      .psychometricAttempt
      .findFirst({
        where: {
          id:
            attemptId,

          userId,

          status:
            PsychometricAttemptStatus.COMPLETED,
        },

        include: {
          user: {
            select: {
              id:
                true,

              fullName:
                true,
            },
          },

          test:
            true,

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
      "Completed assessment result not found.",
      404,
      "RESULT_NOT_FOUND"
    );
  }


  const common = {
    attemptId:
      attempt.id,

    attemptNumber:
      attempt.attemptNumber,

    resultKind:
      getResultKind(
        attempt.test.type
      ),

    participant: {
      id:
        attempt.user.id,

      fullName:
        attempt.user
          .fullName,
    },

    test: {
      id:
        attempt.test.id,

      code:
        attempt.test.code,

      title:
        attempt.test.title,

      description:
        attempt.test
          .description,

      type:
        attempt.test.type,
    },

    startedAt:
      attempt.startedAt,

    completedAt:
      attempt.completedAt,

    legal: {
      disclaimerVersion:
        attempt
          .disclaimerAcknowledgement
          ?.disclaimerVersion ??
        null,

      acknowledgedAt:
        attempt
          .disclaimerAcknowledgement
          ?.acknowledgedAt ??
        null,

      disclaimerText:
        attempt
          .disclaimerAcknowledgement
          ?.disclaimerTextSnapshot ??
        null,

      acknowledgementText:
        attempt
          .disclaimerAcknowledgement
          ?.acknowledgementTextSnapshot ??
        null,
    },
  };


  // =====================================================
  // MARITIME HUMAN PERFORMANCE
  // =====================================================

  if (
    attempt.test.type ===
    PsychometricTestType.MARITIME_HUMAN_PERFORMANCE
  ) {
    const answersUnlocked =
      await correctAnswersAreUnlocked(
        userId,
        attempt.id
      );


    const percentage =
      Number(
        attempt.percentage ??
        0
      );


    const sections =
      [...attempt.sections]
        .sort(
          (
            left,
            right
          ) =>
            left.section
              .sortOrder -
            right.section
              .sortOrder
        )
        .map(
          (item) => {
            const maxScore =
              Number(
                item.maxScore ??
                0
              );

            const score =
              Number(
                item.score ??
                0
              );

            const sectionPercentage =
              maxScore >
              0
                ? round(
                    (
                      score /
                      maxScore
                    ) *
                      100,
                    1
                  )
                : 0;


            return {
              code:
                item.section
                  .code,

              title:
                item.section
                  .title,

              score,

              maxScore,

              percentage:
                sectionPercentage,

              level:
                maritimePerformanceBand(
                  sectionPercentage
                ),
            };
          }
        );


    const domains =
      buildMaritimeGroup(
        attempt.questions,
        "domain"
      );


    const competencies =
      buildMaritimeGroup(
        attempt.questions,
        "competency"
      );


    const strongest =
      domains
        .slice(
          0,
          3
        );


    const development =
      [...domains]
        .sort(
          (
            left,
            right
          ) =>
            left.percentage -
            right.percentage
        )
        .slice(
          0,
          Math.min(
            2,
            domains.length
          )
        );


    const headline =
      strongest.length
        ? `Your strongest observed performance was in ${strongest
            .slice(
              0,
              2
            )
            .map(
              (item) =>
                item.label
            )
            .join(
              " and "
            )}.`
        : "Your Maritime Human Performance result is ready.";


    const summary =
      (
        `You answered ${Number(
          attempt.score ??
          0
        )} of ${Number(
          attempt.maxScore ??
          0
        )} questions correctly, giving an overall result of ${round(
          percentage,
          1
        )}%. ` +
        "The domain and competency breakdown is intended to support reflection on relative strengths and development areas."
      );


    const responses =
      attempt.questions.map(
        (
          item,
          index
        ) => {
          const question =
            item.question;


          const optionMap:
            Record<
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


          const selectedOption =
            item.selectedOption;


          const correctOption =
            answersUnlocked
              ? question
                  .correctOption
              : null;


          return {
            questionNumber:
              index + 1,

            attemptQuestionId:
              item.id,

            questionId:
              item.questionId,

            itemCode:
              question.itemCode,

            sectionCode:
              item.sectionCode,

            domain:
              question.domain,

            competency:
              question.competency,

            questionText:
              question.questionText,

            options: [
              {
                key:
                  "A",

                text:
                  question.optionA,
              },
              {
                key:
                  "B",

                text:
                  question.optionB,
              },
              {
                key:
                  "C",

                text:
                  question.optionC,
              },
              {
                key:
                  "D",

                text:
                  question.optionD,
              },
            ].filter(
              (option) =>
                Boolean(
                  option.text
                )
            ),

            selectedOption,

            selectedOptionText:
              selectedOption
                ? optionMap[
                    selectedOption
                  ] ||
                  null
                : null,

            correctOption,

            correctOptionText:
              correctOption
                ? optionMap[
                    correctOption
                  ] ||
                  null
                : null,

            isCorrect:
              answersUnlocked
                ? item.isCorrect
                : null,
          };
        }
      );


    return {
      ...common,

      score: {
        correct:
          Number(
            attempt.score ??
            0
          ),

        total:
          Number(
            attempt.maxScore ??
            attempt.questions
              .length
          ),

        percentage:
          round(
            percentage,
            1
          ),

        level:
          maritimePerformanceBand(
            percentage
          ),
      },

      answered:
        attempt.questions
          .filter(
            (item) =>
              Boolean(
                item.selectedOption
              )
          )
          .length,

      unanswered:
        attempt.questions
          .filter(
            (item) =>
              !item.selectedOption
          )
          .length,

      sections,

      domains,

      competencies,

      analysis: {
        headline,

        summary,

        strengths:
          strongest.map(
            (item) => ({
              key:
                item.key,

              title:
                item.label,

              percentage:
                item.percentage,

              text:
                `Observed performance in ${item.label} was ${item.percentage}%.`,
            })
          ),

        developmentAreas:
          development.map(
            (item) => ({
              key:
                item.key,

              title:
                item.label,

              percentage:
                item.percentage,

              text:
                `This result suggests that ${item.label} may benefit from further reflection, practice or development.`,
            })
          ),
      },

      answersUnlocked,

      answerKeyAvailable:
        answersUnlocked,

      responses,
    };
  }


  // =====================================================
  // PROFILE / LIKERT ANALYTICS
  // =====================================================

  const definitions =
    getDimensionDefinitions(
      attempt.test.type
    );


  const dimensionValues =
    new Map<
      string,
      number[]
    >();


  const responses:
    any[] = [];


  for (
    let index = 0;
    index <
    attempt.questions.length;
    index += 1
  ) {
    const item =
      attempt.questions[
        index
      ];


    if (
      item.likertValue ===
      null
    ) {
      continue;
    }


    const rawValue =
      Number(
        item.likertValue
      );


    const scoredValue =
      item.question
        .reverseScored
        ? 6 -
          rawValue
        : rawValue;


    const traitKey =
      item.question
        .traitKey ||
      "UNMAPPED";


    const values =
      dimensionValues.get(
        traitKey
      ) ||
      [];


    values.push(
      scoredValue
    );


    dimensionValues.set(
      traitKey,
      values
    );


    const definition =
      definitions[
        traitKey
      ];


    responses.push({
      questionNumber:
        index + 1,

      attemptQuestionId:
        item.id,

      questionId:
        item.questionId,

      itemCode:
        item.question
          .itemCode,

      questionText:
        item.question
          .questionText,

      dimensionKey:
        traitKey,

      dimensionLabel:
        definition
          ?.label ||
        humanizeKey(
          traitKey
        ),

      rawValue,

      scoredValue,

      response:
        LIKERT_LABELS[
          rawValue
        ] ||
        String(
          rawValue
        ),

      reverseScored:
        item.question
          .reverseScored,
    });
  }


  const dimensions =
    Array.from(
      dimensionValues
        .entries()
    )
      .map(
        ([
          key,
          values,
        ]) => {
          const average =
            values.reduce(
              (
                total,
                value
              ) =>
                total +
                value,
              0
            ) /
            values.length;


          const percentage =
            likertPercentage(
              average
            );


          const definition =
            definitions[
              key
            ];


          return {
            key,

            label:
              definition
                ?.label ||
              humanizeKey(
                key
              ),

            profileTitle:
              definition
                ?.profileTitle ||
              humanizeKey(
                key
              ),

            description:
              definition
                ?.description ||
              "A self-reported preference shown in your responses.",

            average:
              round(
                average,
                2
              ),

            percentage,

            level:
              dimensionLevel(
                percentage
              ),

            responseCount:
              values.length,
          };
        }
      )
      .sort(
        (
          left,
          right
        ) =>
          right.percentage -
          left.percentage
      );


  const headline =
    buildLikertHeadline(
      attempt.test.type,
      dimensions
    );


  const summary =
    buildLikertSummary(
      attempt.test.type,
      dimensions
    );


  return {
    ...common,

    answered:
      responses.length,

    unanswered:
      attempt.questions.length -
      responses.length,

    analysis: {
      headline,

      summary,

      topDimensions:
        dimensions
          .slice(
            0,
            3
          )
          .map(
            (dimension) => ({
              key:
                dimension.key,

              title:
                dimension
                  .profileTitle,

              label:
                dimension.label,

              percentage:
                dimension
                  .percentage,

              level:
                dimension.level,

              text:
                dimension
                  .description,
            })
          ),

      reflectionAreas:
        [...dimensions]
          .sort(
            (
              left,
              right
            ) =>
              left.percentage -
              right.percentage
          )
          .slice(
            0,
            Math.min(
              2,
              dimensions.length
            )
          )
          .map(
            (dimension) => ({
              key:
                dimension.key,

              title:
                dimension.label,

              percentage:
                dimension
                  .percentage,

              text:
                dimension
                  .description,
            })
          ),
    },

    dimensions,

    /*
      Deliberately NO overall percentage / pass / fail.

      These are descriptive profile assessments,
      not right/wrong tests.
    */

    score:
      null,

    answersUnlocked:
      true,

    answerKeyAvailable:
      false,

    responses,
  };
}