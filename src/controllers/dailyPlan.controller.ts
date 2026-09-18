import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";
import { dailyTemplates } from "../utils/templates";

const prisma = new PrismaClient();


// ======================================================
// HELPERS
// ======================================================

const getParam = (
  value: string | string[] | undefined
): string | undefined => {
  return Array.isArray(value)
    ? value[0]
    : value;
};


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

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
};


const dateKey = (
  date: Date
): string => {
  return date
    .toISOString()
    .slice(0, 10);
};


const addDays = (
  date: Date,
  amount: number
): Date => {
  const result = new Date(date);

  result.setUTCDate(
    result.getUTCDate() + amount
  );

  return result;
};


// Accepts:
// 06:00
// 18:30
// 6:00 AM
// 6:30 PM

const parseTimeToMinutes = (
  value: unknown
): number | null => {
  const text =
    String(value ?? "")
      .trim()
      .toUpperCase();

  const match =
    text.match(
      /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/
    );

  if (!match) {
    return null;
  }

  let hour =
    Number(match[1]);

  const minute =
    Number(match[2]);

  const meridiem =
    match[3];


  if (
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }


  if (meridiem) {
    if (
      hour < 1 ||
      hour > 12
    ) {
      return null;
    }

    if (
      meridiem === "AM" &&
      hour === 12
    ) {
      hour = 0;
    }

    if (
      meridiem === "PM" &&
      hour !== 12
    ) {
      hour += 12;
    }

  } else {
    if (
      hour < 0 ||
      hour > 23
    ) {
      return null;
    }
  }


  return (
    hour * 60 +
    minute
  );
};


const minuteToTime = (
  startMinute: number
): string => {
  const hour =
    Math.floor(
      startMinute / 60
    );

  const minute =
    startMinute % 60;

  return `${String(hour).padStart(
    2,
    "0"
  )}:${String(minute).padStart(
    2,
    "0"
  )}`;
};


const combineDateAndMinutes = (
  date: Date,
  startMinute: number
): Date => {
  const result =
    new Date(date);

  result.setUTCHours(
    Math.floor(
      startMinute / 60
    ),
    startMinute % 60,
    0,
    0
  );

  return result;
};


const getActivityTime = (
  date: Date
): string => {
  return `${String(
    date.getUTCHours()
  ).padStart(
    2,
    "0"
  )}:${String(
    date.getUTCMinutes()
  ).padStart(
    2,
    "0"
  )}`;
};


const validateDuration = (
  value: unknown
): number | null => {
  const duration =
    Number(value);

  if (
    !Number.isInteger(duration) ||
    duration <= 0 ||
    duration > 1440
  ) {
    return null;
  }

  return duration;
};


// ======================================================
// SERIALIZERS
// ======================================================

const serializeActivity = (
  activity: any
) => {
  return {
    id: activity.id,

    title:
      activity.title,

    category:
      activity.category,

    date:
      dateKey(
        activity.startTime
      ),

    time:
      getActivityTime(
        activity.startTime
      ),

    startTime:
      activity.startTime,

    durationMinutes:
      activity.durationMinutes,

    note:
      activity.note,

    isCompleted:
      activity.isCompleted,

    source:
      activity.source,

    sourceTemplateId:
      activity.sourceTemplateId,

    sourceTemplateType:
      activity.sourceTemplateType,
  };
};


const serializeUserTemplate = (
  template: any
) => {
  const activities =
    template.activities ?? [];

  const totalDurationMinutes =
    activities.reduce(
      (
        total: number,
        activity: any
      ) =>
        total +
        activity.durationMinutes,
      0
    );


  return {
    id:
      template.id,

    templateType:
      "USER",

    name:
      template.name,

    title:
      template.name,

    category:
      template.category,

    activityCount:
      activities.length,

    totalDurationMinutes,

    lastUsedAt:
      template.lastUsedAt,

    createdAt:
      template.createdAt,

    updatedAt:
      template.updatedAt,

    activities:
      activities.map(
        (activity: any) => ({
          id:
            activity.id,

          title:
            activity.title,

          category:
            activity.category,

          time:
            minuteToTime(
              activity.startMinute
            ),

          startMinute:
            activity.startMinute,

          durationMinutes:
            activity.durationMinutes,

          note:
            activity.note,

          order:
            activity.order,
        })
      ),
  };
};


const serializeSystemTemplate = (
  template: any
) => {
  const activities =
    (template.activities ?? [])
      .map(
        (
          activity: any,
          index: number
        ) => {
          const startMinute =
            parseTimeToMinutes(
              activity.time
            ) ?? 0;


          return {
            id:
              `system-${String(
                template.id
              )}-${index}`,

            title:
              activity.title,

            category:
              activity.category,

            time:
              minuteToTime(
                startMinute
              ),

            startMinute,

            durationMinutes:
              activity.durationMinutes,

            note:
              activity.note ??
              null,

            order:
              index,
          };
        }
      );


  const totalDurationMinutes =
    activities.reduce(
      (
        total: number,
        activity: any
      ) =>
        total +
        activity.durationMinutes,
      0
    );


  return {
    id:
      String(
        template.id
      ),

    templateType:
      "SYSTEM",

    name:
      template.title,

    title:
      template.title,

    category:
      template.category ??
      null,

    activityCount:
      activities.length,

    totalDurationMinutes,

    lastUsedAt:
      null,

    activities,
  };
};


// ======================================================
// NORMALIZE TEMPLATE ACTIVITY PAYLOAD
// ======================================================

const normalizeTemplateActivities = (
  rawActivities: any[]
):
  | {
      success: true;
      data: Array<{
        title: string;
        category: string;
        startMinute: number;
        durationMinutes: number;
        note: string | null;
        order: number;
      }>;
    }
  | {
      success: false;
      error: string;
    } => {

  if (
    !Array.isArray(rawActivities)
  ) {
    return {
      success: false,
      error:
        "Activities must be an array",
    };
  }


  const result = [];


  for (
    let index = 0;
    index < rawActivities.length;
    index++
  ) {
    const activity =
      rawActivities[index];


    const title =
      String(
        activity.title ?? ""
      ).trim();


    const category =
      String(
        activity.category ?? ""
      ).trim();


    if (!title) {
      return {
        success: false,
        error:
          `Activity ${index + 1}: title is required`,
      };
    }


    if (!category) {
      return {
        success: false,
        error:
          `Activity ${index + 1}: category is required`,
      };
    }


    let startMinute:
      number | null = null;


    if (
      Number.isInteger(
        activity.startMinute
      ) &&
      activity.startMinute >= 0 &&
      activity.startMinute <= 1439
    ) {
      startMinute =
        activity.startMinute;

    } else {
      startMinute =
        parseTimeToMinutes(
          activity.time
        );
    }


    if (startMinute === null) {
      return {
        success: false,
        error:
          `Activity ${index + 1}: invalid time`,
      };
    }


    const duration =
      validateDuration(
        activity.durationMinutes
      );


    if (duration === null) {
      return {
        success: false,
        error:
          `Activity ${index + 1}: invalid duration`,
      };
    }


    result.push({
      title,
      category,

      startMinute,

      durationMinutes:
        duration,

      note:
        activity.note
          ? String(
              activity.note
            ).trim()
          : null,

      order:
        Number.isInteger(
          activity.order
        )
          ? activity.order
          : index,
    });
  }


  return {
    success: true,
    data: result,
  };
};


// ======================================================
// CREATE / FIND DAILY PLAN
// ======================================================

const ensureDailyPlan = async (
  userId: string,
  date: Date
) => {
  return prisma.dailyPlan.upsert({
    where: {
      userId_date: {
        userId,
        date,
      },
    },

    update: {},

    create: {
      userId,
      date,
    },
  });
};


// ======================================================
// HABIT STREAK
//
// Figma shows a streak even while today's schedule is
// still incomplete.
//
// Therefore the streak counts consecutive PREVIOUS days
// where:
// - user had at least one activity
// - every activity was completed
// ======================================================

const calculateHabitStreak = async (
  userId: string,
  selectedDate: Date
): Promise<number> => {

  const plans =
    await prisma.dailyPlan.findMany({
      where: {
        userId,

        date: {
          lt:
            selectedDate,
        },
      },

      include: {
        activities: {
          select: {
            isCompleted:
              true,
          },
        },
      },

      orderBy: {
        date: "desc",
      },

      take: 90,
    });


  const planMap =
    new Map<
      string,
      typeof plans[number]
    >();


  for (
    const plan of plans
  ) {
    planMap.set(
      dateKey(plan.date),
      plan
    );
  }


  let streak = 0;

  let cursor =
    addDays(
      selectedDate,
      -1
    );


  while (streak < 90) {

    const plan =
      planMap.get(
        dateKey(cursor)
      );


    if (!plan) {
      break;
    }


    if (
      plan.activities.length === 0
    ) {
      break;
    }


    const completed =
      plan.activities.every(
        activity =>
          activity.isCompleted
      );


    if (!completed) {
      break;
    }


    streak++;

    cursor =
      addDays(
        cursor,
        -1
      );
  }


  return streak;
};


// ======================================================
// BUILD MY DAY RESPONSE
// ======================================================

const buildDailyPlanResponse = async (
  userId: string,
  date: Date
) => {

  const plan =
    await prisma.dailyPlan.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },

      include: {
        activities: {
          orderBy: {
            startTime:
              "asc",
          },
        },
      },
    });


  const activities =
    plan?.activities ??
    [];


  const totalActivities =
    activities.length;


  const completed =
    activities.filter(
      activity =>
        activity.isCompleted
    ).length;


  const remaining =
    totalActivities -
    completed;


  const habitStreak =
    await calculateHabitStreak(
      userId,
      date
    );


  return {
    date:
      dateKey(date),

    planId:
      plan?.id ??
      null,

    mainFocus:
      plan?.mainFocus ??
      null,

    activities:
      activities.map(
        serializeActivity
      ),

    summary: {
      totalActivities,

      completed,

      remaining,

      completionRate:
        totalActivities === 0
          ? 0
          : Math.round(
              (
                completed /
                totalActivities
              ) * 100
            ),

      habitStreak,
    },
  };
};


