import "dotenv/config";

import {
  PrismaClient,
  PsychometricQuestionType,
  PsychometricSectionCode,
  PsychometricTestType,
} from "@prisma/client";

import maritimeQuestionBank
  from "./data/maritimeQuestionBank.json";


import personalPsychometricQuestionBank
  from "./data/personalPsychometricQuestionBank.json";

const prisma =
  new PrismaClient();


const TESTS = [
  {
    code:
      "maritime-human-performance",
    title:
      "Maritime Human Performance Analysis",
    description:
      "A structured maritime human-performance assessment covering pre-joining capability, leadership and safety human factors.",
    type:
      PsychometricTestType.MARITIME_HUMAN_PERFORMANCE,
    firstAttemptFree:
      true,
    repeatTokenCost:
      5,
    sortOrder:
      1,
  },
  {
    code:
      "personality-insights",
    title:
      "Personality Insights",
    description:
      "Explore broad patterns in the way you think, work and interact with others.",
    type:
      PsychometricTestType.BIG_FIVE,
    firstAttemptFree:
      true,
    repeatTokenCost:
      3,
    sortOrder:
      2,
  },
  {
    code:
      "behavioural-patterns",
    title:
      "Behavioural Patterns",
    description:
      "Explore behavioural tendencies and preferences across different situations.",
    type:
      PsychometricTestType.PERSONALITY_16PF,
    firstAttemptFree:
      true,
    repeatTokenCost:
      3,
    sortOrder:
      3,
  },
  {
    code:
      "motivation-values",
    title:
      "Motivation & Values",
    description:
      "Explore the values and motivations that influence how you approach work and life.",
    type:
      PsychometricTestType.MOTIVATION_VALUES,
    firstAttemptFree:
      true,
    repeatTokenCost:
      3,
    sortOrder:
      4,
  },
];


const BIG_FIVE = [
  ["BF-01", "I enjoy exploring new ideas and unfamiliar ways of thinking.", "OPENNESS", false],
  ["BF-02", "I am interested in theoretical, abstract, or complex concepts.", "OPENNESS", false],
  ["BF-03", "I often look for creative ways to solve problems.", "OPENNESS", false],
  ["BF-04", "I enjoy trying new experiences rather than always following familiar routines.", "OPENNESS", false],

  ["BF-05", "I pay close attention to details when completing important tasks.", "CONSCIENTIOUSNESS", false],
  ["BF-06", "I prefer to plan and organize my work before starting.", "CONSCIENTIOUSNESS", false],
  ["BF-07", "I reliably complete tasks and commitments even when difficulties arise.", "CONSCIENTIOUSNESS", false],
  ["BF-08", "I keep my work, responsibilities, and deadlines well organized.", "CONSCIENTIOUSNESS", false],

  ["BF-09", "I feel energized when interacting with groups of people.", "EXTRAVERSION", false],
  ["BF-10", "I usually feel comfortable starting conversations with others.", "EXTRAVERSION", false],
  ["BF-11", "I openly express my thoughts and opinions during discussions.", "EXTRAVERSION", false],
  ["BF-12", "I enjoy working in active and highly collaborative environments.", "EXTRAVERSION", false],

  ["BF-13", "I make an effort to understand the feelings and concerns of others.", "AGREEABLENESS", false],
  ["BF-14", "I prefer resolving disagreements through cooperation and compromise.", "AGREEABLENESS", false],
  ["BF-15", "I generally trust that other people have good intentions.", "AGREEABLENESS", false],
  ["BF-16", "I am willing to support colleagues when they need assistance.", "AGREEABLENESS", false],

  ["BF-17", "I remain calm and focused when working under pressure.", "EMOTIONAL_STABILITY", false],
  ["BF-18", "I often worry about situations that are outside my control.", "EMOTIONAL_STABILITY", true],
  ["BF-19", "Small frustrations can significantly affect my mood.", "EMOTIONAL_STABILITY", true],
  ["BF-20", "I recover quickly after setbacks, mistakes, or disappointing outcomes.", "EMOTIONAL_STABILITY", false],
] as const;


type LikertDimensionSeed = readonly [
  itemCode: string,
  questionText: string,
  traitKey: string,
  reverseScored: boolean
];


const BEHAVIOURAL:
  readonly LikertDimensionSeed[] = [
  [
    "BP-01",
    "I enjoy solving complex problems that require logical thinking.",
    "ANALYTICAL_THINKING",
    false,
  ],
  [
    "BP-02",
    "I speak up confidently when I disagree with someone.",
    "ASSERTIVE_COMMUNICATION",
    false,
  ],
  [
    "BP-03",
    "I prefer working behind the scenes rather than being the center of attention.",
    "RESERVED_EXPRESSION",
    false,
  ],
  [
    "BP-04",
    "I follow established rules and procedures even when they make a task slower.",
    "STRUCTURE_ORIENTATION",
    false,
  ],
  [
    "BP-05",
    "I adapt quickly when unexpected changes occur.",
    "ADAPTABILITY",
    false,
  ],
  [
    "BP-06",
    "I rely more on facts and evidence than intuition when making important decisions.",
    "ANALYTICAL_THINKING",
    false,
  ],
  [
    "BP-07",
    "I am comfortable making calculated decisions when all the information is not available.",
    "DECISIVENESS_INITIATIVE",
    false,
  ],
  [
    "BP-08",
    "I am strongly affected by art, music, creativity, or beautiful surroundings.",
    "SENSITIVITY_REFLECTION",
    false,
  ],
  [
    "BP-09",
    "I usually keep my personal feelings private.",
    "RESERVED_EXPRESSION",
    false,
  ],
  [
    "BP-10",
    "I often think deeply about the reasons behind events and experiences.",
    "SENSITIVITY_REFLECTION",
    false,
  ],
  [
    "BP-11",
    "I feel comfortable speaking or presenting in front of a large audience.",
    "ASSERTIVE_COMMUNICATION",
    false,
  ],
  [
    "BP-12",
    "I prefer proven and traditional methods over completely new approaches.",
    "STRUCTURE_ORIENTATION",
    false,
  ],
  [
    "BP-13",
    "I naturally take charge when a group lacks clear direction.",
    "DECISIVENESS_INITIATIVE",
    false,
  ],
  [
    "BP-14",
    "I can become distracted when there is noise or activity around me.",
    "FOCUS_RESILIENCE",
    true,
  ],
  [
    "BP-15",
    "I enjoy understanding the motives behind people's behaviour.",
    "SOCIAL_INSIGHT_DIPLOMACY",
    false,
  ],
  [
    "BP-16",
    "I remain polite and respectful even when I am frustrated or disagree strongly.",
    "SOCIAL_INSIGHT_DIPLOMACY",
    false,
  ],
  [
    "BP-17",
    "I prefer completing important tasks independently rather than depending heavily on others.",
    "INDEPENDENT_JUDGEMENT",
    false,
  ],
  [
    "BP-18",
    "I am comfortable questioning existing rules or authority when I believe improvement is needed.",
    "INDEPENDENT_JUDGEMENT",
    false,
  ],
  [
    "BP-19",
    "Criticism of my work or ideas can affect me strongly.",
    "FOCUS_RESILIENCE",
    true,
  ],
  [
    "BP-20",
    "I prefer a predictable routine rather than frequent unexpected changes.",
    "ADAPTABILITY",
    true,
  ],
];


const MOTIVATION_VALUES: readonly LikertDimensionSeed[] = [
  [
    "MV-01",
    "Opportunities for career advancement strongly motivate me.",
    "GROWTH_ACHIEVEMENT",
    false,
  ],
  [
    "MV-02",
    "I feel most satisfied when I achieve challenging goals.",
    "GROWTH_ACHIEVEMENT",
    false,
  ],
  [
    "MV-03",
    "Recognition for good performance is important to me.",
    "GROWTH_ACHIEVEMENT",
    false,
  ],
  [
    "MV-04",
    "I actively seek constructive feedback that can help me improve.",
    "GROWTH_ACHIEVEMENT",
    false,
  ],

  [
    "MV-05",
    "I perform best when I have freedom in deciding how to complete my work.",
    "AUTONOMY_LEADERSHIP",
    false,
  ],
  [
    "MV-06",
    "I am motivated by opportunities to lead teams or projects.",
    "AUTONOMY_LEADERSHIP",
    false,
  ],
  [
    "MV-07",
    "Having influence over important organizational decisions is important to me.",
    "AUTONOMY_LEADERSHIP",
    false,
  ],
  [
    "MV-08",
    "I prefer taking personal responsibility for both the success and failure of my work.",
    "AUTONOMY_LEADERSHIP",
    false,
  ],

  [
    "MV-09",
    "Working in a supportive and friendly team environment is important to me.",
    "COLLABORATION_RELATIONSHIPS",
    false,
  ],
  [
    "MV-10",
    "I find satisfaction in mentoring, supporting, or developing other people.",
    "COLLABORATION_RELATIONSHIPS",
    false,
  ],
  [
    "MV-11",
    "I prefer working toward shared team goals rather than competing only for individual success.",
    "COLLABORATION_RELATIONSHIPS",
    false,
  ],
  [
    "MV-12",
    "Building positive relationships with colleagues is important to my job satisfaction.",
    "COLLABORATION_RELATIONSHIPS",
    false,
  ],

  [
    "MV-13",
    "Job security is more important to me than the possibility of earning unpredictable financial rewards.",
    "STABILITY_WELLBEING",
    false,
  ],
  [
    "MV-14",
    "Maintaining a healthy balance between my work and personal life is important to me.",
    "STABILITY_WELLBEING",
    false,
  ],
  [
    "MV-15",
    "I work best when my responsibilities and expectations are clearly defined.",
    "STABILITY_WELLBEING",
    false,
  ],
  [
    "MV-16",
    "I value organizations that actively support employee health and well-being.",
    "STABILITY_WELLBEING",
    false,
  ],

  [
    "MV-17",
    "I find it easier to stay engaged when I believe in the ethical values of the organization.",
    "PURPOSE_ETHICS",
    false,
  ],
  [
    "MV-18",
    "Knowing that my work creates a positive impact motivates me.",
    "PURPOSE_ETHICS",
    false,
  ],
  [
    "MV-19",
    "I value organizations that contribute positively to society and the environment.",
    "PURPOSE_ETHICS",
    false,
  ],
  [
    "MV-20",
    "I am sometimes willing to give up personal benefits when doing so creates a greater benefit for others.",
    "PURPOSE_ETHICS",
    false,
  ],
];


type MaritimeQuestion = {
  itemCode: string;
  programme: "PJS" | "PLA" | "SHF";
  domain: string;
  competency: string;
  question: string;
  A: string;
  B: string;
  C: string;
  D: string;
  answerKey: "A" | "B" | "C" | "D";
};


async function seedTests() {
  const ids =
    new Map<
      PsychometricTestType,
      string
    >();

  for (
    const data
    of TESTS
  ) {
    const test =
      await prisma.psychometricTest
        .upsert({
          where: {
            type:
              data.type,
          },
          update: {
            code:
              data.code,
            title:
              data.title,
            description:
              data.description,
            firstAttemptFree:
              data.firstAttemptFree,
            repeatTokenCost:
              data.repeatTokenCost,
            isActive:
              true,
            sortOrder:
              data.sortOrder,
          },
          create: {
            ...data,
            isActive:
              true,
          },
        });

    ids.set(
      data.type,
      test.id
    );
  }

  return ids;
}


async function seedMaritimeSections(
  testId: string
) {
  const sections = [
    {
      code:
        PsychometricSectionCode.PJS,
      title:
        "Pre-Joining",
      durationMinutes:
        30,
      questionsPerAttempt:
        6,
      sortOrder:
        1,
    },
    {
      code:
        PsychometricSectionCode.PLA,
      title:
        "Leadership",
      durationMinutes:
        25,
      questionsPerAttempt:
        6,
      sortOrder:
        2,
    },
    {
      code:
        PsychometricSectionCode.SHF,
      title:
        "Safety & Human Factors",
      durationMinutes:
        25,
      questionsPerAttempt:
        6,
      sortOrder:
        3,
    },
  ];

  for (
    const section
    of sections
  ) {
    await prisma.psychometricSection
      .upsert({
        where: {
          testId_code: {
            testId,
            code:
              section.code,
          },
        },
        update: {
          title:
            section.title,
          durationMinutes:
            section.durationMinutes,
          questionsPerAttempt:
            section.questionsPerAttempt,
          sortOrder:
            section.sortOrder,
          isLockedAfterSubmit:
            true,
        },
        create: {
          testId,
          ...section,
          isLockedAfterSubmit:
            true,
        },
      });
  }
}


