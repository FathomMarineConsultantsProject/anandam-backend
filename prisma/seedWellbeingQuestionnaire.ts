import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedOption = {
  value: string;
  label: string;
  sortOrder: number;
};

type SeedQuestion = {
  questionKey: string;
  questionText: string;
  helperText?: string;
  questionType: string;
  sortOrder: number;
  options?: SeedOption[];
};

type SeedQuestionnaire = {
  slug: string;
  category: string;
  title: string;
  refillIntervalDays: number;
  questions: SeedQuestion[];
};

const frequencyOptions: SeedOption[] = [
  {
    value: "NOT_AT_ALL",
    label: "Not at all",
    sortOrder: 1,
  },
  {
    value: "FEW_DAYS",
    label: "On a few days",
    sortOrder: 2,
  },
  {
    value: "MORE_THAN_HALF_DAYS",
    label: "On more than half the days",
    sortOrder: 3,
  },
  {
    value: "NEARLY_EVERY_DAY",
    label: "Nearly every day",
    sortOrder: 4,
  },
];

const severityOptions: SeedOption[] = [
  {
    value: "NOT_AT_ALL",
    label: "Not at all",
    sortOrder: 1,
  },
  {
    value: "MILD",
    label: "Mild",
    sortOrder: 2,
  },
  {
    value: "MODERATE",
    label: "Moderate",
    sortOrder: 3,
  },
  {
    value: "SEVERE",
    label: "Severe",
    sortOrder: 4,
  },
  {
    value: "VERY_SEVERE",
    label: "Very Severe",
    sortOrder: 5,
  },
];

const questionnaires: SeedQuestionnaire[] = [
  // ======================================================
  // HOW YOU ARE FEELING
  // ======================================================

  {
    slug: "how-you-are-feeling",
    category: "WELLBEING",
    title: "How you are feeling",
    refillIntervalDays: 15,

    questions: [
      {
        questionKey: "little_interest_or_enjoyment",
        questionText:
          "Have you had little interest or enjoyment in doing things?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 1,
        options: frequencyOptions,
      },
      {
        questionKey: "sad_low_or_without_hope",
        questionText:
          "Have you felt sad, low, or without hope?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 2,
        options: frequencyOptions,
      },
      {
        questionKey: "sleep_difficulty_or_oversleeping",
        questionText:
          "Have you had trouble falling asleep, staying asleep, or sleeping too much?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 3,
        options: frequencyOptions,
      },
      {
        questionKey: "tired_or_low_energy",
        questionText:
          "Have you felt tired or low on energy?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 4,
        options: frequencyOptions,
      },
      {
        questionKey: "appetite_changes",
        questionText:
          "Have you had little appetite or eaten more than usual?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 5,
        options: frequencyOptions,
      },
      {
        questionKey: "feeling_bad_about_self",
        questionText:
          "Have you felt bad about yourself, felt like a failure, or felt that you’ve let yourself or your family down?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 6,
        options: frequencyOptions,
      },
      {
        questionKey: "difficulty_focusing",
        questionText:
          "Have you found it hard to focus on things, like reading or watching TV?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 7,
        options: frequencyOptions,
      },
      {
        questionKey: "slowed_or_restless",
        questionText:
          "Have you moved or spoken unusually slowly, or been much more restless than usual?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 8,
        options: frequencyOptions,
      },
      {
        questionKey: "thoughts_of_hurting_yourself",
        questionText:
          "Have you had thoughts of hurting yourself?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 9,
        options: frequencyOptions,
      },
    ],
  },

  // ======================================================
  // SLEEP AND REST
  // ======================================================

  {
    slug: "sleep-and-rest",
    category: "SLEEP",
    title: "Sleep and rest",
    refillIntervalDays: 15,

    questions: [
      {
        questionKey: "sleep_onset_time",
        questionText:
          "How long does it usually take you to fall asleep?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 1,

        options: [
          {
            value: "LESS_THAN_15_MINUTES",
            label: "Less than 15 minutes",
            sortOrder: 1,
          },
          {
            value: "MINUTES_15_TO_30",
            label: "15–30 minutes",
            sortOrder: 2,
          },
          {
            value: "MINUTES_31_TO_60",
            label: "31–60 minutes",
            sortOrder: 3,
          },
          {
            value: "MORE_THAN_60_MINUTES",
            label: "More than 60 minutes",
            sortOrder: 4,
          },
          {
            value: "NOT_SURE",
            label: "Not sure",
            sortOrder: 5,
          },
        ],
      },
      {
        questionKey: "sleep_duration_24h",
        questionText:
          "How much sleep do you usually get in 24 hours, including naps?",
        helperText:
          "Enter hours and minutes. The frontend sends the answer as total minutes.",
        questionType: "DURATION_MINUTES",
        sortOrder: 2,
      },
      {
        questionKey: "trouble_falling_asleep",
        questionText:
          "How much trouble have you had falling asleep?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 3,
        options: severityOptions,
      },
      {
        questionKey: "waking_too_early",
        questionText:
          "How much trouble have you had waking up too early?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 4,
        options: severityOptions,
      },
      {
        questionKey: "sleep_satisfaction",
        questionText:
          "How satisfied are you with your sleep?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 5,

        options: [
          {
            value: "VERY_SATISFIED",
            label: "Very satisfied",
            sortOrder: 1,
          },
          {
            value: "SATISFIED",
            label: "Satisfied",
            sortOrder: 2,
          },
          {
            value: "NEUTRAL",
            label: "Neutral",
            sortOrder: 3,
          },
          {
            value: "DISSATISFIED",
            label: "dissatisfied",
            sortOrder: 4,
          },
          {
            value: "VERY_DISSATISFIED",
            label: "Very dissatisfied",
            sortOrder: 5,
          },
        ],
      },
      {
        questionKey: "sleep_impact_daily_activities",
        questionText:
          "How much have sleep problems affected your daily activities?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 6,
        options: frequencyOptions,
      },
      {
        questionKey: "worry_about_sleep",
        questionText:
          "How worried are you about your sleep problems?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 7,

        options: [
          {
            value: "NOT_AT_ALL",
            label: "Not at all",
            sortOrder: 1,
          },
          {
            value: "A_LITTLE",
            label: "A little",
            sortOrder: 2,
          },
          {
            value: "SOMEWHAT",
            label: "Somewhat",
            sortOrder: 3,
          },
          {
            value: "A_LOT",
            label: "A lot",
            sortOrder: 4,
          },
          {
            value: "VERY_MUCH",
            label: "Very much",
            sortOrder: 5,
          },
        ],
      },
    ],
  },

  // ======================================================
  // FEELING ANXIOUS?
  // ======================================================

  {
    slug: "feeling-anxious",
    category: "ANXIETY",
    title: "Feeling anxious?",
    refillIntervalDays: 15,

    questions: [
      {
        questionKey: "nervous_anxious_on_edge",
        questionText:
          "Have you felt nervous, anxious, or on edge?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 1,
        options: frequencyOptions,
      },
      {
        questionKey: "control_worries",
        questionText:
          "Have you found it hard to stop or control your worries?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 2,
        options: frequencyOptions,
      },
      {
        questionKey: "worry_too_much",
        questionText:
          "Have you worried too much about different things?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 3,
        options: frequencyOptions,
      },
      {
        questionKey: "difficulty_relaxing",
        questionText:
          "Have you found it hard to relax?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 4,
        options: frequencyOptions,
      },
      {
        questionKey: "restless_hard_to_sit_still",
        questionText:
          "Have you felt so restless that it was hard to sit still?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 5,
        options: frequencyOptions,
      },
      {
        questionKey: "easily_annoyed_irritated",
        questionText:
          "Have you become annoyed or irritated easily?",
        questionType: "SINGLE_CHOICE",
        sortOrder: 6,
        options: frequencyOptions,
      },
      {
        questionKey: "afraid_something_terrible",
        questionText:
          "Have you felt afraid that something terrible might happen??",
        questionType: "SINGLE_CHOICE",
        sortOrder: 7,
        options: frequencyOptions,
      },
    ],
  },
];

async function seedQuestionnaire(
  questionnaireSeed: SeedQuestionnaire
) {
  const questionnaire =
    await prisma.wellbeingQuestionnaire.upsert({
      where: {
        slug: questionnaireSeed.slug,
      },

      update: {
        category: questionnaireSeed.category,
        refillIntervalDays:
          questionnaireSeed.refillIntervalDays,
        isActive: true,
      },

      create: {
        slug: questionnaireSeed.slug,
        category: questionnaireSeed.category,
        refillIntervalDays:
          questionnaireSeed.refillIntervalDays,
        isActive: true,
      },
    });

  const version =
    await prisma.wellbeingQuestionnaireVersion.upsert({
      where: {
        questionnaireId_version: {
          questionnaireId: questionnaire.id,
          version: 1,
        },
      },

      update: {
        title: questionnaireSeed.title,
        status: "PUBLISHED",
      },

      create: {
        questionnaireId: questionnaire.id,
        version: 1,
        title: questionnaireSeed.title,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

  for (const questionSeed of questionnaireSeed.questions) {
    const question =
      await prisma.wellbeingQuestion.upsert({
        where: {
          questionnaireVersionId_questionKey: {
            questionnaireVersionId: version.id,
            questionKey: questionSeed.questionKey,
          },
        },

        update: {
          questionText: questionSeed.questionText,
          helperText: questionSeed.helperText ?? null,
          questionType: questionSeed.questionType,
          isRequired: true,
          isActive: true,
          sortOrder: questionSeed.sortOrder,
        },

        create: {
          questionnaireVersionId: version.id,
          questionKey: questionSeed.questionKey,
          questionText: questionSeed.questionText,
          helperText: questionSeed.helperText ?? null,
          questionType: questionSeed.questionType,
          isRequired: true,
          isActive: true,
          sortOrder: questionSeed.sortOrder,
        },
      });

    for (const optionSeed of questionSeed.options ?? []) {
      await prisma.wellbeingQuestionOption.upsert({
        where: {
          questionId_value: {
            questionId: question.id,
            value: optionSeed.value,
          },
        },

        update: {
          label: optionSeed.label,
          sortOrder: optionSeed.sortOrder,
          isActive: true,
        },

        create: {
          questionId: question.id,
          value: optionSeed.value,
          label: optionSeed.label,
          sortOrder: optionSeed.sortOrder,
          isActive: true,
        },
      });
    }
  }

  console.log(
    `Seeded "${questionnaireSeed.title}" with ${questionnaireSeed.questions.length} questions.`
  );
}

async function main() {
  for (const questionnaire of questionnaires) {
    await seedQuestionnaire(questionnaire);
  }

  console.log(
    `Seeded ${questionnaires.length} wellbeing questionnaires.`
  );
}

main()
  .catch((error) => {
    console.error(
      "Wellbeing questionnaire seed failed:",
      error
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
