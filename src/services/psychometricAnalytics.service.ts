import {
  PrismaClient,
  PsychometricAttemptStatus,
  PsychometricTestType,
  TokenTransactionSource,
  TokenTransactionType,
} from "@prisma/client";

import {
  getMaritimeCapabilityResult,
  getMaritimeOverallResult,
  readableSubskill,
} from "./psychometricResultRules";

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


function getLikertResponseLabel(
  responseFormat:
    | string
    | null
    | undefined,
  value: number
) {
  const format =
    String(
      responseFormat ||
      ""
    ).trim();


  if (
    format ===
    "Observed-behaviour frequency"
  ) {
    const labels:
      Record<number, string> = {
      1: "Never",
      2: "Rarely",
      3: "Sometimes",
      4: "Often",
      5: "Almost always",
    };


    return (
      labels[value] ||
      String(value)
    );
  }


  if (
    format ===
    "Self-report Likert"
  ) {
    const labels:
      Record<number, string> = {
      1: "Never / Strongly Disagree",
      2: "Rarely / Disagree",
      3: "Sometimes / Neutral",
      4: "Often / Agree",
      5: "Almost always / Strongly Agree",
    };


    return (
      labels[value] ||
      String(value)
    );
  }


  return (
    LIKERT_LABELS[value] ||
    String(value)
  );
}



/* ======================================================
   PROFILE DIMENSION DEFINITIONS

   IMPORTANT:
   These are deliberately retained so the existing
   Personality / Behaviour / Motivation result logic
   is NOT broken by the Maritime analytics change.
   ====================================================== */

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


/* ======================================================
   EXISTING PROFILE HELPERS

   Kept intentionally.

   This means Personality / Behaviour / Motivation
   continue producing the same result structure that
   your existing FE already understands.
   ====================================================== */

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
      (
        character
      ) =>
        character.toUpperCase()
    );
}


function likertPercentage(
  average: number
) {
  /*
    Existing profile calculation:

    1 -> 0%
    3 -> 50%
    5 -> 100%

    This is NOT a right/wrong score.
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
        (
          dimension
        ) =>
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


/* ======================================================
   TOKEN ANSWER-UNLOCK CHECK
   ====================================================== */

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


/* ======================================================
   MAIN ANALYTICS SERVICE
   ====================================================== */

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


  /* ====================================================
     MARITIME HUMAN PERFORMANCE

     Existing score + section flow is preserved.

     NEW:
     Separate user-facing capabilities are added for the
     analytics screen.

     Internal domain codes such as PJSD / PLSC are not
     used as the main analytics labels.
     ==================================================== */

  if (
    attempt.test.type ===
    PsychometricTestType.MARITIME_HUMAN_PERFORMANCE
  ) {
    const answersUnlocked =
      await correctAnswersAreUnlocked(
        userId,
        attempt.id
      );


    const correct =
      Number(
        attempt.score ??
        0
      );


    const total =
      Number(
        attempt.maxScore ??
        attempt.questions.length
      );


    const percentage =
      Number(
        attempt.percentage ??
        (
          total >
          0
            ? (
                correct /
                total
              ) *
              100
            : 0
        )
      );


    /*
      The original Maritime result wording was authored for
      6 questions per capability / 18 overall.

      The assessment now uses 20 questions per capability /
      60 overall. Scale only for the legacy wording lookup,
      while keeping the real score and percentage below.
    */
    const legacyOverallScore =
      total > 0
        ? Math.round(
            (
              correct /
              total
            ) *
            18
          )
        : 0;


    const overallBase =
      getMaritimeOverallResult(
        legacyOverallScore
      );


    const overall = {
      ...overallBase,

      score:
        correct,

      maxScore:
        total,

      percentage:
        round(
          percentage,
          1
        ),
    };


    /* ==================================================
       KEEP EXISTING SCORE BREAKDOWN

       PJS = Pre-Joining
       PLA = Leadership
       SHF = Safety & Human Factors

       This avoids breaking the score UI you already like.
       ================================================== */

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
          (
            item
          ) => {
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


            const legacyCapabilityScore =
              maxScore > 0
                ? Math.round(
                    (
                      score /
                      maxScore
                    ) *
                    6
                  )
                : 0;


            const capability =
              getMaritimeCapabilityResult(
                String(
                  item.section.code
                ),
                legacyCapabilityScore
              );


            return {
              /*
                Existing fields
              */

              code:
                item.section.code,

              title:
                item.section.title,

              score,

              maxScore,

              percentage:
                sectionPercentage,

              level:
                capability.band,


              /*
                Additional analytics fields.

                These do not remove or rename
                any old fields.
              */

              capabilityKey:
                capability.key,

              capabilityLabel:
                capability.label,

              resultTitle:
                capability.resultTitle,

              resultText:
                capability.resultText,
            };
          }
        );


    /* ==================================================
       USER-FACING MARITIME CAPABILITY ANALYTICS
       ================================================== */

    const capabilities =
      sections.map(
        (
          section
        ) => {
          return {
            key:
              section.capabilityKey,

            code:
              section.code,

            label:
              section.capabilityLabel,

            title:
              section.capabilityLabel,

            /*
              Expose the real 20-question section score,
              not the internal 0-6 legacy lookup score.
            */

            score:
              section.score,

            maxScore:
              section.maxScore,

            percentage:
              section.percentage,

            band:
              section.level,

            level:
              section.level,

            resultTitle:
              section.resultTitle,

            resultText:
              section.resultText,
          };
        }
      );


    const sortedCapabilities =
      [...capabilities].sort(
        (
          first,
          second
        ) =>
          second.percentage -
          first.percentage
      );


    const strongestCapability =
      sortedCapabilities[0] ??
      null;


    const developmentCapability =
      [...capabilities]
        .sort(
          (
            first,
            second
          ) =>
            first.percentage -
            second.percentage
        )[0] ??
      null;


    /* ==================================================
       USER-READABLE SUBSKILL CHIPS

       Internal shorthand codes are discarded by
       readableSubskill().
       ================================================== */

    const strengthSet =
      new Set<string>();


    const developmentSet =
      new Set<string>();


    for (
      const item
      of attempt.questions
    ) {
      const metadata =
        item.question
          .competency ||
        item.question
          .domain;


      const readable =
        readableSubskill(
          metadata
        );


      if (!readable) {
        continue;
      }


      if (
        item.isCorrect ===
        true
      ) {
        strengthSet.add(
          readable
        );
      } else {
        developmentSet.add(
          readable
        );
      }
    }


    const strengthChips =
      Array.from(
        strengthSet
      ).slice(
        0,
        6
      );


    const developmentPriorities =
      Array.from(
        developmentSet
      ).slice(
        0,
        3
      );


    /* ==================================================
       BACKWARDS-COMPATIBLE STRENGTHS / DEVELOPMENT AREAS

       Existing FE/PDF code may already read:

       analysis.strengths
       analysis.developmentAreas

       so keep these properties.
       ================================================== */

    const strengths =
      sortedCapabilities
        .filter(
          (
            capability
          ) =>
            capability.percentage >=
            66.7
        )
        .slice(
          0,
          3
        )
        .map(
          (
            capability
          ) => ({
            key:
              capability.key,

            title:
              capability.label,

            percentage:
              capability.percentage,

            text:
              capability.resultText,

            resultTitle:
              capability.resultTitle,

            level:
              capability.band,
          })
        );


    const developmentAreas =
      [...capabilities]
        .filter(
          (
            capability
          ) =>
            capability.percentage <=
            50
        )
        .sort(
          (
            first,
            second
          ) =>
            first.percentage -
            second.percentage
        )
        .slice(
          0,
          3
        )
        .map(
          (
            capability
          ) => ({
            key:
              capability.key,

            title:
              capability.label,

            percentage:
              capability.percentage,

            text:
              capability.resultText,

            resultTitle:
              capability.resultTitle,

            level:
              capability.band,
          })
        );


    /* ==================================================
       ANSWER REVIEW
       ================================================== */

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
              ? question.correctOption
              : null;


          return {
            questionNumber:
              index +
              1,

            attemptQuestionId:
              item.id,

            questionId:
              item.questionId,

            itemCode:
              question.itemCode,

            /*
              Kept because existing FE may use it
              to group answer-sheet questions.

              It should NOT be rendered as a
              user-facing capability label.
            */

            sectionCode:
              item.sectionCode,

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
              (
                option
              ) =>
                Boolean(
                  option.text
                )
            ),

            selectedOption,

            selectedOptionText:
              selectedOption
                ? optionMap[
                    selectedOption
                  ] ??
                  null
                : null,

            correctOption,

            correctOptionText:
              correctOption
                ? optionMap[
                    correctOption
                  ] ??
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

      /*
        EXISTING score object preserved.
      */

      score: {
        correct,

        total,

        percentage:
          round(
            percentage,
            1
          ),

        /*
          We improve only the descriptive label.
        */

        level:
          overall.title,

        band:
          overall.title,
      },


      /*
        New detailed overall interpretation.
      */

      overall,


      answered:
        attempt.questions
          .filter(
            (
              item
            ) =>
              Boolean(
                item.selectedOption
              )
          )
          .length,


      unanswered:
        attempt.questions
          .filter(
            (
              item
            ) =>
              !item.selectedOption
          )
          .length,


      /*
        EXISTING score-breakdown structure.
      */

      sections,


      /*
        NEW user-facing analytics structure.
      */

      capabilities,


      analysis: {
        headline:
          overall.title,

        summary:
          overall.summary,

        strongestCapability,

        developmentCapability,

        /*
          Existing FE compatibility.
        */

        strengths,

        developmentAreas,

        /*
          Additional finer-detail information.
        */

        strengthChips,

        developmentPriorities,
      },


      /*
        Compatibility:
        old analytics/report code may expect "domains".

        We now supply readable capability objects instead
        of internal PJSD/PLSC groups.
      */

      domains:
        capabilities,


      /*
        Deliberately empty so internal competency codes
        do not accidentally appear in the user result.
      */

      competencies:
        [],


      answersUnlocked,

      answerKeyAvailable:
        answersUnlocked,

      responses,
    };
  }


  /* ====================================================
     PROFILE / LIKERT ANALYTICS

     IMPORTANT:

     This is intentionally the EXISTING behaviour used by:

     - Personality Insights
     - Behavioural Patterns
     - Motivation & Values

     No Maritime changes are allowed to alter this flow.
     ==================================================== */

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


    /*
      Existing reverse-scoring behaviour.
    */

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
        index +
        1,

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
        getLikertResponseLabel(
          item.question
            .competency,
          rawValue
        ),

      responseFormat:
        item.question
          .competency ||
        null,

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


          /*
            Existing calculation preserved.
          */

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
            (
              dimension
            ) => ({
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
            (
              dimension
            ) => ({
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
      Personality / Behaviour / Motivation
      deliberately have no correct/wrong score.
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