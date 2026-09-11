import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";

const prisma = new PrismaClient();

const CHECKIN_TYPES = ["QUICK", "FULL"];

const WORKLOAD_VALUES = [
  "LIGHT",
  "BALANCED",
  "HEAVY",
  "OVERWHELMING",
];

const FEELING_VALUES = [
  "ADVENTUROUS",
  "HOMESICK",
  "PROUD",
  "LONELY",
  "EXCITED",
  "CALM",
  "ANXIOUS",
  "GRATEFUL",
  "PEACEFUL",
  "FRUSTRATED",
  "HOPEFUL",
  "DETERMINED",
];

const MOOD_LABELS: Record<number, string> = {
  1: "Very low",
  2: "Low",
  3: "Okay",
  4: "Good",
  5: "Great",
};

const ENERGY_LABELS: Record<number, string> = {
  1: "Very low",
  2: "Exhausted",
  3: "Moderate",
  4: "Energized",
  5: "Full of energy",
};

const STRESS_LABELS: Record<number, string> = {
  1: "Overwhelmed",
  2: "Very stressed",
  3: "Moderately stressed",
  4: "Slightly stressed",
  5: "Calm",
};

const WORKLOAD_LABELS: Record<string, string> = {
  LIGHT: "Light",
  BALANCED: "Balanced",
  HEAVY: "Heavy",
  OVERWHELMING: "Overwhelming",
};

const normalizeValue = (value: unknown) => {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
};

const getDisplayValues = (log: any) => {
  return {
    mood:
      log.moodScore != null
        ? MOOD_LABELS[log.moodScore]
        : null,

    energy:
      log.energyLevel != null
        ? ENERGY_LABELS[log.energyLevel]
        : null,

    stress:
      log.stressLevel != null
        ? STRESS_LABELS[log.stressLevel]
        : null,

    sleep:
      log.hoursOfSleep != null
        ? `${log.hoursOfSleep} ${log.hoursOfSleep === 1 ? "hour" : "hours"
        }`
        : null,

    workload:
      log.currentWorkload
        ? WORKLOAD_LABELS[log.currentWorkload] ??
        log.currentWorkload
        : null,
  };
};


// ======================================================
// CREATE QUICK OR FULL MOOD CHECK-IN
// ======================================================

