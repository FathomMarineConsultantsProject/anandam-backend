import {
  PrismaClient,
} from "@prisma/client";

const prisma =
  new PrismaClient();


const tracks = [
  {
    slug:
      "breathing-background-01",

    title:
      "Breathing Background 01",

    description:
      "Calm background audio for guided breathing and relaxation.",

    sourceType:
      "YOUTUBE",

    youtubeVideoId:
      "v4C4keiF0tQ",

    audioUrl:
      null,

    thumbnailUrl:
      "https://i.ytimg.com/vi/v4C4keiF0tQ/hqdefault.jpg",

    durationSeconds:
      null,

    isActive:
      true,

    sortOrder:
      1,
  },

  {
    slug:
      "breathing-background-02",

    title:
      "Breathing Background 02",

    description:
      "Relaxing background audio for breathing exercises.",

    sourceType:
      "YOUTUBE",

    youtubeVideoId:
      "3NycM9lYdRI",

    audioUrl:
      null,

    thumbnailUrl:
      "https://i.ytimg.com/vi/3NycM9lYdRI/hqdefault.jpg",

    durationSeconds:
      null,

    isActive:
      true,

    sortOrder:
      2,
  },

  {
    slug:
      "breathing-background-03",

    title:
      "Breathing Background 03",

    description:
      "A calming sound option for mindful breathing.",

    sourceType:
      "YOUTUBE",

    youtubeVideoId:
      "I3OJUwILelU",

    audioUrl:
      null,

    thumbnailUrl:
      "https://i.ytimg.com/vi/I3OJUwILelU/hqdefault.jpg",

    durationSeconds:
      null,

    isActive:
      true,

    sortOrder:
      3,
  },

  {
    slug:
      "breathing-background-04",

    title:
      "Breathing Background 04",

    description:
      "Background audio for slow breathing and relaxation exercises.",

    sourceType:
      "YOUTUBE",

    youtubeVideoId:
      "2G8LAiHSCAs",

    audioUrl:
      null,

    thumbnailUrl:
      "https://i.ytimg.com/vi/2G8LAiHSCAs/hqdefault.jpg",

    durationSeconds:
      null,

    isActive:
      true,

    sortOrder:
      4,
  },

  {
    slug:
      "breathing-background-05",

    title:
      "Breathing Background 05",

    description:
      "A peaceful audio option for guided breathing sessions.",

    sourceType:
      "YOUTUBE",

    youtubeVideoId:
      "aL8ygj3_NlQ",

    audioUrl:
      null,

    thumbnailUrl:
      "https://i.ytimg.com/vi/aL8ygj3_NlQ/hqdefault.jpg",

    durationSeconds:
      null,

    isActive:
      true,

    sortOrder:
      5,
  },
];


async function main() {
  console.log(
    "Seeding Anandam breathing audio..."
  );

  for (
    const track of tracks
  ) {
    const saved =
      await prisma
        .breathingAudioTrack
        .upsert({
          where: {
            slug:
              track.slug,
          },

          update:
            track,

          create:
            track,
        });

    console.log(
      `✓ ${saved.title}`
    );
  }

  console.log(
    `Done. ${tracks.length} breathing tracks available.`
  );
}


main()
  .catch(error => {
    console.error(
      "Breathing seed failed:",
      error
    );

    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });