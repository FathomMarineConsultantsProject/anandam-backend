import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";

import {
  calculateWorkRestSummary,
} from "../utils/mlcCompliance";

const prisma = new PrismaClient();


// ======================================================
// CONSTANTS
// ======================================================

const BLOCKS_PER_DAY = 48;
const MINUTES_PER_BLOCK = 30;

const DIRECT_EDIT_STATUSES = [
  "REST",
  "MEAL",
  "UNRECORDED",
];


// ======================================================
// HELPERS
// ======================================================

const createEmptyBlocks = (): string[] =>
  new Array(BLOCKS_PER_DAY).fill(
    "UNRECORDED"
  );


const normalizeBlocks = (
  blocks?: string[] | null
): string[] => {
  if (
    !Array.isArray(blocks) ||
    blocks.length !== BLOCKS_PER_DAY
  ) {
    return createEmptyBlocks();
  }

  return [...blocks];
};


const normalizeValue = (
  value: unknown
): string =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");


const getParam = (
  value: string | string[] | undefined
): string | undefined => {
  return Array.isArray(value)
    ? value[0]
    : value;
};


// ======================================================
// DATE HELPERS
// ======================================================

const parseDateOnly = (
  value: string
): Date | null => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const date = new Date(
    `${value}T00:00:00.000Z`
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (
    date.toISOString().slice(0, 10) !==
    value
  ) {
    return null;
  }

  return date;
};


const getDayStart = (
  date: Date
): Date => {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
};


const addDays = (
  date: Date,
  days: number
): Date => {
  const result = new Date(date);

  result.setUTCDate(
    result.getUTCDate() + days
  );

  return result;
};


// ======================================================
// SLOT HELPERS
// ======================================================

const getSlotTimeRange = (
  dayStart: Date,
  slotIndex: number
) => {
  const start = new Date(
    dayStart.getTime() +
      slotIndex *
        MINUTES_PER_BLOCK *
        60 *
        1000
  );

  const end = new Date(
    start.getTime() +
      MINUTES_PER_BLOCK *
        60 *
        1000
  );

  return {
    start,
    end,
  };
};


const applyIntervalToBlocks = (
  blocks: string[],
  dayStart: Date,
  intervalStart: Date,
  intervalEnd: Date,
  status: string
): string[] => {
  const result = [...blocks];

  const dayEnd = addDays(
    dayStart,
    1
  );

  const overlapStart =
    intervalStart > dayStart
      ? intervalStart
      : dayStart;

  const overlapEnd =
    intervalEnd < dayEnd
      ? intervalEnd
      : dayEnd;


  if (
    overlapStart >= overlapEnd
  ) {
    return result;
  }


  const startMinutes =
    (overlapStart.getTime() -
      dayStart.getTime()) /
    60000;

  const endMinutes =
    (overlapEnd.getTime() -
      dayStart.getTime()) /
    60000;


  const startIndex = Math.max(
    0,
    Math.floor(
      startMinutes /
        MINUTES_PER_BLOCK
    )
  );


  const endIndex = Math.min(
    BLOCKS_PER_DAY,
    Math.ceil(
      endMinutes /
        MINUTES_PER_BLOCK
    )
  );


  for (
    let index = startIndex;
    index < endIndex;
    index++
  ) {
    result[index] = status;
  }


  return result;
};


// ======================================================
// WRITE WORK SESSION INTO GRID
// Also supports sessions crossing midnight
// ======================================================

const saveWorkIntervalToGrid =
  async (
    userId: string,
    startedAt: Date,
    endedAt: Date
  ) => {
    let dayCursor =
      getDayStart(startedAt);


    while (
      dayCursor < endedAt
    ) {
      const existing =
        await prisma.dailyWorkHours.findUnique({
          where: {
            userId_date: {
              userId,
              date: dayCursor,
            },
          },
        });


      const blocks =
        normalizeBlocks(
          existing?.statusBlocks
        );


      const updated =
        applyIntervalToBlocks(
          blocks,
          dayCursor,
          startedAt,
          endedAt,
          "WORK"
        );


      await prisma.dailyWorkHours.upsert({
        where: {
          userId_date: {
            userId,
            date: dayCursor,
          },
        },

        update: {
          statusBlocks:
            updated,
        },

        create: {
          userId,
          date: dayCursor,
          statusBlocks:
            updated,
        },
      });


      dayCursor =
        addDays(
          dayCursor,
          1
        );
    }
  };


// ======================================================
// CHECK OVERLAPPING WORK SESSION
// ======================================================

const findOverlappingSession =
  async (
    userId: string,
    start: Date,
    end: Date
  ) => {
    return prisma.workSession.findFirst({
      where: {
        userId,

        startedAt: {
          lt: end,
        },

        OR: [
          {
            endedAt: null,
          },

          {
            endedAt: {
              gt: start,
            },
          },
        ],
      },
    });
  };


// ======================================================
// BUILD COMPLETE DAY RESPONSE
// ======================================================

const buildDayResponse =
  async (
    userId: string,
    dayStart: Date
  ) => {
    const dayEnd =
      addDays(dayStart, 1);


    const record =
      await prisma.dailyWorkHours.findUnique({
        where: {
          userId_date: {
            userId,
            date: dayStart,
          },
        },
      });


    let blocks =
      normalizeBlocks(
        record?.statusBlocks
      );


    const sessions =
      await prisma.workSession.findMany({
        where: {
          userId,

          startedAt: {
            lt: dayEnd,
          },

          OR: [
            {
              endedAt: null,
            },

            {
              endedAt: {
                gt: dayStart,
              },
            },
          ],
        },

        orderBy: {
          startedAt: "asc",
        },
      });


    /*
      Active sessions are overlaid onto the grid
      even before clock-out.
    */
    const now = new Date();


    for (
      const session of sessions
    ) {
      const end =
        session.endedAt ??
        now;

      blocks =
        applyIntervalToBlocks(
          blocks,
          dayStart,
          session.startedAt,
          end,
          "WORK"
        );
    }


    const activeSession =
      sessions.find(
        (session) =>
          session.status ===
            "ACTIVE" &&
          session.endedAt === null
      ) ?? null;


    return {
      id:
        record?.id ?? null,

      date:
        dayStart
          .toISOString()
          .slice(0, 10),

      statusBlocks:
        blocks,

      sessions,

      activeSession,

      summary:
        calculateWorkRestSummary(
          blocks
        ),
    };
  };


// ======================================================
// GET SELECTED DAY
// GET /api/work-hours/day/:date
// ======================================================

export const getMyWorkDay = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error:
          "Unauthorized access",
      });
    }


    const dateString =
      getParam(
        req.params.date
      );


    if (!dateString) {
      return res.status(400).json({
        error:
          "Date is required",
      });
    }


    const date =
      parseDateOnly(
        dateString
      );


    if (!date) {
      return res.status(400).json({
        error:
          "Invalid date. Use YYYY-MM-DD.",
      });
    }


    const data =
      await buildDayResponse(
        userId,
        date
      );


    return res.status(200).json({
      status: "success",
      data,
    });

  } catch (error) {
    console.error(
      "Get work day error:",
      error
    );

    return res.status(500).json({
      error:
        "Failed to fetch work/rest record",
    });
  }
};


// ======================================================
// UPDATE REST / MEAL / UNRECORDED SLOTS
// PATCH /api/work-hours/day/:date/slots
// ======================================================

export const updateMyDaySlots =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          error:
            "Unauthorized",
        });
      }


      const dateString =
        getParam(
          req.params.date
        );


      if (!dateString) {
        return res.status(400).json({
          error:
            "Date is required",
        });
      }


      const date =
        parseDateOnly(
          dateString
        );


      if (!date) {
        return res.status(400).json({
          error:
            "Invalid date. Use YYYY-MM-DD.",
        });
      }


      type SlotUpdate = {
        slotIndex: number;
        status: string;
      };


      let updates: SlotUpdate[];


      if (
        Array.isArray(
          req.body.updates
        )
      ) {
        updates =
          req.body.updates.map(
            (item: any) => ({
              slotIndex:
                Number(
                  item.slotIndex
                ),

              status:
                normalizeValue(
                  item.status
                ),
            })
          );
      } else {
        updates = [
          {
            slotIndex:
              Number(
                req.body.slotIndex
              ),

            status:
              normalizeValue(
                req.body.status
              ),
          },
        ];
      }


      if (!updates.length) {
        return res.status(400).json({
          error:
            "At least one slot update is required",
        });
      }


      for (
        const update of updates
      ) {
        if (
          !Number.isInteger(
            update.slotIndex
          ) ||
          update.slotIndex < 0 ||
          update.slotIndex > 47
        ) {
          return res.status(400).json({
            error:
              "slotIndex must be between 0 and 47",
          });
        }


        if (
          !DIRECT_EDIT_STATUSES.includes(
            update.status
          )
        ) {
          return res.status(400).json({
            error:
              "Slot status must be REST, MEAL or UNRECORDED. Use clock-in/manual work session for WORK.",
          });
        }
      }


      const dayEnd =
        addDays(
          date,
          1
        );


      /*
        Don't allow a REST/MEAL edit over
        an existing work session.
      */
      const workSessions =
        await prisma.workSession.findMany({
          where: {
            userId,

            startedAt: {
              lt: dayEnd,
            },

            OR: [
              {
                endedAt: null,
              },

              {
                endedAt: {
                  gt: date,
                },
              },
            ],
          },
        });


      for (
        const update of updates
      ) {
        const slot =
          getSlotTimeRange(
            date,
            update.slotIndex
          );


        const conflict =
          workSessions.some(
            (session) => {
              const sessionEnd =
                session.endedAt ??
                new Date();

              return (
                session.startedAt <
                  slot.end &&
                sessionEnd >
                  slot.start
              );
            }
          );


        if (conflict) {
          return res.status(409).json({
            error:
              `Slot ${update.slotIndex} overlaps an existing work session.`,
          });
        }
      }


      const existing =
        await prisma.dailyWorkHours.findUnique({
          where: {
            userId_date: {
              userId,
              date,
            },
          },
        });


      const blocks =
        normalizeBlocks(
          existing?.statusBlocks
        );


      for (
        const update of updates
      ) {
        blocks[
          update.slotIndex
        ] = update.status;
      }


      await prisma.dailyWorkHours.upsert({
        where: {
          userId_date: {
            userId,
            date,
          },
        },

        update: {
          statusBlocks:
            blocks,
        },

        create: {
          userId,
          date,
          statusBlocks:
            blocks,
        },
      });


      const data =
        await buildDayResponse(
          userId,
          date
        );


      return res.status(200).json({
        status: "success",

        message:
          "Work/rest record updated",

        data,
      });

    } catch (error) {
      console.error(
        "Update slots error:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to update work/rest record",
      });
    }
  };


// ======================================================
// CLOCK IN
// POST /api/work-hours/sessions/clock-in
// ======================================================

export const clockIn = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId =
      req.user?.userId;


    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }


    const shipLocation =
      String(
        req.body.shipLocation ??
          ""
      ).trim();


    if (!shipLocation) {
      return res.status(400).json({
        error:
          "Ship location is required",
      });
    }


    if (
      shipLocation.length > 100
    ) {
      return res.status(400).json({
        error:
          "Ship location cannot exceed 100 characters",
      });
    }


    const active =
      await prisma.workSession.findFirst({
        where: {
          userId,
          status: "ACTIVE",
          endedAt: null,
        },
      });


    if (active) {
      return res.status(409).json({
        error:
          "You already have an active work session",

        data: active,
      });
    }


    const session =
      await prisma.workSession.create({
        data: {
          userId,

          shipLocation,

          startedAt:
            new Date(),

          source:
            "LIVE",

          status:
            "ACTIVE",
        },
      });


    return res.status(201).json({
      status: "success",

      message:
        `Clocked in at ${shipLocation}`,

      data: session,
    });

  } catch (error) {
    console.error(
      "Clock in error:",
      error
    );

    return res.status(500).json({
      error:
        "Failed to clock in",
    });
  }
};


// ======================================================
// ACTIVE SESSION
// GET /api/work-hours/sessions/active
// ======================================================

export const getActiveSession =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          error:
            "Unauthorized access",
        });
      }


      const session =
        await prisma.workSession.findFirst({
          where: {
            userId,
            status: "ACTIVE",
            endedAt: null,
          },

          orderBy: {
            startedAt: "desc",
          },
        });


      return res.status(200).json({
        status: "success",
        data: session,
      });

    } catch (error) {
      console.error(
        "Active session error:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to fetch active session",
      });
    }
  };


// ======================================================
// CLOCK OUT
// POST /api/work-hours/sessions/clock-out
// ======================================================

