import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const workouts = [
  {
    slug: "guided-workout-xavf3zmfgeo",
    type: "GUIDED",
    title: "Guided Workout 01",
    category: "MOBILITY",
    difficulty: "BEGINNER",
    durationMinutes: 20,
    shortDescription: "A guided movement session for everyday mobility and wellbeing.",
    about: "Follow this guided session directly inside Anandam. Move at a comfortable pace and stop if you feel pain, dizziness, or unusual discomfort.",
    thumbnailUrl: "https://i.ytimg.com/vi/XAVF3ZMFGEo/hqdefault.jpg",
    youtubeVideoId: "XAVF3ZMFGEo",
    benefits: ["Supports daily movement", "Encourages mobility", "Helps build a consistent exercise routine"],
    beforeYouBegin: [],
    requiredEquipment: [],
    vrLaunchUrl: null,
    isActive: true,
    sortOrder: 1,
  },
  {
    slug: "guided-workout-m8njx-i3-6k",
    type: "GUIDED",
    title: "Guided Workout 02",
    category: "STRENGTH",
    difficulty: "INTERMEDIATE",
    durationMinutes: 20,
    shortDescription: "A guided exercise session focused on strength and controlled movement.",
    about: "Follow the instructor at your own pace and use only the space and equipment that are safe and available onboard.",
    thumbnailUrl: "https://i.ytimg.com/vi/m8njX-i3-6k/hqdefault.jpg",
    youtubeVideoId: "m8njX-i3-6k",
    benefits: ["Supports functional strength", "Improves movement control", "Encourages regular activity"],
    beforeYouBegin: [],
    requiredEquipment: [],
    vrLaunchUrl: null,
    isActive: true,
    sortOrder: 2,
  },
  // yoga

  {
    slug: "guided-workout-sqvey0ccmse",
    type: "GUIDED",
    title: "Guided Workout 03",
    category: "YOGA",
    difficulty: "INTERMEDIATE",
    durationMinutes: 20,
    shortDescription: "A guided active session designed to keep you moving and energised.",
    about: "Use this session as a structured way to stay active. Adjust intensity to suit your current fitness level and available space.",
    thumbnailUrl: "https://i.ytimg.com/vi/SQveY0CcmsE/hqdefault.jpg",
    youtubeVideoId: "SQveY0CcmsE",
    benefits: ["Encourages cardiovascular activity", "Supports stamina", "Adds variety to onboard exercise"],
    beforeYouBegin: [],
    requiredEquipment: [],
    vrLaunchUrl: null,
    isActive: true,
    sortOrder: 3,
  },
  {
    slug: "guided-workout-dxpmskwaxni",
    type: "GUIDED",
    title: "Guided Workout 04",
    category: "BALANCE",
    difficulty: "BEGINNER",
    durationMinutes: 20,
    shortDescription: "A guided session supporting balance, coordination, and controlled movement.",
    about: "Choose a clear, stable exercise area before starting. Follow the movements within your own comfortable range.",
    thumbnailUrl: "https://i.ytimg.com/vi/DXPmSkWAxnI/hqdefault.jpg",
    youtubeVideoId: "DXPmSkWAxnI",
    benefits: ["Supports balance", "Encourages coordination", "Promotes controlled movement"],
    beforeYouBegin: [],
    requiredEquipment: [],
    vrLaunchUrl: null,
    isActive: true,
    sortOrder: 4,
  },
  // cardio
  {
    slug: "guided-workout-s-tgqpdw9gk",
    type: "GUIDED",
    title: "Guided Workout 05",
    category: "CARDIO",
    difficulty: "BEGINNER",
    durationMinutes: 20,
    shortDescription: "A gentle guided session for movement, flexibility, and recovery.",
    about: "Use a comfortable exercise area and follow the session without forcing any position or movement.",
    thumbnailUrl: "https://i.ytimg.com/vi/S-TGQPdW9Gk/hqdefault.jpg",
    youtubeVideoId: "S-TGQPdW9Gk",
    benefits: ["Encourages flexibility", "Supports recovery", "Promotes mindful movement"],
    beforeYouBegin: [],
    requiredEquipment: [],
    vrLaunchUrl: null,
    isActive: true,
    sortOrder: 5,
  },
  {
    slug: "isha-kriya-guided-meditation",
    type: "GUIDED",
    title: "Isha Kriya: Guided Meditation for Health and Wellbeing",
    category: "RECOVERY",
    difficulty: "BEGINNER",
    durationMinutes: 15,
    shortDescription: "A guided meditation session focused on calm, awareness, and wellbeing.",
    about: "Use this guided meditation as a quiet recovery session. Sit comfortably in a safe space where you can remain undisturbed.",
    thumbnailUrl: "https://i.ytimg.com/vi/EwQkfoKxRvo/hqdefault.jpg",
    youtubeVideoId: "EwQkfoKxRvo",
    benefits: ["Supports relaxation", "Encourages mindful awareness", "Provides a structured recovery break"],
    beforeYouBegin: [],
    requiredEquipment: [],
    vrLaunchUrl: null,
    isActive: true,
    sortOrder: 6,
  },
  {
    slug: "quiet-your-thoughts-relax-meditation",
    type: "GUIDED",
    title: "10 Min Meditation to Quiet Your Thoughts & Relax",
    category: "RECOVERY",
    difficulty: "BEGINNER",
    durationMinutes: 10,
    shortDescription: "A short guided meditation for slowing down and relaxing.",
    about: "Take ten minutes in a quiet, comfortable place and follow the guided session to settle your attention and unwind.",
    thumbnailUrl: "https://i.ytimg.com/vi/sfSDQRdIvTc/hqdefault.jpg",
    youtubeVideoId: "sfSDQRdIvTc",
    benefits: ["Supports relaxation", "Creates a short mental reset", "Fits easily into a daily routine"],
    beforeYouBegin: [],
    requiredEquipment: [],
    vrLaunchUrl: null,
    isActive: true,
    sortOrder: 7,
  },
  
  {
    slug: "vr-headset-experience-gny20vhlxag",
    type: "VR",
    title: "VR Headset Experience",
    category: "VR",
    difficulty: "BEGINNER",
    durationMinutes: 10,
    shortDescription:
      "An immersive VR video experience designed to be viewed with a VR headset.",
    about:
      "Put on your VR headset, make sure you are seated or standing in a clear and safe area, and follow the immersive experience directly inside Anandam.",
    thumbnailUrl:
      "https://i.ytimg.com/vi/GnY20VHLxAg/hqdefault.jpg",
    youtubeVideoId: "GnY20VHLxAg",
    benefits: [
      "Provides an immersive VR experience",
      "Encourages focused engagement",
      "Adds variety to the onboard fitness and wellbeing routine",
    ],
    beforeYouBegin: [
      "Make sure the area around you is clear.",
      "Fit the VR headset securely and comfortably.",
      "Remain seated if the experience does not require movement.",
      "Stop immediately if you feel dizzy or uncomfortable.",
    ],
    requiredEquipment: [
      "VR Headset",
    ],
    vrLaunchUrl: null,
    isActive: true,
    sortOrder: 8,
  },

  {
  slug: "guided-workout-ml6ct4azdqi",
  type: "GUIDED",
  title: "Guided Workout 06",
  category: "CARDIO",
  difficulty: "ADVANCED",
  durationMinutes: 20,

  shortDescription:
    "An advanced guided cardio workout designed to challenge endurance, stamina, and overall fitness.",

  about:
    "Follow this higher-intensity cardio session at a pace appropriate for your fitness level. Make sure you have enough clear space to exercise safely, take breaks when needed, and stop if you feel pain, dizziness, or unusual discomfort.",

  thumbnailUrl:
    "https://i.ytimg.com/vi/ml6cT4AZdqI/hqdefault.jpg",

  youtubeVideoId: "ml6cT4AZdqI",

  benefits: [
    "Supports cardiovascular endurance",
    "Helps improve stamina",
    "Provides a higher-intensity workout",
  ],

  beforeYouBegin: [
    "Make sure you have enough clear space to exercise safely.",
    "Wear suitable exercise footwear and clothing.",
    "Warm up before beginning the higher-intensity movements.",
    "Reduce the intensity or stop if you feel pain, dizziness, or unusual discomfort.",
  ],

  requiredEquipment: [],

  vrLaunchUrl: null,

  isActive: true,

  sortOrder: 9,
},

{
  slug: "guided-workout-obs-pe34x7g",
  type: "GUIDED",
  title: "Guided Workout 07",
  category: "STRENGTH",
  difficulty: "BEGINNER",
  durationMinutes: 20,

  shortDescription:
    "A beginner-friendly full-body workout using basic gym equipment.",

  about:
    "Follow this beginner workout at a comfortable pace. Use only equipment you are familiar with and make sure the exercise area is clear and safe before starting.",

  thumbnailUrl:
    "https://i.ytimg.com/vi/oBs-PE34x7g/hqdefault.jpg",

  youtubeVideoId: "oBs-PE34x7g",

  benefits: [
    "Supports full-body strength",
    "Builds confidence with basic gym equipment",
    "Encourages regular physical activity",
  ],

  beforeYouBegin: [
    "Make sure the exercise area is clear.",
    "Check that any equipment is secure before use.",
    "Start slowly and use a comfortable resistance.",
  ],

  requiredEquipment: [],

  vrLaunchUrl: null,
  isActive: true,
  sortOrder: 10,
},

{
  slug: "guided-workout-e9zobjomnqg",
  type: "GUIDED",
  title: "Guided Workout 08",
  category: "STRENGTH",
  difficulty: "BEGINNER",
  durationMinutes: 20,

  shortDescription:
    "A guided beginner strength session focused on controlled movement and building strength.",

  about:
    "Follow the strength exercises at a comfortable pace and maintain controlled movement throughout the session.",

  thumbnailUrl:
    "https://i.ytimg.com/vi/e9ZobJOMnqg/hqdefault.jpg",

  youtubeVideoId: "e9ZobJOMnqg",

  benefits: [
    "Supports functional strength",
    "Encourages controlled movement",
    "Helps build a regular strength routine",
  ],

  beforeYouBegin: [
    "Use a clear and stable exercise area.",
    "Warm up before beginning the session.",
    "Stop if you feel pain or unusual discomfort.",
  ],

  requiredEquipment: [],

  vrLaunchUrl: null,
  isActive: true,
  sortOrder: 11,
},

{
  slug: "guided-workout-digpucxfbmo",
  type: "GUIDED",
  title: "Guided Workout 09",
  category: "YOGA",
  difficulty: "BEGINNER",
  durationMinutes: 20,

  shortDescription:
    "A beginner guided yoga session supporting flexibility, movement, and wellbeing.",

  about:
    "Follow the session within your comfortable range of motion. Avoid forcing any stretch or position and take breaks whenever needed.",

  thumbnailUrl:
    "https://i.ytimg.com/vi/digpucxFbMo/hqdefault.jpg",

  youtubeVideoId: "digpucxFbMo",

  benefits: [
    "Supports flexibility",
    "Encourages mindful movement",
    "Promotes regular physical activity",
  ],

  beforeYouBegin: [
    "Choose a clear and comfortable exercise space.",
    "Wear comfortable clothing.",
    "Do not force any movement or stretch.",
  ],

  requiredEquipment: [],

  vrLaunchUrl: null,
  isActive: true,
  sortOrder: 12,
},

{
  slug: "guided-workout-7rsxrttbfl4",
  type: "GUIDED",
  title: "Guided Workout 10",
  category: "CARDIO",
  difficulty: "ADVANCED",
  durationMinutes: 20,

  shortDescription:
    "An advanced cardio workout designed to challenge stamina and cardiovascular endurance.",

  about:
    "This is a higher-intensity cardio session. Exercise at an appropriate pace, take breaks when necessary, and stop immediately if you experience pain, dizziness, or unusual discomfort.",

  thumbnailUrl:
    "https://i.ytimg.com/vi/7RsxRTtBfl4/hqdefault.jpg",

  youtubeVideoId: "7RsxRTtBfl4",

  benefits: [
    "Supports cardiovascular endurance",
    "Helps improve stamina",
    "Provides a higher-intensity exercise session",
  ],

  beforeYouBegin: [
    "Warm up before starting.",
    "Make sure you have enough clear exercise space.",
    "Keep water nearby.",
    "Reduce intensity or stop if you feel unwell.",
  ],

  requiredEquipment: [],

  vrLaunchUrl: null,
  isActive: true,
  sortOrder: 13,
},

{
  slug: "guided-workout-esbkfnrg97g",
  type: "GUIDED",
  title: "Guided Workout 11",
  category: "BALANCE",
  difficulty: "BEGINNER",
  durationMinutes: 20,

  shortDescription:
    "A beginner balance workout supporting stability, coordination, and controlled movement.",

  about:
    "Follow the balance exercises slowly and with control. Use a stable area and keep suitable support nearby if required.",

  thumbnailUrl:
    "https://i.ytimg.com/vi/ESBkfnRg97g/hqdefault.jpg",

  youtubeVideoId: "ESBkfnRg97g",

  benefits: [
    "Supports balance",
    "Encourages coordination",
    "Improves movement control",
  ],

  beforeYouBegin: [
    "Choose a stable, non-slip exercise area.",
    "Keep a wall or stable support nearby if needed.",
    "Perform each movement slowly and carefully.",
  ],

  requiredEquipment: [],

  vrLaunchUrl: null,
  isActive: true,
  sortOrder: 14,
},

{
  slug: "guided-workout-awbqvj39skm",
  type: "GUIDED",
  title: "Guided Workout 12",
  category: "BALANCE",
  difficulty: "BEGINNER",
  durationMinutes: 10,

  shortDescription:
    "A short beginner movement session supporting balance, mobility, and preparation for exercise.",

  about:
    "Use this short guided session to gently prepare the body for movement. Follow each exercise at a comfortable pace in a clear and stable area.",

  thumbnailUrl:
    "https://i.ytimg.com/vi/awBQVJ39sKM/hqdefault.jpg",

  youtubeVideoId: "awBQVJ39sKM",

  benefits: [
    "Supports balance and mobility",
    "Helps prepare the body for exercise",
    "Encourages controlled movement",
  ],

  beforeYouBegin: [
    "Use a clear and stable exercise area.",
    "Move gradually without forcing your range of motion.",
    "Stop if you feel pain or dizziness.",
  ],

  requiredEquipment: [],

  vrLaunchUrl: null,
  isActive: true,
  sortOrder: 15,
},

];

async function main() {
  console.log("Seeding Anandam Fitness workouts...");

  for (const workout of workouts) {
    const saved = await prisma.fitnessWorkout.upsert({
      where: {
        slug: workout.slug,
      },
      update: workout,
      create: workout,
    });

    console.log(`✓ ${saved.title} (${saved.youtubeVideoId})`);
  }

  console.log(`Done. ${workouts.length} fitness workouts are available.`);
}

main()
  .catch((error) => {
    console.error(
      "Fitness seed failed:",
      error
    );

    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
