import "dotenv/config";

import {
  PrismaClient,
} from "@prisma/client";


const prisma =
  new PrismaClient();


const templates = [
  {
    slug: "daily-review",
    title: "Daily review",
    description:
      "A little space to look back on your day.",
    imageKey: "daily-review",
    sortOrder: 1,

    questions: [
      {
        key: "done_today",
        text: "What did you get done today?",
      },
      {
        key: "went_well",
        text: "What went well for you?",
      },
      {
        key: "approach_differently",
        text: "What would you approach differently?",
      },
      {
        key: "learned_today",
        text: "What did you learn today?",
      },
      {
        key: "focus_tomorrow",
        text: "What would you like to focus on tomorrow?",
      },
      {
        key: "anything_else",
        text: "Anything else on your mind?",
      },
    ],
  },


  {
    slug: "stress-is-a-signal",
    title: "Stress is a signal",
    description:
      "Notice what’s weighing on you and what might help.",
    imageKey: "stress-is-a-signal",
    sortOrder: 2,

    questions: [
      {
        key: "pressure",
        text: "What has been putting pressure on you?",
      },
      {
        key: "stress_body_thoughts",
        text: "How is that stress showing up in your body or thoughts?",
      },
      {
        key: "feel_settled",
        text: "What has helped you feel more settled?",
      },
      {
        key: "small_step",
        text: "What is one small step you can take to support yourself?",
      },
      {
        key: "anything_else",
        text: "Anything else on your mind?",
      },
    ],
  },


  {
    slug: "a-difficult-day",
    title: "A difficult day",
    description:
      "Give yourself space to reflect with kindness.",
    imageKey: "a-difficult-day",
    sortOrder: 3,

    questions: [
      {
        key: "felt_difficult",
        text: "What felt difficult today?",
      },
      {
        key: "experience_effect",
        text: "How did that experience affect you?",
      },
      {
        key: "friend_advice",
        text: "What would you say to a friend going through the same thing?",
      },
      {
        key: "make_day_easier",
        text: "What could make the rest of your day a little easier?",
      },
      {
        key: "anything_else",
        text: "Anything else on your mind?",
      },
    ],
  },


  {
    slug: "moments-worth-keeping",
    title: "Moments worth keeping",
    description:
      "Make room for the small things that mattered.",
    imageKey: "moments-worth-keeping",
    sortOrder: 4,

    questions: [
      {
        key: "moment_remember",
        text: "What moment would you like to remember from today?",
      },
      {
        key: "meaningful",
        text: "What made it meaningful to you?",
      },
      {
        key: "helped_you",
        text: "Who or what helped you along the way?",
      },
      {
        key: "carry_tomorrow",
        text: "What would you like to carry into tomorrow?",
      },
      {
        key: "anything_else",
        text: "Anything else on your mind?",
      },
    ],
  },


  {
    slug: "what-i-need-right-now",
    title: "What I need right now",
    description:
      "Pause and listen to yourself.",
    imageKey: "what-i-need-right-now",
    sortOrder: 5,

    questions: [
      {
        key: "taking_energy",
        text: "What has been taking up most of your energy?",
      },
      {
        key: "body_feelings",
        text: "What have your body and feelings been telling you?",
      },
      {
        key: "need_more",
        text: "What do you need more of right now?",
      },
      {
        key: "permission_pause",
        text: "What is one thing you can give yourself permission to pause or leave unfinished?",
      },
      {
        key: "anything_else",
        text: "Anything else on your mind?",
      },
    ],
  },


  {
    slug: "rest-and-recharge",
    title: "Rest and recharge",
    description:
      "Explore what helps you recover.",
    imageKey: "rest-and-recharge",
    sortOrder: 6,

    questions: [
      {
        key: "energy_today",
        text: "How has your energy felt today?",
      },
      {
        key: "helped_rest",
        text: "What helped you rest or recharge?",
      },
      {
        key: "difficult_switch_off",
        text: "What made it difficult to switch off?",
      },
      {
        key: "space_tomorrow",
        text: "What could you make space for tomorrow to feel more rested?",
      },
      {
        key: "anything_else",
        text: "Anything else on your mind?",
      },
    ],
  },


  {
    slug: "letter-to-my-future-self",
    title: "A letter to my future self",
    description:
      "Capture who you are today and what you hope to carry forward.",
    imageKey: "letter-to-my-future-self",
    sortOrder: 7,

    questions: [
      {
        key: "future_self_know",
        text: "What would you like your future self to know about your life right now?",
      },
      {
        key: "proud_of",
        text: "What are you proud of yourself for?",
      },
      {
        key: "working_through",
        text: "What are you working through that you hope will feel easier?",
      },
      {
        key: "hopes_intentions",
        text: "What hopes or intentions do you have for the days ahead?",
      },
      {
        key: "remind_yourself",
        text: "What would you like to remind yourself of when you read this again?",
      },
    ],
  },


  {
    /*
      The exact question screen for this template
      was not visible in the supplied Figma screenshots.

      These questions are therefore initial suggested
      copy and can be changed before production.
    */
    slug: "boundary-i-want-to-practise",
    title: "A boundary I want to practise.",
    description:
      "Make space for your needs with a clear, kind boundary.",
    imageKey: "boundary-i-want-to-practise",
    sortOrder: 8,

    questions: [
      {
        key: "boundary_needed",
        text: "Where do you feel a boundary may be needed?",
      },
      {
        key: "what_you_need",
        text: "What do you need in this situation?",
      },
      {
        key: "communicate_boundary",
        text: "How could you communicate this boundary clearly and kindly?",
      },
      {
        key: "support_boundary",
        text: "What could help you maintain this boundary?",
      },
      {
        key: "anything_else",
        text: "Anything else on your mind?",
      },
    ],
  },
];


async function main() {
  console.log(
    "Seeding journal templates..."
  );


  for (
    const templateData
    of templates
  ) {
    const template =
      await prisma
        .journalTemplate
        .upsert({
          where: {
            slug:
              templateData.slug,
          },

          update: {
            title:
              templateData.title,

            description:
              templateData.description,

            imageKey:
              templateData.imageKey,

            sortOrder:
              templateData.sortOrder,

            isActive:
              true,
          },

          create: {
            slug:
              templateData.slug,

            title:
              templateData.title,

            description:
              templateData.description,

            imageKey:
              templateData.imageKey,

            sortOrder:
              templateData.sortOrder,

            isActive:
              true,
          },
        });


    for (
      let index = 0;
      index <
      templateData.questions.length;
      index += 1
    ) {
      const question =
        templateData.questions[
          index
        ];


      await prisma
        .journalTemplateQuestion
        .upsert({
          where: {
            templateId_questionKey:
              {
                templateId:
                  template.id,

                questionKey:
                  question.key,
              },
          },

          update: {
            questionText:
              question.text,

            sortOrder:
              index + 1,

            isActive:
              true,
          },

          create: {
            templateId:
              template.id,

            questionKey:
              question.key,

            questionText:
              question.text,

            sortOrder:
              index + 1,

            isRequired:
              false,

            isActive:
              true,
          },
        });
    }
  }


  console.log(
    "Journal templates seeded successfully."
  );
}


main()
  .catch((error) => {
    console.error(
      "Journal seed failed:",
      error
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });