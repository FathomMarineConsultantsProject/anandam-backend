import {
  PrismaClient,
  JournalEntryStatus,
  JournalEntryType,
  JournalCustomBlockType,
} from "@prisma/client";

import {
  Request,
  Response,
} from "express";


const prisma =
  new PrismaClient();


// ======================================================
// AUTH USER ID
// ======================================================

const getUserId = (
  req: Request
) => {
  return (
    req as any
  ).user?.userId as
    | string
    | undefined;
};


// ======================================================
// GET ALL JOURNAL TEMPLATES
// ======================================================

export const getJournalTemplates =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const templates =
        await prisma
          .journalTemplate
          .findMany({
            where: {
              isActive:
                true,
            },

            orderBy: {
              sortOrder:
                "asc",
            },

            select: {
              id:
                true,

              slug:
                true,

              title:
                true,

              description:
                true,

              imageKey:
                true,

              sortOrder:
                true,

              _count: {
                select: {
                  questions:
                    true,
                },
              },
            },
          });


      return res.status(200).json({
        templates,
      });

    } catch (error) {
      console.error(
        "getJournalTemplates error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to load journal templates.",
      });
    }
  };


// ======================================================
// GET ONE JOURNAL TEMPLATE
// ======================================================

export const getJournalTemplateBySlug =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        slug,
      } = req.params;


      const template =
        await prisma
          .journalTemplate
          .findFirst({
            where: {
              slug,

              isActive:
                true,
            },

            include: {
              questions: {
                where: {
                  isActive:
                    true,
                },

                orderBy: {
                  sortOrder:
                    "asc",
                },

                select: {
                  id:
                    true,

                  questionKey:
                    true,

                  questionText:
                    true,

                  helperText:
                    true,

                  sortOrder:
                    true,

                  isRequired:
                    true,
                },
              },
            },
          });


      if (!template) {
        return res.status(404).json({
          message:
            "Journal template not found.",
        });
      }


      return res.status(200).json({
        template,
      });

    } catch (error) {
      console.error(
        "getJournalTemplateBySlug error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to load journal template.",
      });
    }
  };


// ======================================================
// CREATE JOURNAL ENTRY
// ======================================================

export const createJournalEntry =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getUserId(req);


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized.",
        });
      }


      const {
        type,
        templateId,
        templateSlug,
        title,
        content,
        entryDate,
      } = req.body;


      const requestedType =
        type ===
        JournalEntryType.CUSTOM
          ? JournalEntryType.CUSTOM
          : JournalEntryType.TEMPLATE;


      let template:
        | {
            id: string;
            title: string;
            description:
              | string
              | null;
          }
        | null = null;


      if (
        requestedType ===
        JournalEntryType.TEMPLATE
      ) {
        if (
          !templateId &&
          !templateSlug
        ) {
          return res.status(400).json({
            message:
              "A journal template is required.",
          });
        }


        template =
          await prisma
            .journalTemplate
            .findFirst({
              where: {
                isActive:
                  true,

                ...(templateId
                  ? {
                      id:
                        String(
                          templateId
                        ),
                    }
                  : {
                      slug:
                        String(
                          templateSlug
                        ),
                    }),
              },

              select: {
                id:
                  true,

                title:
                  true,

                description:
                  true,
              },
            });


        if (!template) {
          return res.status(404).json({
            message:
              "Journal template not found.",
          });
        }
      }


      const entry =
        await prisma
          .journalEntry
          .create({
            data: {
              userId,

              type:
                requestedType,

              templateId:
                template?.id ||
                null,

              title:
                title
                  ? String(title)
                  : null,

              content:
                content
                  ? String(content)
                  : null,

              entryDate:
                entryDate
                  ? new Date(
                      entryDate
                    )
                  : new Date(),

              templateTitleSnapshot:
                template?.title ||
                null,

              templateDescriptionSnapshot:
                template
                  ?.description ||
                null,

              status:
                JournalEntryStatus.DRAFT,
            },
          });


      return res.status(201).json({
        message:
          "Journal draft created.",

        entry,
      });

    } catch (error) {
      console.error(
        "createJournalEntry error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to create journal entry.",
      });
    }
  };


// ======================================================
// UPDATE JOURNAL ENTRY / SAVE DRAFT CONTENT
// ======================================================

export const updateJournalEntry =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getUserId(req);


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized.",
        });
      }


      const {
        entryId,
      } = req.params;


      const existingEntry =
        await prisma
          .journalEntry
          .findFirst({
            where: {
              id:
                entryId,

              userId,
            },

            include: {
              template: {
                include: {
                  questions: {
                    where: {
                      isActive:
                        true,
                    },
                  },
                },
              },
            },
          });


      if (!existingEntry) {
        return res.status(404).json({
          message:
            "Journal entry not found.",
        });
      }


      const {
        title,
        content,
        entryDate,
        answers,
        customBlocks,
      } = req.body;


      const answerList =
        Array.isArray(answers)
          ? answers
          : null;


      const customBlockList =
        Array.isArray(
          customBlocks
        )
          ? customBlocks
          : null;


      /*
        Validate template question IDs.

        Prevent a user from attaching answers
        from another template.
      */

      let validQuestionMap =
        new Map<
          string,
          string
        >();


      if (
        existingEntry.template
      ) {
        validQuestionMap =
          new Map(
            existingEntry
              .template
              .questions
              .map(
                (
                  question
                ) => [
                  question.id,
                  question
                    .questionText,
                ]
              )
          );
      }


      if (answerList) {
        for (
          const answer
          of answerList
        ) {
          if (
            !validQuestionMap.has(
              String(
                answer.questionId
              )
            )
          ) {
            return res.status(400).json({
              message:
                "One or more journal questions are invalid for this template.",
            });
          }
        }
      }


      await prisma
        .$transaction(
          async (tx) => {
            await tx
              .journalEntry
              .update({
                where: {
                  id:
                    entryId,
                },

                data: {
                  ...(title !==
                  undefined
                    ? {
                        title:
                          title
                            ? String(
                                title
                              )
                            : null,
                      }
                    : {}),

                  ...(content !==
                  undefined
                    ? {
                        content:
                          content
                            ? String(
                                content
                              )
                            : null,
                      }
                    : {}),

                  ...(entryDate
                    ? {
                        entryDate:
                          new Date(
                            entryDate
                          ),
                      }
                    : {}),
                },
              });


            if (answerList) {
              await tx
                .journalAnswer
                .deleteMany({
                  where: {
                    entryId,
                  },
                });


              if (
                answerList.length >
                0
              ) {
                await tx
                  .journalAnswer
                  .createMany({
                    data:
                      answerList.map(
                        (
                          answer
                        ) => {
                          const questionId =
                            String(
                              answer.questionId
                            );


                          return {
                            entryId,

                            questionId,

                            questionTextSnapshot:
                              validQuestionMap.get(
                                questionId
                              ) || "",

                            answer:
                              String(
                                answer.answer ||
                                  ""
                              ),
                          };
                        }
                      ),
                  });
              }
            }


            if (
              customBlockList
            ) {
              await tx
                .journalCustomBlock
                .deleteMany({
                  where: {
                    entryId,
                  },
                });


              if (
                customBlockList.length >
                0
              ) {
                await tx
                  .journalCustomBlock
                  .createMany({
                    data:
                      customBlockList.map(
                        (
                          block,
                          index
                        ) => ({
                          entryId,

                          type:
                            block.type ===
                            JournalCustomBlockType.NOTE
                              ? JournalCustomBlockType.NOTE
                              : JournalCustomBlockType.QUESTION,

                          prompt:
                            block.prompt
                              ? String(
                                  block.prompt
                                )
                              : null,

                          content:
                            String(
                              block.content ||
                                ""
                            ),

                          sortOrder:
                            Number.isInteger(
                              block.sortOrder
                            )
                              ? block.sortOrder
                              : index +
                                1,
                        })
                      ),
                  });
              }
            }
          }
        );


      const entry =
        await getFullEntry(
          entryId,
          userId
        );


      return res.status(200).json({
        message:
          "Journal draft updated.",

        entry,
      });

    } catch (error) {
      console.error(
        "updateJournalEntry error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to update journal entry.",
      });
    }
  };


// ======================================================
// SAVE / FINALISE JOURNAL
// ======================================================

export const saveJournalEntry =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getUserId(req);


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized.",
        });
      }


      const {
        entryId,
      } = req.params;


      const existing =
        await prisma
          .journalEntry
          .findFirst({
            where: {
              id:
                entryId,

              userId,
            },

            select: {
              id:
                true,
            },
          });


      if (!existing) {
        return res.status(404).json({
          message:
            "Journal entry not found.",
        });
      }


      await prisma
        .journalEntry
        .update({
          where: {
            id:
              entryId,
          },

          data: {
            status:
              JournalEntryStatus.SAVED,

            savedAt:
              new Date(),
          },
        });


      const entry =
        await getFullEntry(
          entryId,
          userId
        );


      return res.status(200).json({
        message:
          "Journal entry saved.",

        entry,
      });

    } catch (error) {
      console.error(
        "saveJournalEntry error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to save journal entry.",
      });
    }
  };


// ======================================================
// GET MY JOURNAL ENTRIES
// ======================================================

export const getMyJournalEntries =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getUserId(req);


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized.",
        });
      }


      const statusQuery =
        req.query.status
          ? String(
              req.query.status
            ).toUpperCase()
          : "";


      const search =
        req.query.search
          ? String(
              req.query.search
            ).trim()
          : "";


      let status:
        | JournalEntryStatus
        | undefined;


      if (
        statusQuery ===
        "DRAFT"
      ) {
        status =
          JournalEntryStatus.DRAFT;
      }


      if (
        statusQuery ===
        "SAVED"
      ) {
        status =
          JournalEntryStatus.SAVED;
      }


      const entries =
        await prisma
          .journalEntry
          .findMany({
            where: {
              userId,

              ...(status
                ? {
                    status,
                  }
                : {}),

              ...(search
                ? {
                    OR: [
                      {
                        title: {
                          contains:
                            search,

                          mode:
                            "insensitive",
                        },
                      },

                      {
                        templateTitleSnapshot:
                          {
                            contains:
                              search,

                            mode:
                              "insensitive",
                          },
                      },

                      {
                        content: {
                          contains:
                            search,

                          mode:
                            "insensitive",
                        },
                      },
                    ],
                  }
                : {}),
            },

            orderBy: [
              {
                entryDate:
                  "desc",
              },

              {
                updatedAt:
                  "desc",
              },
            ],

            select: {
              id:
                true,

              type:
                true,

              status:
                true,

              title:
                true,

              content:
                true,

              entryDate:
                true,

              templateTitleSnapshot:
                true,

              templateDescriptionSnapshot:
                true,

              savedAt:
                true,

              createdAt:
                true,

              updatedAt:
                true,

              template: {
                select: {
                  slug:
                    true,

                  imageKey:
                    true,

                  title:
                    true,
                },
              },

              _count: {
                select: {
                  answers:
                    true,

                  customBlocks:
                    true,
                },
              },
            },
          });


      return res.status(200).json({
        entries,
      });

    } catch (error) {
      console.error(
        "getMyJournalEntries error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to load journal entries.",
      });
    }
  };


// ======================================================
// GET ONE OF MY JOURNAL ENTRIES
// ======================================================

export const getMyJournalEntryById =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getUserId(req);


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized.",
        });
      }


      const {
        entryId,
      } = req.params;


      const entry =
        await getFullEntry(
          entryId,
          userId
        );


      if (!entry) {
        return res.status(404).json({
          message:
            "Journal entry not found.",
        });
      }


      return res.status(200).json({
        entry,
      });

    } catch (error) {
      console.error(
        "getMyJournalEntryById error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to load journal entry.",
      });
    }
  };


// ======================================================
// DELETE JOURNAL ENTRY
// ======================================================

export const deleteJournalEntry =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getUserId(req);


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized.",
        });
      }


      const {
        entryId,
      } = req.params;


      const existing =
        await prisma
          .journalEntry
          .findFirst({
            where: {
              id:
                entryId,

              userId,
            },

            select: {
              id:
                true,
            },
          });


      if (!existing) {
        return res.status(404).json({
          message:
            "Journal entry not found.",
        });
      }


      await prisma
        .journalEntry
        .delete({
          where: {
            id:
              entryId,
          },
        });


      return res.status(200).json({
        message:
          "Journal entry deleted.",
      });

    } catch (error) {
      console.error(
        "deleteJournalEntry error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to delete journal entry.",
      });
    }
  };


// ======================================================
// PRIVATE HELPER
// ======================================================

const getFullEntry =
  async (
    entryId: string,
    userId: string
  ) => {
    return prisma
      .journalEntry
      .findFirst({
        where: {
          id:
            entryId,

          userId,
        },

        include: {
          template: {
            select: {
              id:
                true,

              slug:
                true,

              title:
                true,

              description:
                true,

              imageKey:
                true,

              questions: {
                where: {
                  isActive:
                    true,
                },

                orderBy: {
                  sortOrder:
                    "asc",
                },

                select: {
                  id:
                    true,

                  questionKey:
                    true,

                  questionText:
                    true,

                  helperText:
                    true,

                  sortOrder:
                    true,

                  isRequired:
                    true,
                },
              },
            },
          },

          answers: {
            orderBy: {
              createdAt:
                "asc",
            },
          },

          customBlocks: {
            orderBy: {
              sortOrder:
                "asc",
            },
          },
        },
      });
  };