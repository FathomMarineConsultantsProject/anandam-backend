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
  {
    slug: "guided-workout-sqvey0ccmse",
    type: "GUIDED",
    title: "Guided Workout 03",
    category: "CARDIO",
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
  {
    slug: "guided-workout-s-tgqpdw9gk",
    type: "GUIDED",
    title: "Guided Workout 05",
    category: "YOGA",
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
  },,

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
    console.error("Fitness seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
