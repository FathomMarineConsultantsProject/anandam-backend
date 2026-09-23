import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";

const prisma = new PrismaClient();

const GUIDED = "GUIDED";
const VR = "VR";
const IN_PROGRESS = "IN_PROGRESS";
const COMPLETED = "COMPLETED";
const ABANDONED = "ABANDONED";

const getString = (value: unknown): string => {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
};

const normalizeUpper = (value: unknown): string =>
  getString(value).trim().toUpperCase();

const roundOne = (value: number): number =>
  Math.round(value * 10) / 10;

const serializeWorkout = (workout: any) => ({
  id: workout.id,
  slug: workout.slug,
  type: workout.type,
  title: workout.title,
  category: workout.category,
  difficulty: workout.difficulty,
  durationMinutes: workout.durationMinutes,
  shortDescription: workout.shortDescription,
  about: workout.about,
  thumbnailUrl: workout.thumbnailUrl,
  youtubeVideoId: workout.youtubeVideoId,
  benefits: workout.benefits,
  beforeYouBegin: workout.beforeYouBegin,
  requiredEquipment: workout.requiredEquipment,
  vrLaunchUrl: workout.vrLaunchUrl,
});

const serializeSession = (session: any) => ({
  id: session.id,
  status: session.status,
  progressPercent: roundOne(session.progressPercent),
  positionSeconds: session.positionSeconds,
  confirmedEquipment: session.confirmedEquipment,
  startedAt: session.startedAt,
  completedAt: session.completedAt,
  updatedAt: session.updatedAt,
  workout: serializeWorkout(session.workout),
});

const getCurrentMonthRange = () => {
  const now = new Date();

  return {
    start: new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1,
        0,
        0,
        0,
        0
      )
    ),

    endExclusive: new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        1,
        0,
        0,
        0,
        0
      )
    ),
  };
};

const getChallengeRange = (challenge: any) => {
  if (challenge.startDate || challenge.endDate) {
    return {
      start: challenge.startDate ?? new Date(0),
      endExclusive:
        challenge.endDate ??
        new Date("9999-12-31T23:59:59.999Z"),
    };
  }

  return getCurrentMonthRange();
};

const getChallengeCount = async (
  userId: string,
  challenge: any
): Promise<number> => {
  const { start, endExclusive } =
    getChallengeRange(challenge);

  const where: any = {
    userId,
    status: COMPLETED,
    completedAt: {
      gte: start,
      lt: endExclusive,
    },
  };

  if (challenge.metric === "GUIDED_COMPLETIONS") {
    where.workout = {
      is: {
        type: GUIDED,
      },
    };
  }

  if (challenge.metric === "VR_COMPLETIONS") {
    where.workout = {
      is: {
        type: VR,
      },
    };
  }

  return prisma.fitnessWorkoutSession.count({ where });
};

// ======================================================
// OVERVIEW
// GET /api/fitness/overview
// ======================================================

export const getFitnessOverview = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [
      workoutsCompleted,
      guidedCompleted,
      vrCompleted,
      continueSession,
      recentSessions,
      latestFitnessSleep,
      latestMoodSleep,
      challenges,
    ] = await Promise.all([
      prisma.fitnessWorkoutSession.count({
        where: {
          userId,
          status: COMPLETED,
        },
      }),

      prisma.fitnessWorkoutSession.count({
        where: {
          userId,
          status: COMPLETED,
          workout: {
            is: {
              type: GUIDED,
            },
          },
        },
      }),

      prisma.fitnessWorkoutSession.count({
        where: {
          userId,
          status: COMPLETED,
          workout: {
            is: {
              type: VR,
            },
          },
        },
      }),

      prisma.fitnessWorkoutSession.findFirst({
        where: {
          userId,
          status: IN_PROGRESS,
        },
        include: {
          workout: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),

      prisma.fitnessWorkoutSession.findMany({
        where: {
          userId,
          status: COMPLETED,
        },
        include: {
          workout: true,
        },
        orderBy: {
          completedAt: "desc",
        },
        take: 7,
      }),

      prisma.dailyFitnessStat.findFirst({
        where: {
          userId,
          sleepHours: {
            not: null,
          },
        },
        orderBy: {
          date: "desc",
        },
        select: {
          sleepHours: true,
        },
      }),

      prisma.moodLog.findFirst({
        where: {
          userId,
          hoursOfSleep: {
            not: null,
          },
        },
        orderBy: {
          loggedAt: "desc",
        },
        select: {
          hoursOfSleep: true,
        },
      }),

      prisma.fitnessChallenge.findMany({
        where: {
          isActive: true,
        },
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
      }),
    ]);

    const breakdownTotal =
      guidedCompleted + vrCompleted;

    const guidedPercent =
      breakdownTotal > 0
        ? Math.round(
            (guidedCompleted / breakdownTotal) * 100
          )
        : 0;

    const vrPercent =
      breakdownTotal > 0
        ? 100 - guidedPercent
        : 0;

    const activeChallenges = await Promise.all(
      challenges.map(async challenge => {
        const currentValue = await getChallengeCount(
          userId,
          challenge
        );

        return {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          metric: challenge.metric,
          unit: challenge.unit,
          themeKey: challenge.themeKey,
          currentValue,
          targetValue: challenge.targetValue,
          remaining: Math.max(
            challenge.targetValue - currentValue,
            0
          ),
          progressPercent:
            challenge.targetValue > 0
              ? Math.min(
                  100,
                  Math.round(
                    (currentValue /
                      challenge.targetValue) *
                      100
                  )
                )
              : 0,
        };
      })
    );

    const sleepHours =
      latestFitnessSleep?.sleepHours ??
      latestMoodSleep?.hoursOfSleep ??
      null;

    return res.status(200).json({
      status: "success",
      data: {
        metrics: {
          workoutsCompleted,
          sleepHours,
          vrSessions: vrCompleted,
        },

        workoutBreakdown: {
          guidedWorkouts: {
            count: guidedCompleted,
            percent: guidedPercent,
          },
          vrWorkouts: {
            count: vrCompleted,
            percent: vrPercent,
          },
        },

        continueWorkout: continueSession
          ? serializeSession(continueSession)
          : null,

        activeChallenges,

        recentActivities: recentSessions.map(session => ({
          sessionId: session.id,
          workoutId: session.workout.id,
          activity: session.workout.title,
          activityType:
            session.workout.type === VR
              ? "VR Workout"
              : "Guided Workout",
          durationMinutes:
            session.workout.durationMinutes,
          completedOn: session.completedAt,
          difficulty: session.workout.difficulty,
        })),
      },
    });
  } catch (error) {
    console.error("Fitness overview error:", error);

    return res.status(500).json({
      error: "Failed to load fitness overview",
    });
  }
};

// ======================================================
// WORKOUT LIST
// GET /api/fitness/workouts
// ======================================================

export const getFitnessWorkouts = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const type = normalizeUpper(req.query.type);
    const category = normalizeUpper(req.query.category);
    const difficulty = normalizeUpper(req.query.difficulty);

    if (type && ![GUIDED, VR].includes(type)) {
      return res.status(400).json({
        error: "type must be GUIDED or VR",
      });
    }

    const minDurationText =
      getString(req.query.minDuration).trim();
    const maxDurationText =
      getString(req.query.maxDuration).trim();

    const minDuration = minDurationText
      ? Number(minDurationText)
      : null;
    const maxDuration = maxDurationText
      ? Number(maxDurationText)
      : null;

    if (
      minDuration !== null &&
      (!Number.isFinite(minDuration) || minDuration < 0)
    ) {
      return res.status(400).json({
        error: "Invalid minDuration",
      });
    }

    if (
      maxDuration !== null &&
      (!Number.isFinite(maxDuration) || maxDuration < 0)
    ) {
      return res.status(400).json({
        error: "Invalid maxDuration",
      });
    }

    const where: any = {
      isActive: true,
    };

    if (type) where.type = type;

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (minDuration !== null || maxDuration !== null) {
      where.durationMinutes = {};

      if (minDuration !== null) {
        where.durationMinutes.gte = minDuration;
      }

      if (maxDuration !== null) {
        where.durationMinutes.lte = maxDuration;
      }
    }

    const workouts = await prisma.fitnessWorkout.findMany({
      where,
      orderBy: [
        { sortOrder: "asc" },
        { title: "asc" },
      ],
    });

    return res.status(200).json({
      status: "success",
      count: workouts.length,
      data: workouts.map(serializeWorkout),
    });
  } catch (error) {
    console.error("Fitness workout list error:", error);

    return res.status(500).json({
      error: "Failed to load workouts",
    });
  }
};

// ======================================================
// WORKOUT DETAIL
// GET /api/fitness/workouts/:workoutId
// workoutId may be UUID or slug.
// ======================================================

export const getFitnessWorkoutById = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const workoutKey = getString(
      req.params.workoutId
    ).trim();

    if (!workoutKey) {
      return res.status(400).json({
        error: "workoutId is required",
      });
    }

    const workout = await prisma.fitnessWorkout.findFirst({
      where: {
        isActive: true,
        OR: [
          { id: workoutKey },
          { slug: workoutKey },
        ],
      },
    });

    if (!workout) {
      return res.status(404).json({
        error: "Workout not found",
      });
    }

    const activeSession =
      await prisma.fitnessWorkoutSession.findFirst({
        where: {
          userId,
          workoutId: workout.id,
          status: IN_PROGRESS,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

    return res.status(200).json({
      status: "success",
      data: {
        workout: serializeWorkout(workout),
        activeSession: activeSession
          ? {
              id: activeSession.id,
              status: activeSession.status,
              progressPercent: roundOne(
                activeSession.progressPercent
              ),
              positionSeconds:
                activeSession.positionSeconds,
              confirmedEquipment:
                activeSession.confirmedEquipment,
              startedAt: activeSession.startedAt,
              updatedAt: activeSession.updatedAt,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Fitness workout detail error:", error);

    return res.status(500).json({
      error: "Failed to load workout",
    });
  }
};

// ======================================================
// START / RESUME WORKOUT
// POST /api/fitness/workouts/:workoutId/start
// ======================================================

export const startFitnessWorkout = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const workoutKey = getString(
      req.params.workoutId
    ).trim();

    if (!workoutKey) {
      return res.status(400).json({
        error: "workoutId is required",
      });
    }

    const workout = await prisma.fitnessWorkout.findFirst({
      where: {
        isActive: true,
        OR: [
          { id: workoutKey },
          { slug: workoutKey },
        ],
      },
    });

    if (!workout) {
      return res.status(404).json({
        error: "Workout not found",
      });
    }

    const confirmedEquipment = Array.isArray(
      req.body.confirmedEquipment
    )
      ? req.body.confirmedEquipment
          .map((item: unknown) => String(item).trim())
          .filter(Boolean)
      : [];

    if (
      workout.type === VR &&
      workout.requiredEquipment.length > 0
    ) {
      const confirmedSet = new Set(
        confirmedEquipment.map((item: string) =>
          item.toLowerCase()
        )
      );

      const missingEquipment =
        workout.requiredEquipment.filter(
          item =>
            !confirmedSet.has(item.toLowerCase())
        );

      if (missingEquipment.length > 0) {
        return res.status(400).json({
          status: "error",
          code: "EQUIPMENT_NOT_CONFIRMED",
          error:
            "Confirm all required equipment before beginning the VR session.",
          missingEquipment,
        });
      }
    }

    const existingSession =
      await prisma.fitnessWorkoutSession.findFirst({
        where: {
          userId,
          workoutId: workout.id,
          status: IN_PROGRESS,
        },
        include: {
          workout: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

    if (existingSession) {
      const updated =
        await prisma.fitnessWorkoutSession.update({
          where: {
            id: existingSession.id,
          },
          data: {
            confirmedEquipment:
              workout.type === VR
                ? confirmedEquipment
                : existingSession.confirmedEquipment,
          },
          include: {
            workout: true,
          },
        });

      return res.status(200).json({
        status: "success",
        code: "SESSION_RESUMED",
        message: "Workout session resumed",
        data: serializeSession(updated),
      });
    }

    const session =
      await prisma.fitnessWorkoutSession.create({
        data: {
          userId,
          workoutId: workout.id,
          status: IN_PROGRESS,
          confirmedEquipment:
            workout.type === VR
              ? confirmedEquipment
              : [],
        },
        include: {
          workout: true,
        },
      });

    return res.status(201).json({
      status: "success",
      code: "SESSION_STARTED",
      message: "Workout session started",
      data: serializeSession(session),
    });
  } catch (error) {
    console.error("Start fitness workout error:", error);

    return res.status(500).json({
      error: "Failed to start workout",
    });
  }
};

// ======================================================
// ACTIVE SESSION
// GET /api/fitness/sessions/active
// Optional: ?workoutId=...
// ======================================================

export const getActiveFitnessSession = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const workoutId = getString(
      req.query.workoutId
    ).trim();

    const where: any = {
      userId,
      status: IN_PROGRESS,
    };

    if (workoutId) {
      where.workoutId = workoutId;
    }

    const session =
      await prisma.fitnessWorkoutSession.findFirst({
        where,
        include: {
          workout: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

    return res.status(200).json({
      status: "success",
      data: session ? serializeSession(session) : null,
    });
  } catch (error) {
    console.error(
      "Get active fitness session error:",
      error
    );

    return res.status(500).json({
      error: "Failed to load active workout session",
    });
  }
};

// ======================================================
// SAVE PROGRESS
// PATCH /api/fitness/sessions/:sessionId/progress
// ======================================================

export const updateFitnessProgress = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionId = getString(
      req.params.sessionId
    ).trim();

    if (!sessionId) {
      return res.status(400).json({
        error: "sessionId is required",
      });
    }

    const session =
      await prisma.fitnessWorkoutSession.findFirst({
        where: {
          id: sessionId,
          userId,
        },
        include: {
          workout: true,
        },
      });

    if (!session) {
      return res.status(404).json({
        error: "Workout session not found",
      });
    }

    if (session.status !== IN_PROGRESS) {
      return res.status(409).json({
        error:
          "Only an in-progress workout can be updated",
      });
    }

    const hasPosition =
      req.body.positionSeconds !== undefined;
    const hasPercent =
      req.body.progressPercent !== undefined;

    if (!hasPosition && !hasPercent) {
      return res.status(400).json({
        error:
          "positionSeconds or progressPercent is required",
      });
    }

    let nextPosition = session.positionSeconds;

    if (hasPosition) {
      const position = Number(req.body.positionSeconds);

      if (!Number.isFinite(position) || position < 0) {
        return res.status(400).json({
          error: "Invalid positionSeconds",
        });
      }

      nextPosition = Math.round(position);
    }

    let requestedPercent: number;

    if (hasPercent) {
      requestedPercent = Number(req.body.progressPercent);

      if (
        !Number.isFinite(requestedPercent) ||
        requestedPercent < 0 ||
        requestedPercent > 100
      ) {
        return res.status(400).json({
          error:
            "progressPercent must be between 0 and 100",
        });
      }
    } else {
      const totalSeconds = Math.max(
        session.workout.durationMinutes * 60,
        1
      );

      requestedPercent =
        (nextPosition / totalSeconds) * 100;
    }

    const nextProgress = Math.min(
      99.9,
      Math.max(
        session.progressPercent,
        requestedPercent
      )
    );

    const updated =
      await prisma.fitnessWorkoutSession.update({
        where: {
          id: session.id,
        },
        data: {
          positionSeconds: nextPosition,
          progressPercent: nextProgress,
        },
        include: {
          workout: true,
        },
      });

    return res.status(200).json({
      status: "success",
      data: serializeSession(updated),
    });
  } catch (error) {
    console.error("Update fitness progress error:", error);

    return res.status(500).json({
      error: "Failed to save workout progress",
    });
  }
};

// ======================================================
// COMPLETE WORKOUT
// POST /api/fitness/sessions/:sessionId/complete
// ======================================================

export const completeFitnessSession = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionId = getString(
      req.params.sessionId
    ).trim();

    const session =
      await prisma.fitnessWorkoutSession.findFirst({
        where: {
          id: sessionId,
          userId,
        },
        include: {
          workout: true,
        },
      });

    if (!session) {
      return res.status(404).json({
        error: "Workout session not found",
      });
    }

    if (session.status === COMPLETED) {
      return res.status(200).json({
        status: "success",
        code: "ALREADY_COMPLETED",
        data: serializeSession(session),
      });
    }

    if (session.status === ABANDONED) {
      return res.status(409).json({
        error:
          "An ended workout session cannot be completed",
      });
    }

    const completed =
      await prisma.fitnessWorkoutSession.update({
        where: {
          id: session.id,
        },
        data: {
          status: COMPLETED,
          progressPercent: 100,
          positionSeconds: Math.max(
            session.positionSeconds,
            session.workout.durationMinutes * 60
          ),
          completedAt: new Date(),
        },
        include: {
          workout: true,
        },
      });

    return res.status(200).json({
      status: "success",
      message: "Workout completed successfully",
      data: serializeSession(completed),
    });
  } catch (error) {
    console.error(
      "Complete fitness session error:",
      error
    );

    return res.status(500).json({
      error: "Failed to complete workout",
    });
  }
};

// ======================================================
// END / ABANDON WORKOUT
// POST /api/fitness/sessions/:sessionId/end
// ======================================================

export const endFitnessSession = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionId = getString(
      req.params.sessionId
    ).trim();

    const session =
      await prisma.fitnessWorkoutSession.findFirst({
        where: {
          id: sessionId,
          userId,
        },
        include: {
          workout: true,
        },
      });

    if (!session) {
      return res.status(404).json({
        error: "Workout session not found",
      });
    }

    if (session.status === COMPLETED) {
      return res.status(409).json({
        error: "A completed workout cannot be ended",
      });
    }

    if (session.status === ABANDONED) {
      return res.status(200).json({
        status: "success",
        code: "ALREADY_ENDED",
        data: serializeSession(session),
      });
    }

    const ended =
      await prisma.fitnessWorkoutSession.update({
        where: {
          id: session.id,
        },
        data: {
          status: ABANDONED,
        },
        include: {
          workout: true,
        },
      });

    return res.status(200).json({
      status: "success",
      message: "Workout ended",
      data: serializeSession(ended),
    });
  } catch (error) {
    console.error("End fitness session error:", error);

    return res.status(500).json({
      error: "Failed to end workout",
    });
  }
};

// ======================================================
// ACTIVITY HISTORY
// GET /api/fitness/history
// ======================================================

export const getFitnessHistory = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const pageRaw = Number(
      getString(req.query.page) || 1
    );
    const limitRaw = Number(
      getString(req.query.limit) || 20
    );

    const page =
      Number.isInteger(pageRaw) && pageRaw > 0
        ? pageRaw
        : 1;

    const limit =
      Number.isInteger(limitRaw) && limitRaw > 0
        ? Math.min(limitRaw, 100)
        : 20;

    const type = normalizeUpper(req.query.type);
    const difficulty = normalizeUpper(
      req.query.difficulty
    );

    const workoutFilter: any = {};

    if (type) {
      if (![GUIDED, VR].includes(type)) {
        return res.status(400).json({
          error: "type must be GUIDED or VR",
        });
      }

      workoutFilter.type = type;
    }

    if (difficulty) {
      workoutFilter.difficulty = difficulty;
    }

    const where: any = {
      userId,
      status: COMPLETED,
    };

    if (Object.keys(workoutFilter).length > 0) {
      where.workout = {
        is: workoutFilter,
      };
    }

    const [total, sessions] = await Promise.all([
      prisma.fitnessWorkoutSession.count({ where }),

      prisma.fitnessWorkoutSession.findMany({
        where,
        include: {
          workout: true,
        },
        orderBy: {
          completedAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.status(200).json({
      status: "success",
      data: sessions.map(session => ({
        sessionId: session.id,
        workoutId: session.workout.id,
        activity: session.workout.title,
        activityType:
          session.workout.type === VR
            ? "VR Workout"
            : "Guided Workout",
        durationMinutes:
          session.workout.durationMinutes,
        completedOn: session.completedAt,
        difficulty: session.workout.difficulty,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fitness history error:", error);

    return res.status(500).json({
      error: "Failed to load fitness history",
    });
  }
};