export const clockOut = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId =
      req.user?.userId;


    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }


    const session =
      await prisma.workSession.findFirst({
        where: {
          userId,
          status: "ACTIVE",
          endedAt: null,
        },
      });


    if (!session) {
      return res.status(400).json({
        error:
          "No active work session found",
      });
    }


    const endedAt =
      new Date();


    const completed =
      await prisma.workSession.update({
        where: {
          id: session.id,
        },

        data: {
          endedAt,
          status:
            "COMPLETED",
        },
      });


    await saveWorkIntervalToGrid(
      userId,
      session.startedAt,
      endedAt
    );


    return res.status(200).json({
      status: "success",

      message:
        "Clocked out successfully",

      data: completed,
    });

  } catch (error) {
    console.error(
      "Clock out error:",
      error
    );

    return res.status(500).json({
      error:
        "Failed to clock out",
    });
  }
};


// ======================================================
// MANUAL / MISSED WORK SESSION
// POST /api/work-hours/sessions/manual
// ======================================================

export const createManualWorkSession =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }


      const {
        startedAt,
        endedAt,
        shipLocation,
      } = req.body;


      if (
        !startedAt ||
        !endedAt ||
        !shipLocation
      ) {
        return res.status(400).json({
          error:
            "startedAt, endedAt and shipLocation are required",
        });
      }


      const start =
        new Date(startedAt);

      const end =
        new Date(endedAt);


      if (
        Number.isNaN(
          start.getTime()
        ) ||
        Number.isNaN(
          end.getTime()
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid start/end date",
        });
      }


      if (start >= end) {
        return res.status(400).json({
          error:
            "End time must be after start time",
        });
      }


      if (
        end > new Date()
      ) {
        return res.status(400).json({
          error:
            "Manual work session cannot end in the future",
        });
      }


      const location =
        String(
          shipLocation
        ).trim();


      if (!location) {
        return res.status(400).json({
          error:
            "Ship location is required",
        });
      }


      const overlap =
        await findOverlappingSession(
          userId,
          start,
          end
        );


      if (overlap) {
        return res.status(409).json({
          error:
            "This work session overlaps another work session",

          conflictingSession:
            overlap,
        });
      }


      const session =
        await prisma.workSession.create({
          data: {
            userId,

            shipLocation:
              location,

            startedAt:
              start,

            endedAt:
              end,

            source:
              "MANUAL",

            status:
              "COMPLETED",
          },
        });


      await saveWorkIntervalToGrid(
        userId,
        start,
        end
      );


      return res.status(201).json({
        status: "success",

        message:
          "Manual work session saved",

        data: session,
      });

    } catch (error) {
      console.error(
        "Manual work session error:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to save manual work session",
      });
    }
  };


// ======================================================
// DAILY SUMMARY
// GET /api/work-hours/summary/:date
// ======================================================

export const getDailySummary =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }


      const dateString =
        getParam(
          req.params.date
        );


      if (!dateString) {
        return res.status(400).json({
          error:
            "Date is required",
        });
      }


      const date =
        parseDateOnly(
          dateString
        );


      if (!date) {
        return res.status(400).json({
          error:
            "Invalid date. Use YYYY-MM-DD.",
        });
      }


      const day =
        await buildDayResponse(
          userId,
          date
        );


      return res.status(200).json({
        status: "success",

        data: {
          date:
            day.date,

          ...day.summary,
        },
      });

    } catch (error) {
      console.error(
        "Summary error:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to calculate summary",
      });
    }
  };


// ======================================================
// HISTORY
// GET /api/work-hours/history
// ======================================================

export const getMyWorkRestHistory =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }


      const records =
        await prisma.dailyWorkHours.findMany({
          where: {
            userId,
          },

          orderBy: {
            date: "desc",
          },

          take: 90,
        });


      const data =
        records.map(
          (record) => {
            const blocks =
              normalizeBlocks(
                record.statusBlocks
              );

            return {
              id:
                record.id,

              date:
                record.date
                  .toISOString()
                  .slice(0, 10),

              statusBlocks:
                blocks,

              summary:
                calculateWorkRestSummary(
                  blocks
                ),
            };
          }
        );


      return res.status(200).json({
        status: "success",

        count:
          data.length,

        data,
      });

    } catch (error) {
      console.error(
        "History error:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to fetch work/rest history",
      });
    }
  };