export const createMoodLog = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized access",
      });
    }

    const {
      checkinType,

      moodScore,
      energyLevel,
      stressLevel,

      hoursOfSleep,
      currentWorkload,

      additionalThoughts,

      feelings,

      journalEntry,
    } = req.body;


    // ------------------------------------------
    // DETERMINE QUICK / FULL
    // ------------------------------------------

    let type = checkinType
      ? normalizeValue(checkinType)
      : "FULL";

    // Backward compatibility:
    // if only moodScore is submitted,
    // automatically treat as QUICK
    if (
      !checkinType &&
      moodScore !== undefined &&
      energyLevel === undefined &&
      stressLevel === undefined &&
      hoursOfSleep === undefined &&
      currentWorkload === undefined &&
      additionalThoughts === undefined &&
      feelings === undefined &&
      journalEntry === undefined
    ) {
      type = "QUICK";
    }

    if (!CHECKIN_TYPES.includes(type)) {
      return res.status(400).json({
        error:
          "checkinType must be QUICK or FULL",
      });
    }


    // ------------------------------------------
    // SCORE VALIDATION
    // ------------------------------------------

    const validateScore = (
      value: unknown,
      field: string
    ) => {
      if (value === undefined || value === null) {
        return null;
      }

      const numberValue = Number(value);

      if (
        !Number.isInteger(numberValue) ||
        numberValue < 1 ||
        numberValue > 5
      ) {
        return `${field} must be between 1 and 5`;
      }

      return null;
    };

    const moodError = validateScore(
      moodScore,
      "Mood score"
    );

    if (moodError) {
      return res.status(400).json({
        error: moodError,
      });
    }

    const energyError = validateScore(
      energyLevel,
      "Energy level"
    );

    if (energyError) {
      return res.status(400).json({
        error: energyError,
      });
    }

    const stressError = validateScore(
      stressLevel,
      "Stress level"
    );

    if (stressError) {
      return res.status(400).json({
        error: stressError,
      });
    }


    // ------------------------------------------
    // QUICK CHECK-IN
    // ------------------------------------------

    if (type === "QUICK") {
      if (moodScore === undefined) {
        return res.status(400).json({
          error:
            "Mood score is required for quick check-in",
        });
      }

      const newLog = await prisma.moodLog.create({
        data: {
          userId,

          checkinType: "QUICK",

          moodScore: Number(moodScore),

          energyLevel: null,
          stressLevel: null,

          hoursOfSleep: null,
          currentWorkload: null,

          additionalThoughts: null,

          feelings: [],

          journalEntry: null,
        },
      });

      return res.status(201).json({
        status: "success",
        message:
          "Quick mood check-in saved",

        data: {
          ...newLog,
          display: getDisplayValues(newLog),
        },
      });
    }


    // ------------------------------------------
    // FULL CHECK-IN REQUIRED FIELDS
    // ------------------------------------------

    if (
      moodScore === undefined ||
      energyLevel === undefined ||
      stressLevel === undefined ||
      hoursOfSleep === undefined ||
      !currentWorkload
    ) {
      return res.status(400).json({
        error:
          "Mood, energy, stress, sleep and workload are required",
      });
    }


    // ------------------------------------------
    // SLEEP VALIDATION
    // ------------------------------------------

    const sleepValue = Number(hoursOfSleep);

    if (
      Number.isNaN(sleepValue) ||
      sleepValue < 0 ||
      sleepValue > 12
    ) {
      return res.status(400).json({
        error:
          "Hours of sleep must be between 0 and 12",
      });
    }


    // ------------------------------------------
    // WORKLOAD
    // ------------------------------------------

    const workload =
      normalizeValue(currentWorkload);

    if (!WORKLOAD_VALUES.includes(workload)) {
      return res.status(400).json({
        error:
          "Workload must be LIGHT, BALANCED, HEAVY or OVERWHELMING",
      });
    }


    // ------------------------------------------
    // FEELINGS ARRAY
    // ------------------------------------------

    let normalizedFeelings: string[] = [];

    if (feelings !== undefined) {
      if (!Array.isArray(feelings)) {
        return res.status(400).json({
          error:
            "feelings must be an array",
        });
      }

      normalizedFeelings =
        feelings.map(normalizeValue);

      normalizedFeelings = [
        ...new Set(normalizedFeelings),
      ];

      const invalidFeeling =
        normalizedFeelings.find(
          (item) =>
            !FEELING_VALUES.includes(item)
        );

      if (invalidFeeling) {
        return res.status(400).json({
          error:
            `Invalid feeling: ${invalidFeeling}`,
        });
      }
    }


    // ------------------------------------------
    // TEXT FIELDS
    // ------------------------------------------

    const thoughts =
      additionalThoughts !== undefined &&
        additionalThoughts !== null
        ? String(additionalThoughts).trim()
        : null;

    const journal =
      journalEntry !== undefined &&
        journalEntry !== null
        ? String(journalEntry).trim()
        : null;

    if (
      thoughts &&
      thoughts.length > 350
    ) {
      return res.status(400).json({
        error:
          "Additional thoughts cannot exceed 350 characters",
      });
    }

    if (
      journal &&
      journal.length > 350
    ) {
      return res.status(400).json({
        error:
          "Journal entry cannot exceed 350 characters",
      });
    }


    // ------------------------------------------
    // SAVE FULL CHECK-IN
    // ------------------------------------------

    const newLog = await prisma.moodLog.create({
      data: {
        userId,

        checkinType: "FULL",

        moodScore: Number(moodScore),
        energyLevel: Number(energyLevel),
        stressLevel: Number(stressLevel),

        hoursOfSleep: sleepValue,

        currentWorkload: workload,

        additionalThoughts:
          thoughts || null,

        feelings:
          normalizedFeelings,

        journalEntry:
          journal || null,
      },
    });

    return res.status(201).json({
      status: "success",
      message:
        "Wellbeing check-in completed successfully",

      data: {
        ...newLog,
        display:
          getDisplayValues(newLog),
      },
    });

  } catch (error) {
    console.error(
      "Mood log error:",
      error
    );

    return res.status(500).json({
      error:
        "Failed to save mood log",
    });
  }
};


// ======================================================
// GET LOGGED-IN USER'S MOOD HISTORY
// ======================================================

export const getMyMoodHistory = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized access",
      });
    }

    const requestedType =
      req.query.type
        ? normalizeValue(req.query.type)
        : undefined;

    if (
      requestedType &&
      !CHECKIN_TYPES.includes(requestedType)
    ) {
      return res.status(400).json({
        error:
          "type must be QUICK or FULL",
      });
    }

    const rawLimit = Number(
      req.query.limit || 50
    );

    const limit = Math.min(
      Math.max(
        Number.isFinite(rawLimit)
          ? rawLimit
          : 50,
        1
      ),
      100
    );

    const history =
      await prisma.moodLog.findMany({
        where: {
          userId,

          ...(requestedType
            ? {
              checkinType:
                requestedType,
            }
            : {}),
        },

        orderBy: {
          loggedAt: "desc",
        },

        take: limit,
      });

    return res.status(200).json({
      status: "success",

      count: history.length,

      data: history.map((log) => ({
        ...log,

        display:
          getDisplayValues(log),
      })),
    });

  } catch (error) {
    console.error(
      "Fetch mood history error:",
      error
    );

    return res.status(500).json({
      error:
        "Failed to fetch mood history",
    });
  }
};


// ======================================================
// GET SINGLE CHECK-IN DETAILS
// ======================================================

export const getMoodLogById = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    const idParam = req.params.id;

    const id = Array.isArray(idParam)
      ? idParam[0]
      : idParam;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized access",
      });
    }

    if (!id) {
      return res.status(400).json({
        error: "Check-in ID is required",
      });
    }

    const moodLog =
      await prisma.moodLog.findFirst({
        where: {
          id,
          userId,
        },
      });

    if (!moodLog) {
      return res.status(404).json({
        error: "Check-in not found",
      });
    }

    return res.status(200).json({
      status: "success",

      data: {
        ...moodLog,
        display:
          getDisplayValues(moodLog),
      },
    });

  } catch (error) {
    console.error(
      "Fetch mood details error:",
      error
    );

    return res.status(500).json({
      error:
        "Failed to fetch check-in details",
    });
  }
};