// ======================================================
// GET ALL AVAILABLE TEMPLATES
//
// Built-in + user's templates
// ======================================================

export const getAllTemplates = async (
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


    const userTemplates =
      await prisma.dayTemplate.findMany({
        where: {
          userId,
        },

        include: {
          activities: {
            orderBy: {
              order:
                "asc",
            },
          },
        },

        orderBy: {
          updatedAt:
            "desc",
        },
      });


    const systemTemplates =
      dailyTemplates.map(
        serializeSystemTemplate
      );


    const customTemplates =
      userTemplates.map(
        serializeUserTemplate
      );


    return res.status(200).json({
      status:
        "success",

      data: [
        ...customTemplates,
        ...systemTemplates,
      ],
    });

  } catch (error) {
    console.error(
      "Get templates error:",
      error
    );


    return res.status(500).json({
      error:
        "Failed to fetch templates",
    });
  }
};


// ======================================================
// GET MY TEMPLATES
// ======================================================

export const getMyTemplates = async (
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


    const templates =
      await prisma.dayTemplate.findMany({
        where: {
          userId,
        },

        include: {
          activities: {
            orderBy: {
              order:
                "asc",
            },
          },
        },

        orderBy: {
          updatedAt:
            "desc",
        },
      });


    return res.status(200).json({
      status:
        "success",

      data:
        templates.map(
          serializeUserTemplate
        ),
    });

  } catch (error) {

    console.error(
      "Get my templates error:",
      error
    );


    return res.status(500).json({
      error:
        "Failed to fetch your templates",
    });
  }
};


// ======================================================
// GET SINGLE TEMPLATE / PREVIEW
// ======================================================

export const getMyTemplateById =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const userId =
        req.user?.userId;

      const templateId =
        getParam(
          req.params.templateId
        );


      if (!userId) {
        return res.status(401).json({
          error:
            "Unauthorized",
        });
      }


      if (!templateId) {
        return res.status(400).json({
          error:
            "Template ID is required",
        });
      }


      const template =
        await prisma.dayTemplate.findFirst({
          where: {
            id:
              templateId,

            userId,
          },

          include: {
            activities: {
              orderBy: {
                order:
                  "asc",
              },
            },
          },
        });


      if (!template) {
        return res.status(404).json({
          error:
            "Template not found",
        });
      }


      return res.status(200).json({
        status:
          "success",

        data:
          serializeUserTemplate(
            template
          ),
      });

    } catch (error) {

      console.error(
        "Get template error:",
        error
      );


      return res.status(500).json({
        error:
          "Failed to fetch template",
      });
    }
  };


// ======================================================
// CREATE USER TEMPLATE
//
// Step 1 can create empty template.
// Step 2 can add activities afterward.
// ======================================================

export const createMyTemplate =
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


      const name =
        String(
          req.body.name ??
          req.body.title ??
          ""
        ).trim();


      const category =
        req.body.category
          ? String(
              req.body.category
            ).trim()
          : null;


      if (!name) {
        return res.status(400).json({
          error:
            "Template name is required",
        });
      }


      let normalized:
        ReturnType<
          typeof normalizeTemplateActivities
        > | null =
        null;


      if (
        req.body.activities !==
        undefined
      ) {
        normalized =
          normalizeTemplateActivities(
            req.body.activities
          );


        if (normalized.success === false) {
          return res.status(400).json({
            error:
              normalized.error,
          });
        }
      }


      const template =
        await prisma.dayTemplate.create({
          data: {
            userId,

            name,

            category,

            activities:
              normalized?.success &&
              normalized.data.length
                ? {
                    create:
                      normalized.data,
                  }
                : undefined,
          },

          include: {
            activities: {
              orderBy: {
                order:
                  "asc",
              },
            },
          },
        });


      return res.status(201).json({
        status:
          "success",

        message:
          "Template created successfully",

        data:
          serializeUserTemplate(
            template
          ),
      });

    } catch (error) {

      console.error(
        "Create template error:",
        error
      );


      return res.status(500).json({
        error:
          "Failed to create template",
      });
    }
  };


// ======================================================
// UPDATE USER TEMPLATE
//
// Can update title/category.
//
// If activities array is sent, activities are replaced
// with that edited list.
// ======================================================

export const updateMyTemplate =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const userId =
        req.user?.userId;

      const templateId =
        getParam(
          req.params.templateId
        );


      if (
        !userId ||
        !templateId
      ) {
        return res.status(400).json({
          error:
            "Invalid request",
        });
      }


      const existing =
        await prisma.dayTemplate.findFirst({
          where: {
            id:
              templateId,

            userId,
          },
        });


      if (!existing) {
        return res.status(404).json({
          error:
            "Template not found",
        });
      }


      const name =
        req.body.name !==
        undefined
          ? String(
              req.body.name
            ).trim()
          : undefined;


      if (
        name !== undefined &&
        !name
      ) {
        return res.status(400).json({
          error:
            "Template name cannot be empty",
        });
      }


      let normalized:
        ReturnType<
          typeof normalizeTemplateActivities
        > | null =
        null;


      if (
        req.body.activities !==
        undefined
      ) {
        normalized =
          normalizeTemplateActivities(
            req.body.activities
          );


        if (normalized.success === false) {
          return res.status(400).json({
            error:
              normalized.error,
          });
        }
      }


      await prisma.$transaction(
        async tx => {

          await tx.dayTemplate.update({
            where: {
              id:
                templateId,
            },

            data: {
              ...(name !==
              undefined
                ? {
                    name,
                  }
                : {}),

              ...(req.body.category !==
              undefined
                ? {
                    category:
                      req.body.category
                        ? String(
                            req.body.category
                          ).trim()
                        : null,
                  }
                : {}),
            },
          });


          if (
            normalized?.success
          ) {
            await tx.dayTemplateActivity.deleteMany({
              where: {
                templateId,
              },
            });


            if (
              normalized.data.length
            ) {
              await tx.dayTemplateActivity.createMany({
                data:
                  normalized.data.map(
                    activity => ({
                      templateId,
                      ...activity,
                    })
                  ),
              });
            }
          }
        }
      );


      const updated =
        await prisma.dayTemplate.findUnique({
          where: {
            id:
              templateId,
          },

          include: {
            activities: {
              orderBy: {
                order:
                  "asc",
              },
            },
          },
        });


      return res.status(200).json({
        status:
          "success",

        message:
          "Template updated successfully",

        data:
          serializeUserTemplate(
            updated
          ),
      });

    } catch (error) {

      console.error(
        "Update template error:",
        error
      );


      return res.status(500).json({
        error:
          "Failed to update template",
      });
    }
  };


// ======================================================
// DELETE USER TEMPLATE
// ======================================================

export const deleteMyTemplate =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const userId =
        req.user?.userId;

      const templateId =
        getParam(
          req.params.templateId
        );


      if (
        !userId ||
        !templateId
      ) {
        return res.status(400).json({
          error:
            "Invalid request",
        });
      }


      const template =
        await prisma.dayTemplate.findFirst({
          where: {
            id:
              templateId,

            userId,
          },
        });


      if (!template) {
        return res.status(404).json({
          error:
            "Template not found",
        });
      }


      await prisma.dayTemplate.delete({
        where: {
          id:
            templateId,
        },
      });


      return res.status(200).json({
        status:
          "success",

        message:
          "Template deleted successfully",
      });

    } catch (error) {

      console.error(
        "Delete template error:",
        error
      );


      return res.status(500).json({
        error:
          "Failed to delete template",
      });
    }
  };


// ======================================================
// ADD ACTIVITY TO USER TEMPLATE
// ======================================================

export const addTemplateActivity =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const userId =
        req.user?.userId;

      const templateId =
        getParam(
          req.params.templateId
        );


      if (
        !userId ||
        !templateId
      ) {
        return res.status(400).json({
          error:
            "Invalid request",
        });
      }


      const template =
        await prisma.dayTemplate.findFirst({
          where: {
            id:
              templateId,

            userId,
          },
        });


      if (!template) {
        return res.status(404).json({
          error:
            "Template not found",
        });
      }


      const normalized =
  normalizeTemplateActivities([
    req.body,
  ]);

if (normalized.success === false) {
  return res.status(400).json({
    error:
      normalized.error,
  });
}


      const count =
        await prisma.dayTemplateActivity.count({
          where: {
            templateId,
          },
        });


      const activity =
        normalized.data[0];


      const created =
        await prisma.dayTemplateActivity.create({
          data: {
            templateId,

            ...activity,

            order:
              req.body.order ??
              count,
          },
        });


      return res.status(201).json({
        status:
          "success",

        message:
          "Activity added to template",

        data: {
          ...created,

          time:
            minuteToTime(
              created.startMinute
            ),
        },
      });

    } catch (error) {

      console.error(
        "Add template activity error:",
        error
      );


      return res.status(500).json({
        error:
          "Failed to add template activity",
      });
    }
  };


// ======================================================
// UPDATE TEMPLATE ACTIVITY
// ======================================================

export const updateTemplateActivity =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const userId =
        req.user?.userId;

      const templateId =
        getParam(
          req.params.templateId
        );

      const activityId =
        getParam(
          req.params.activityId
        );


      if (
        !userId ||
        !templateId ||
        !activityId
      ) {
        return res.status(400).json({
          error:
            "Invalid request",
        });
      }


      const existing =
        await prisma.dayTemplateActivity.findFirst({
          where: {
            id:
              activityId,

            templateId,

            template: {
              userId,
            },
          },
        });


      if (!existing) {
        return res.status(404).json({
          error:
            "Template activity not found",
        });
      }


      const time =
        req.body.time !==
          undefined
          ? parseTimeToMinutes(
              req.body.time
            )
          : req.body.startMinute !==
            undefined
          ? Number(
              req.body.startMinute
            )
          : existing.startMinute;


      if (
        time === null ||
        time < 0 ||
        time > 1439
      ) {
        return res.status(400).json({
          error:
            "Invalid time",
        });
      }


      const duration =
        req.body.durationMinutes !==
        undefined
          ? validateDuration(
              req.body.durationMinutes
            )
          : existing.durationMinutes;


      if (duration === null) {
        return res.status(400).json({
          error:
            "Invalid duration",
        });
      }


      const updated =
        await prisma.dayTemplateActivity.update({
          where: {
            id:
              activityId,
          },

          data: {
            ...(req.body.title !==
            undefined
              ? {
                  title:
                    String(
                      req.body.title
                    ).trim(),
                }
              : {}),

            ...(req.body.category !==
            undefined
              ? {
                  category:
                    String(
                      req.body.category
                    ).trim(),
                }
              : {}),

            startMinute:
              time,

            durationMinutes:
              duration,

            ...(req.body.note !==
            undefined
              ? {
                  note:
                    req.body.note
                      ? String(
                          req.body.note
                        ).trim()
                      : null,
                }
              : {}),

            ...(req.body.order !==
            undefined
              ? {
                  order:
                    Number(
                      req.body.order
                    ),
                }
              : {}),
          },
        });


      return res.status(200).json({
        status:
          "success",

        message:
          "Template activity updated",

        data: {
          ...updated,

          time:
            minuteToTime(
              updated.startMinute
            ),
        },
      });

    } catch (error) {

      console.error(
        "Update template activity error:",
        error
      );


      return res.status(500).json({
        error:
          "Failed to update template activity",
      });
    }
  };


// ======================================================
// DELETE TEMPLATE ACTIVITY
// ======================================================

export const deleteTemplateActivity =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const userId =
        req.user?.userId;

      const templateId =
        getParam(
          req.params.templateId
        );

      const activityId =
        getParam(
          req.params.activityId
        );


      if (
        !userId ||
        !templateId ||
        !activityId
      ) {
        return res.status(400).json({
          error:
            "Invalid request",
        });
      }


      const activity =
        await prisma.dayTemplateActivity.findFirst({
          where: {
            id:
              activityId,

            templateId,

            template: {
              userId,
            },
          },
        });


      if (!activity) {
        return res.status(404).json({
          error:
            "Template activity not found",
        });
      }


      await prisma.dayTemplateActivity.delete({
        where: {
          id:
            activityId,
        },
      });


      return res.status(200).json({
        status:
          "success",

        message:
          "Template activity deleted",
      });

    } catch (error) {

      console.error(
        "Delete template activity error:",
        error
      );


      return res.status(500).json({
        error:
          "Failed to delete template activity",
      });
    }
  };


// ======================================================
// GET MY DAY
// ======================================================

export const getDailyPlan = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId =
      req.user?.userId;

    const targetDate =
      getParam(
        req.params.date
      );


    if (!userId) {
      return res.status(401).json({
        error:
          "Unauthorized",
      });
    }


    if (!targetDate) {
      return res.status(400).json({
        error:
          "Date is required",
      });
    }


    const planDate =
      parseDateOnly(
        targetDate
      );


    if (!planDate) {
      return res.status(400).json({
        error:
          "Invalid date. Use YYYY-MM-DD.",
      });
    }


    const data =
      await buildDailyPlanResponse(
        userId,
        planDate
      );


    return res.status(200).json({
      status:
        "success",

      data,
    });

  } catch (error) {

    console.error(
      "Get daily plan error:",
      error
    );


    return res.status(500).json({
      error:
        "Failed to fetch plan",
    });
  }
};


// ======================================================
// ADD ACTIVITY TO MY DAY
//
// Figma Add Activity drawer:
// - Activity name
// - Category
// - Date
// - Time
// - Duration
// - Note
// ======================================================

export const createActivity =
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


      const {
        title,
        category,
        date,
        time,
        durationMinutes,
        note,
      } = req.body;


      const cleanTitle =
        String(
          title ?? ""
        ).trim();


      const cleanCategory =
        String(
          category ?? ""
        ).trim();


      if (!cleanTitle) {
        return res.status(400).json({
          error:
            "Activity name is required",
        });
      }


      if (!cleanCategory) {
        return res.status(400).json({
          error:
            "Category is required",
        });
      }


      const planDate =
        parseDateOnly(
          String(
            date ?? ""
          )
        );


      if (!planDate) {
        return res.status(400).json({
          error:
            "Invalid date. Use YYYY-MM-DD.",
        });
      }


      const startMinute =
        parseTimeToMinutes(
          time
        );


      if (startMinute === null) {
        return res.status(400).json({
          error:
            "Invalid time",
        });
      }


      const duration =
        validateDuration(
          durationMinutes
        );


      if (duration === null) {
        return res.status(400).json({
          error:
            "Invalid duration",
        });
      }


      const plan =
        await ensureDailyPlan(
          userId,
          planDate
        );


      const activity =
        await prisma.activity.create({
          data: {
            dailyPlanId:
              plan.id,

            title:
              cleanTitle,

            category:
              cleanCategory,

            startTime:
              combineDateAndMinutes(
                planDate,
                startMinute
              ),

            durationMinutes:
              duration,

            note:
              note
                ? String(
                    note
                  ).trim()
                : null,

            source:
              "MANUAL",
          },
        });


      return res.status(201).json({
        status:
          "success",

        message:
          "Activity added successfully",

        data:
          serializeActivity(
            activity
          ),
      });

    } catch (error) {

      console.error(
        "Create activity error:",
        error
      );


      return res.status(500).json({
        error:
          "Failed to create activity",
      });
    }
  };


// ======================================================
// EDIT DAY ACTIVITY
//
// Can also move activity to another date.
// ======================================================

export const updateActivity =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const userId =
        req.user?.userId;

      const activityId =
        getParam(
          req.params.activityId
        );


      if (
        !userId ||
        !activityId
      ) {
        return res.status(400).json({
          error:
            "Invalid request",
        });
      }


      const activity =
        await prisma.activity.findFirst({
          where: {
            id:
              activityId,

            dailyPlan: {
              userId,
            },
          },

          include: {
            dailyPlan:
              true,
          },
        });


      if (!activity) {
        return res.status(404).json({
          error:
            "Activity not found",
        });
      }


      const targetDate =
        req.body.date !==
        undefined
          ? parseDateOnly(
              String(
                req.body.date
              )
            )
          : activity.dailyPlan.date;


      if (!targetDate) {
        return res.status(400).json({
          error:
            "Invalid date",
        });
      }


      const startMinute =
        req.body.time !==
        undefined
          ? parseTimeToMinutes(
              req.body.time
            )
          : (
              activity.startTime
                .getUTCHours() *
              60
            ) +
            activity.startTime
              .getUTCMinutes();


      if (startMinute === null) {
        return res.status(400).json({
          error:
            "Invalid time",
        });
      }


      const duration =
        req.body.durationMinutes !==
        undefined
          ? validateDuration(
              req.body.durationMinutes
            )
          : activity.durationMinutes;


      if (duration === null) {
        return res.status(400).json({
          error:
            "Invalid duration",
        });
      }


      const targetPlan =
        await ensureDailyPlan(
          userId,
          targetDate
        );


      const updated =
        await prisma.activity.update({
          where: {
            id:
              activityId,
          },

          data: {
            dailyPlanId:
              targetPlan.id,

            ...(req.body.title !==
            undefined
              ? {
                  title:
                    String(
                      req.body.title
                    ).trim(),
                }
              : {}),

            ...(req.body.category !==
            undefined
              ? {
                  category:
                    String(
                      req.body.category
                    ).trim(),
                }
              : {}),

            startTime:
              combineDateAndMinutes(
                targetDate,
                startMinute
              ),

            durationMinutes:
              duration,

            ...(req.body.note !==
            undefined
              ? {
                  note:
                    req.body.note
                      ? String(
                          req.body.note
                        ).trim()
                      : null,
                }
              : {}),
          },
        });


      return res.status(200).json({
        status:
          "success",

        message:
          "Activity updated successfully",

        data:
          serializeActivity(
            updated
          ),
      });

    } catch (error) {

      console.error(
        "Update activity error:",
        error
      );


      return res.status(500).json({
        error:
          "Failed to update activity",
      });
    }
  };


// ======================================================
// DELETE DAY ACTIVITY
// ======================================================

export const deleteActivity =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const userId =
        req.user?.userId;

      const activityId =
        getParam(
          req.params.activityId
        );


      if (
        !userId ||
        !activityId
      ) {
        return res.status(400).json({
          error:
            "Invalid request",
        });
      }


      const activity =
        await prisma.activity.findFirst({
          where: {
            id:
              activityId,

            dailyPlan: {
              userId,
            },
          },
        });


      if (!activity) {
        return res.status(404).json({
          error:
            "Activity not found",
        });
      }


      await prisma.activity.delete({
        where: {
          id:
            activityId,
        },
      });


      return res.status(200).json({
        status:
          "success",

        message:
          "Activity deleted successfully",
      });

    } catch (error) {

      console.error(
        "Delete activity error:",
        error
      );


      return res.status(500).json({
        error:
          "Failed to delete activity",
      });
    }
  };


// ======================================================
// COMPLETE / UNCOMPLETE ACTIVITY
// ======================================================

export const toggleActivityStatus =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const userId =
        req.user?.userId;

      const activityId =
        getParam(
          req.params.activityId
        );

      const {
        isCompleted,
      } = req.body;


      if (!userId) {
        return res.status(401).json({
          error:
            "Unauthorized",
        });
      }


      if (!activityId) {
        return res.status(400).json({
          error:
            "Activity ID is required",
        });
      }


      if (
        typeof isCompleted !==
        "boolean"
      ) {
        return res.status(400).json({
          error:
            "isCompleted must be true or false",
        });
      }


      const activity =
        await prisma.activity.findFirst({
          where: {
            id:
              activityId,

            dailyPlan: {
              userId,
            },
          },
        });


      if (!activity) {
        return res.status(404).json({
          error:
            "Activity not found",
        });
      }


      const updated =
        await prisma.activity.update({
          where: {
            id:
              activityId,
          },

          data: {
            isCompleted,
          },
        });


      return res.status(200).json({
        status:
          "success",

        data:
          serializeActivity(
            updated
          ),
      });

    } catch (error) {

      console.error(
        "Toggle activity error:",
        error
      );


      return res.status(500).json({
        error:
          "Failed to update activity",
      });
    }
  };


// ======================================================
// APPLY TEMPLATE
//
// Important Figma rules:
//
// 1. User may modify template activities BEFORE applying.
//    Sending "activities" here applies the modified copy only.
//    Original template is NOT modified.
//
// 2. If schedule already has activities and mode is omitted,
//    return 409 so FE can display ADD / REPLACE choice.
//
// 3. ADD = append template activities.
//    REPLACE = clear current day first.
// ======================================================

export const applyTemplate = async (
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


    const templateId =
      String(
        req.body.templateId ??
        ""
      ).trim();


    const templateType =
      String(
        req.body.templateType ??
        ""
      )
        .trim()
        .toUpperCase();


    const targetDate =
      String(
        req.body.targetDate ??
        ""
      ).trim();


    const requestedMode =
      req.body.mode
        ? String(
            req.body.mode
          )
            .trim()
            .toUpperCase()
        : null;


    if (
      !templateId ||
      !targetDate
    ) {
      return res.status(400).json({
        error:
          "templateId and targetDate are required",
      });
    }


    const planDate =
      parseDateOnly(
        targetDate
      );


    if (!planDate) {
      return res.status(400).json({
        error:
          "Invalid targetDate. Use YYYY-MM-DD.",
      });
    }


    if (
      requestedMode &&
      ![
        "ADD",
        "REPLACE",
      ].includes(
        requestedMode
      )
    ) {
      return res.status(400).json({
        error:
          "mode must be ADD or REPLACE",
      });
    }


    let sourceType:
      "SYSTEM" | "USER";

    let templateName =
      "";

    let templateActivities:
      Array<{
        title: string;
        category: string;
        startMinute: number;
        durationMinutes: number;
        note: string | null;
        order: number;
      }> = [];


    // ------------------------------------------
    // USER TEMPLATE
    // ------------------------------------------

    if (
      templateType ===
      "USER"
    ) {
      const template =
        await prisma.dayTemplate.findFirst({
          where: {
            id:
              templateId,

            userId,
          },

          include: {
            activities: {
              orderBy: {
                order:
                  "asc",
              },
            },
          },
        });


      if (!template) {
        return res.status(404).json({
          error:
            "Template not found",
        });
      }


      sourceType =
        "USER";

      templateName =
        template.name;

      templateActivities =
        template.activities.map(
          activity => ({
            title:
              activity.title,

            category:
              activity.category,

            startMinute:
              activity.startMinute,

            durationMinutes:
              activity.durationMinutes,

            note:
              activity.note,

            order:
              activity.order,
          })
        );

    } else {

      // ----------------------------------------
      // SYSTEM TEMPLATE
      // ----------------------------------------

      const template =
        dailyTemplates.find(
          template =>
            String(
              template.id
            ) ===
            templateId
        );


      if (!template) {
        return res.status(404).json({
          error:
            "Template not found",
        });
      }


      sourceType =
        "SYSTEM";

      templateName =
        template.title;


      templateActivities =
        template.activities.map(
          (
            activity: any,
            index: number
          ) => ({
            title:
              activity.title,

            category:
              activity.category,

            startMinute:
              parseTimeToMinutes(
                activity.time
              ) ?? 0,

            durationMinutes:
              activity.durationMinutes,

            note:
              activity.note ??
              null,

            order:
              index,
          })
        );
    }


    // ------------------------------------------
    // ONE-TIME EDITED COPY
    //
    // Does NOT modify saved template.
    // ------------------------------------------

    if (
      req.body.activities !==
      undefined
    ) {
      const normalized =
        normalizeTemplateActivities(
          req.body.activities
        );


      if (normalized.success === false) {
        return res.status(400).json({
          error:
            normalized.error,
        });
      }


      templateActivities =
        normalized.data;
    }


    if (
      templateActivities.length ===
      0
    ) {
      return res.status(400).json({
        error:
          "Template contains no activities",
      });
    }


    // ------------------------------------------
    // DOES DAY ALREADY HAVE ACTIVITIES?
    // ------------------------------------------

    const existingPlan =
      await prisma.dailyPlan.findUnique({
        where: {
          userId_date: {
            userId,
            date:
              planDate,
          },
        },

        include: {
          activities:
            true,
        },
      });


    const existingCount =
      existingPlan?.activities
        .length ?? 0;


    /*
      Figma requires the user to choose
      ADD or REPLACE when the schedule
      already contains manual activities.
    */

    if (
      existingCount > 0 &&
      !requestedMode
    ) {
      return res.status(409).json({
        status:
          "choice_required",

        code:
          "SCHEDULE_ALREADY_EXISTS",

        message:
          "This day already has activities. Choose whether to add the template activities or replace the current schedule.",

        options: [
          "ADD",
          "REPLACE",
        ],

        existingActivityCount:
          existingCount,
      });
    }


    const mode =
      requestedMode ??
      "ADD";


    let addedCount = 0;
    let skippedCount = 0;


    await prisma.$transaction(
      async tx => {

        const plan =
          await tx.dailyPlan.upsert({
            where: {
              userId_date: {
                userId,
                date:
                  planDate,
              },
            },

            update: {},

            create: {
              userId,

              date:
                planDate,
            },
          });


        if (
          mode ===
          "REPLACE"
        ) {
          await tx.activity.deleteMany({
            where: {
              dailyPlanId:
                plan.id,
            },
          });
        }


        let existingActivities:
          Array<{
            title: string;
            startTime: Date;
            durationMinutes: number;
          }> = [];


        if (
          mode ===
          "ADD"
        ) {
          existingActivities =
            await tx.activity.findMany({
              where: {
                dailyPlanId:
                  plan.id,
              },

              select: {
                title:
                  true,

                startTime:
                  true,

                durationMinutes:
                  true,
              },
            });
        }


        const activitiesToInsert =
          templateActivities
            .map(
              activity => ({
                dailyPlanId:
                  plan.id,

                title:
                  activity.title,

                category:
                  activity.category,

                startTime:
                  combineDateAndMinutes(
                    planDate,
                    activity.startMinute
                  ),

                durationMinutes:
                  activity.durationMinutes,

                note:
                  activity.note,

                isCompleted:
                  false,

                source:
                  "TEMPLATE",

                sourceTemplateId:
                  templateId,

                sourceTemplateType:
                  sourceType,
              })
            )
            .filter(
              activity => {

                if (
                  mode !==
                  "ADD"
                ) {
                  return true;
                }


                const duplicate =
                  existingActivities.some(
                    existing =>
                      existing.title ===
                        activity.title &&
                      existing.startTime.getTime() ===
                        activity.startTime.getTime() &&
                      existing.durationMinutes ===
                        activity.durationMinutes
                  );


                if (duplicate) {
                  skippedCount++;
                  return false;
                }


                return true;
              }
            );


        if (
          activitiesToInsert.length
        ) {
          await tx.activity.createMany({
            data:
              activitiesToInsert,
          });
        }


        addedCount =
          activitiesToInsert.length;


        if (
          sourceType ===
          "USER"
        ) {
          await tx.dayTemplate.update({
            where: {
              id:
                templateId,
            },

            data: {
              lastUsedAt:
                new Date(),
            },
          });
        }
      }
    );


    const day =
      await buildDailyPlanResponse(
        userId,
        planDate
      );


    return res.status(200).json({
      status:
        "success",

      message:
        mode === "REPLACE"
          ? `${templateName} replaced the current schedule.`
          : `${templateName} added to the schedule.`,

      data: {
        mode,

        addedCount,

        skippedCount,

        day,
      },
    });

  } catch (error) {

    console.error(
      "Apply template error:",
      error
    );


    return res.status(500).json({
      error:
        "Failed to apply template",
    });
  }
};


