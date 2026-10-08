import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const tracks = [
  {
    slug: "sleep-frequency-01",
    title: "Night Drift",
    description: "A long-form sleep audio selected for the Anandam sleep library.",
    sourceType: "YOUTUBE",
    youtubeVideoId: "4RSLOMp9nd4",
    sourceUrl: "https://www.youtube.com/watch?v=4RSLOMp9nd4",
    frequencyHz: null,
    frequencyLabel: null,
    brainwaveBand: null,
    sortOrder: 1,
  },
  {
    slug: "sleep-frequency-02",
    title: "Deep Sleep Flow",
    description: "A long-form sleep audio selected for the Anandam sleep library.",
    sourceType: "YOUTUBE",
    youtubeVideoId: "V1iEdwmZWGI",
    sourceUrl: "https://www.youtube.com/watch?v=V1iEdwmZWGI",
    frequencyHz: null,
    frequencyLabel: null,
    brainwaveBand: null,
    sortOrder: 2,
  },
  {
    slug: "sleep-frequency-03",
    title: "Quiet Horizon",
    description: "A long-form sleep audio selected for the Anandam sleep library.",
    sourceType: "YOUTUBE",
    youtubeVideoId: "IANAhICRrpc",
    sourceUrl: "https://www.youtube.com/watch?v=IANAhICRrpc",
    frequencyHz: null,
    frequencyLabel: null,
    brainwaveBand: null,
    sortOrder: 3,
  },
  {
    slug: "sleep-frequency-04",
    title: "Night Binaural Flow",
    description: "A binaural-beat sleep track selected for the Anandam sleep library.",
    sourceType: "YOUTUBE",
    youtubeVideoId: "OecmqbDzNWo",
    sourceUrl: "https://www.youtube.com/watch?v=OecmqbDzNWo",
    frequencyHz: null,
    frequencyLabel: null,
    brainwaveBand: null,
    sortOrder: 4,
  },
  {
    slug: "sleep-frequency-05",
    title: "Stillwater Sleep",
    description: "A long-form sleep audio selected for the Anandam sleep library.",
    sourceType: "YOUTUBE",
    youtubeVideoId: "Qb5eOpWRiiY",
    sourceUrl: "https://www.youtube.com/watch?v=Qb5eOpWRiiY",
    frequencyHz: null,
    frequencyLabel: null,
    brainwaveBand: null,
    sortOrder: 5,
  },
  {
    slug: "celestial-flow-528hz",
    title: "Celestial Flow - 528 Hz",
    description: "Sleep music with a 528 Hz label in the source title.",
    sourceType: "YOUTUBE",
    youtubeVideoId: "RqoZEa7m3p4",
    sourceUrl: "https://www.youtube.com/watch?v=RqoZEa7m3p4",
    frequencyHz: 528,
    frequencyLabel: "528 Hz",
    brainwaveBand: null,
    sortOrder: 6,
  },
  {
    slug: "sleep-frequency-07-live",
    title: "Night Frequency Live",
    description: "A long-form live sleep audio selected for the Anandam sleep library.",
    sourceType: "YOUTUBE",
    youtubeVideoId: "LPS-4E_xbJI",
    sourceUrl: "https://www.youtube.com/watch?v=LPS-4E_xbJI",
    frequencyHz: null,
    frequencyLabel: null,
    brainwaveBand: null,
    sortOrder: 7,
  },
  {
    slug: "sleepy-falls-delta",
    title: "Sleepy Falls - Delta Sleep",
    description: "Deep sleeping music identified as a Delta sleep track in available source references.",
    sourceType: "YOUTUBE",
    youtubeVideoId: "6OgEEQ2N8lc",
    sourceUrl: "https://www.youtube.com/watch?v=6OgEEQ2N8lc",
    frequencyHz: null,
    frequencyLabel: "Delta",
    brainwaveBand: "DELTA",
    sortOrder: 8,
  },
  {
    slug: "sleep-frequency-09",
    title: "Moonlit Rest",
    description: "A long-form sleep audio selected for the Anandam sleep library.",
    sourceType: "YOUTUBE",
    youtubeVideoId: "tQGE_Mivb8M",
    sourceUrl: "https://www.youtube.com/watch?v=tQGE_Mivb8M",
    frequencyHz: null,
    frequencyLabel: null,
    brainwaveBand: null,
    sortOrder: 9,
  },
  {
    slug: "gentle-night-ambience",
    title: "Gentle Night Ambience",
    description: "A calm background music track selected for the Anandam sleep library.",
    sourceType: "YOUTUBE",
    youtubeVideoId: "8Xw5f8CuQ5c",
    sourceUrl: "https://www.youtube.com/watch?v=8Xw5f8CuQ5c",
    frequencyHz: null,
    frequencyLabel: null,
    brainwaveBand: null,
    sortOrder: 10,
  },
  {
    slug: "deepest-healing-sleep-3-2hz-delta",
    title: "Deepest Healing Sleep - 3.2 Hz Delta",
    description: "REM sleep music with a 3.2 Hz Delta binaural-beat label in the source title.",
    sourceType: "YOUTUBE",
    youtubeVideoId: "xsfyb1pStdw",
    sourceUrl: "https://www.youtube.com/watch?v=xsfyb1pStdw",
    frequencyHz: 3.2,
    frequencyLabel: "3.2 Hz",
    brainwaveBand: "DELTA",
    sortOrder: 11,
  },
];

async function main() {
  for (const track of tracks) {
    await prisma.sleepAudioTrack.upsert({
      where: {
        slug: track.slug,
      },
      update: {
        ...track,
        isActive: true,
      },
      create: {
        ...track,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${tracks.length} sleep audio tracks.`);
}

main()
  .catch((error) => {
    console.error("Sleep audio seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