async function seedMaritimeQuestions(
  testId: string
) {
  const sections =
    await prisma.psychometricSection
      .findMany({
        where: {
          testId,
        },
      });

  const sectionMap =
    new Map(
      sections.map(
        (section) => [
          section.code,
          section.id,
        ]
      )
    );

  const questions =
    maritimeQuestionBank as MaritimeQuestion[];

  for (
    let index = 0;
    index < questions.length;
    index += 1
  ) {
    const question =
      questions[index];

    const code =
      question.programme as PsychometricSectionCode;

    const sectionId =
      sectionMap.get(
        code
      );

    if (!sectionId) {
      throw new Error(
        `Missing section for ${question.programme}`
      );
    }

    await prisma.psychometricQuestion
      .upsert({
        where: {
          itemCode:
            question.itemCode,
        },
        update: {
          testId,
          sectionId,
          domain:
            question.domain,
          competency:
            question.competency,
          questionText:
            question.question,
          questionType:
            PsychometricQuestionType.MULTIPLE_CHOICE,
          optionA:
            question.A,
          optionB:
            question.B,
          optionC:
            question.C,
          optionD:
            question.D,
          correctOption:
            question.answerKey,
          reverseScored:
            false,
          traitKey:
            null,
          sortOrder:
            index + 1,
          isActive:
            true,
        },
        create: {
          testId,
          sectionId,
          itemCode:
            question.itemCode,
          domain:
            question.domain,
          competency:
            question.competency,
          questionText:
            question.question,
          questionType:
            PsychometricQuestionType.MULTIPLE_CHOICE,
          optionA:
            question.A,
          optionB:
            question.B,
          optionC:
            question.C,
          optionD:
            question.D,
          correctOption:
            question.answerKey,
          reverseScored:
            false,
          traitKey:
            null,
          sortOrder:
            index + 1,
          isActive:
            true,
        },
      });
  }
}


async function seedBigFive(
  testId: string
) {
  for (
    let index = 0;
    index < BIG_FIVE.length;
    index += 1
  ) {
    const [
      itemCode,
      questionText,
      traitKey,
      reverseScored,
    ] =
      BIG_FIVE[index];

    await prisma.psychometricQuestion
      .upsert({
        where: {
          itemCode,
        },
        update: {
          testId,
          sectionId:
            null,
          questionText,
          questionType:
            PsychometricQuestionType.LIKERT_5,
          optionA:
            null,
          optionB:
            null,
          optionC:
            null,
          optionD:
            null,
          correctOption:
            null,
          traitKey,
          reverseScored,
          sortOrder:
            index + 1,
          isActive:
            true,
        },
        create: {
          testId,
          itemCode,
          questionText,
          questionType:
            PsychometricQuestionType.LIKERT_5,
          traitKey,
          reverseScored,
          sortOrder:
            index + 1,
          isActive:
            true,
        },
      });
  }
}


async function seedMappedLikert(
  testId: string,
  questions: readonly LikertDimensionSeed[]
) {
  for (
    let index = 0;
    index < questions.length;
    index += 1
  ) {
    const [
      itemCode,
      questionText,
      traitKey,
      reverseScored,
    ] =
      questions[index];


    await prisma.psychometricQuestion
      .upsert({
        where: {
          itemCode,
        },

        update: {
          testId,

          sectionId:
            null,

          questionText,

          questionType:
            PsychometricQuestionType.LIKERT_5,

          optionA:
            null,

          optionB:
            null,

          optionC:
            null,

          optionD:
            null,

          correctOption:
            null,

          traitKey,

          reverseScored,

          sortOrder:
            index + 1,

          isActive:
            true,
        },

        create: {
          testId,

          itemCode,

          questionText,

          questionType:
            PsychometricQuestionType.LIKERT_5,

          traitKey,

          reverseScored,

          sortOrder:
            index + 1,

          isActive:
            true,
        },
      });
  }
}


type ImportedProfileQuestion = {
  itemCode: string;
  targetTestType:
    | "BIG_FIVE"
    | "PERSONALITY_16PF"
    | "MOTIVATION_VALUES";
  traitKey: string;
  domain: string;
  questionText: string;
  responseFormat: string;
  sourceOptions: string;
  reverseScored: boolean;
  pairId: string | null;
  pairType: string | null;
  origin: string | null;
  access: string | null;
  activeForCurrentEngine: boolean;
};


async function seedImportedProfileQuestionBank(
  testIds: Map<
    PsychometricTestType,
    string
  >
) {
  const bank =
    personalPsychometricQuestionBank as
      ImportedProfileQuestion[];


  let imported =
    0;

  let deferred =
    0;


  for (
    let index = 0;
    index < bank.length;
    index += 1
  ) {
    const question =
      bank[index];


    /*
      Current Personality / Behavioural / Motivation
      engine is a scored 1-5 Likert engine.

      Keep unsupported narrative / descriptive items in
      the source JSON for later, but do not activate them
      until the response engine supports those formats.
    */

    if (
      !question.activeForCurrentEngine
    ) {
      deferred +=
        1;

      continue;
    }


    const testType =
      question.targetTestType as
        PsychometricTestType;


    const testId =
      testIds.get(
        testType
      );


    if (!testId) {
      throw new Error(
        `Missing psychometric test for imported question ${question.itemCode}.`
      );
    }


    await prisma
      .psychometricQuestion
      .upsert({
        where: {
          itemCode:
            question.itemCode,
        },

        update: {
          testId,

          sectionId:
            null,

          domain:
            question.domain,

          /*
            Reuse the existing optional competency field
            to retain the source response format without
            requiring a database migration.
          */
          competency:
            question.responseFormat,

          questionText:
            question.questionText,

          questionType:
            PsychometricQuestionType
              .LIKERT_5,

          optionA:
            null,

          optionB:
            null,

          optionC:
            null,

          optionD:
            null,

          correctOption:
            null,

          traitKey:
            question.traitKey,

          reverseScored:
            question.reverseScored,

          sortOrder:
            1000 + index,

          isActive:
            true,
        },

        create: {
          testId,

          sectionId:
            null,

          itemCode:
            question.itemCode,

          domain:
            question.domain,

          competency:
            question.responseFormat,

          questionText:
            question.questionText,

          questionType:
            PsychometricQuestionType
              .LIKERT_5,

          traitKey:
            question.traitKey,

          reverseScored:
            question.reverseScored,

          sortOrder:
            1000 + index,

          isActive:
            true,
        },
      });


    imported +=
      1;
  }


  return {
    imported,
    deferred,
    total:
      bank.length,
  };
}


async function main() {
  console.log(
    "Seeding psychometric assessments..."
  );

  const testIds =
    await seedTests();

  const maritimeTestId =
    testIds.get(
      PsychometricTestType.MARITIME_HUMAN_PERFORMANCE
    );

  const bigFiveTestId =
    testIds.get(
      PsychometricTestType.BIG_FIVE
    );

  const behaviouralTestId =
    testIds.get(
      PsychometricTestType.PERSONALITY_16PF
    );

  const motivationTestId =
    testIds.get(
      PsychometricTestType.MOTIVATION_VALUES
    );

  if (
    !maritimeTestId ||
    !bigFiveTestId ||
    !behaviouralTestId ||
    !motivationTestId
  ) {
    throw new Error(
      "Could not create all psychometric tests."
    );
  }

  await seedMaritimeSections(
    maritimeTestId
  );

  await seedMaritimeQuestions(
    maritimeTestId
  );

  await seedBigFive(
    bigFiveTestId
  );

  await seedMappedLikert(
    behaviouralTestId,
    BEHAVIOURAL
  );

  await seedMappedLikert(
    motivationTestId,
    MOTIVATION_VALUES
  );


  const importedBank =
    await seedImportedProfileQuestionBank(
      testIds
    );


  console.log(
    "Psychometric assessments seeded successfully."
  );

  console.log({
    importedProfileQuestions:
      importedBank.imported,
    deferredProfileQuestions:
      importedBank.deferred,
    suppliedProfileBankTotal:
      importedBank.total,
  });

  console.log({
    maritimeQuestions:
      (maritimeQuestionBank as MaritimeQuestion[]).length,
    bigFiveQuestions:
      BIG_FIVE.length,
    behaviouralQuestions:
      BEHAVIOURAL.length,
    motivationQuestions:
      MOTIVATION_VALUES.length,
    totalExpected:
      (maritimeQuestionBank as MaritimeQuestion[]).length +
      BIG_FIVE.length +
      BEHAVIOURAL.length +
      MOTIVATION_VALUES.length,
  });
}


main()
  .catch(
    (error) => {
      console.error(
        "Psychometric seed failed:",
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