// ======================================================
// PROGRESS TAB
// ======================================================

export const getPlannerProgress =
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


      const requestedDays =
        Number(
          req.query.days ??
          7
        );


      const days =
        Number.isInteger(
          requestedDays
        )
          ? Math.min(
              Math.max(
                requestedDays,
                1
              ),
              90
            )
          : 7;


      const today =
        new Date();

      today.setUTCHours(
        0,
        0,
        0,
        0
      );


      const startDate =
        addDays(
          today,
          -(days - 1)
        );


      const plans =
        await prisma.dailyPlan.findMany({
          where: {
            userId,

            date: {
              gte:
                startDate,

              lte:
                today,
            },
          },

          include: {
            activities:
              true,
          },

          orderBy: {
            date:
              "asc",
          },
        });


      const daily =
        plans.map(
          plan => {

            const total =
              plan.activities.length;

            const completed =
              plan.activities.filter(
                activity =>
                  activity.isCompleted
              ).length;


            return {
              date:
                dateKey(
                  plan.date
                ),

              totalActivities:
                total,

              completed,

              remaining:
                total -
                completed,

              completionRate:
                total === 0
                  ? 0
                  : Math.round(
                      (
                        completed /
                        total
                      ) * 100
                    ),
            };
          }
        );


      const totalActivities =
        daily.reduce(
          (
            total,
            day
          ) =>
            total +
            day.totalActivities,
          0
        );


      const completed =
        daily.reduce(
          (
            total,
            day
          ) =>
            total +
            day.completed,
          0
        );


      return res.status(200).json({
        status:
          "success",

        data: {
          days,

          totalActivities,

          completed,

          remaining:
            totalActivities -
            completed,

          completionRate:
            totalActivities === 0
              ? 0
              : Math.round(
                  (
                    completed /
                    totalActivities
                  ) * 100
                ),

          daily,
        },
      });

    } catch (error) {

      console.error(
        "Planner progress error:",
        error
      );


      return res.status(500).json({
        error:
          "Failed to fetch planner progress",
      });
    }
  };