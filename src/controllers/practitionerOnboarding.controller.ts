import {
  Response,
} from "express";

import {
  PrismaClient,
  UserRole,
} from "@prisma/client";

import {
  AuthRequest,
} from "../middleware/auth.middleware";

import {
  del,
  head,
  issueSignedToken,
  presignUrl,
} from "@vercel/blob";

import {
  randomBytes,
} from "crypto";


const prisma =
  new PrismaClient();


const MAX_UPLOAD_BYTES =
  Math.floor(4.5 * 1024 * 1024);

const PROFILE_MAX_BYTES =
  MAX_UPLOAD_BYTES;

const DOCUMENT_MAX_BYTES =
  MAX_UPLOAD_BYTES;


const PROFILE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];


const DOCUMENT_CONTENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
  "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template",

  "image/jpeg",
  "image/png",
  "image/webp",
];


const cleanOptionalString = (
  value: unknown
): string | null => {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const cleaned =
    value.trim();

  return cleaned ||
    null;
};


const cleanStringArray = (
  value: unknown
): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map((item) =>
          String(item).trim()
        )
        .filter(Boolean)
    ),
  ];
};


const safeFileName = (
  value: string
) => {
  const cleaned =
    value
      .trim()
      .replace(
        /[^a-zA-Z0-9._-]+/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      );

  return (
    cleaned ||
    "upload"
  );
};


const makeSlug = (
  fullName: string
) => {
  const base =
    fullName
      .toLowerCase()
      .trim()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      ) ||
    "practitioner";

  return `${base}-${randomBytes(
    4
  ).toString("hex")}`;
};


const ensurePractitionerProfile =
  async (
    userId: string
  ) => {
    const existing =
      await prisma
        .practitionerProfile
        .findUnique({
          where: {
            userId,
          },
        });


    if (existing) {
      return existing;
    }


    const user =
      await prisma.user.findUnique({
        where: {
          id:
            userId,
        },
      });


    if (
      !user ||
      user.role !==
        UserRole.PRACTITIONER
    ) {
      return null;
    }


    return prisma
      .practitionerProfile
      .create({
        data: {
          userId,

          slug:
            makeSlug(
              user.fullName
            ),

          approvalStatus:
            "DRAFT",

          isVisible:
            false,

          onboardingStep:
            1,

          onboardingCompleted:
            false,
        },
      });
  };


const getCompleteProfile =
  async (
    userId: string
  ) => {
    return prisma
      .practitionerProfile
      .findUnique({
        where: {
          userId,
        },

        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              contactNumber: true,
              avatarMode: true,
              avatarId: true,
            },
          },

          specialties: {
            include: {
              specialty:
                true,
            },
          },

          qualifications: {
            orderBy: {
              createdAt:
                "asc",
            },
          },

          documents: {
            orderBy: {
              createdAt:
                "desc",
            },
          },
        },
      });
  };


// ======================================================
// GET CURRENT PRACTITIONER ONBOARDING / PROFILE
// ======================================================

export const getPractitionerOnboarding =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized",
        });
      }


      const profile =
        await ensurePractitionerProfile(
          userId
        );


      if (!profile) {
        return res.status(403).json({
          message:
            "Practitioner access required",
        });
      }


      const practitioner =
        await getCompleteProfile(
          userId
        );


      return res.status(200).json({
        practitioner,
      });

    } catch (error) {
      console.error(
        "getPractitionerOnboarding:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to load practitioner onboarding",
      });
    }
  };


// ======================================================
// STEP 1 - BASIC DETAILS
//
// Only fullName + email are mandatory.
// Everything else may be null / empty and edited later.
// ======================================================

export const savePractitionerBasicDetails =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized",
        });
      }


      const fullName =
        String(
          req.body.fullName || ""
        ).trim();

      const email =
        String(
          req.body.email || ""
        )
          .trim()
          .toLowerCase();


      if (
        !fullName ||
        !email
      ) {
        return res.status(400).json({
          message:
            "Full name and email are required",
        });
      }


      const existingEmail =
        await prisma.user.findFirst({
          where: {
            email,

            NOT: {
              id:
                userId,
            },
          },
        });


      if (existingEmail) {
        return res.status(409).json({
          message:
            "Email is already in use",
        });
      }


      const profile =
        await ensurePractitionerProfile(
          userId
        );


      if (!profile) {
        return res.status(403).json({
          message:
            "Practitioner access required",
        });
      }


      await prisma.$transaction([
        prisma.user.update({
          where: {
            id:
              userId,
          },

          data: {
            fullName,
            email,

            contactNumber:
              cleanOptionalString(
                req.body.phoneNumber
              ),
          },
        }),

        prisma.practitionerProfile.update({
          where: {
            id:
              profile.id,
          },

          data: {
            location:
              cleanOptionalString(
                req.body.location
              ),

            languages:
              cleanStringArray(
                req.body.languages
              ),

            about:
              cleanOptionalString(
                req.body.about
              ),

            onboardingStep: {
              set:
                Math.max(
                  profile
                    .onboardingStep,
                  2
                ),
            },
          },
        }),
      ]);


      const practitioner =
        await getCompleteProfile(
          userId
        );


      return res.status(200).json({
        message:
          "Basic details saved",

        practitioner,
      });

    } catch (error) {
      console.error(
        "savePractitionerBasicDetails:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to save basic details",
      });
    }
  };


// ======================================================
// STEP 2 - PROFESSIONAL DETAILS
//
// Everything in this step is optional.
// Empty arrays are allowed.
// ======================================================

export const savePractitionerProfessionalDetails =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized",
        });
      }


      const profile =
        await ensurePractitionerProfile(
          userId
        );


      if (!profile) {
        return res.status(403).json({
          message:
            "Practitioner access required",
        });
      }


      const specialtyIds =
        cleanStringArray(
          req.body.specialtyIds
        );


      if (
        specialtyIds.length >
        0
      ) {
        const validSpecialties =
          await prisma
            .specialty
            .count({
              where: {
                id: {
                  in:
                    specialtyIds,
                },

                isActive:
                  true,
              },
            });


        if (
          validSpecialties !==
          specialtyIds.length
        ) {
          return res.status(400).json({
            message:
              "One or more specialties are invalid",
          });
        }
      }


      const experienceRaw =
        req.body.experienceYears;

      let experienceYears:
        number | null =
        null;


      if (
        experienceRaw !==
          undefined &&
        experienceRaw !==
          null &&
        String(
          experienceRaw
        ).trim() !==
          ""
      ) {
        const parsed =
          Number(
            experienceRaw
          );


        if (
          !Number.isInteger(
            parsed
          ) ||
          parsed < 0 ||
          parsed > 80
        ) {
          return res.status(400).json({
            message:
              "Years of experience must be a whole number between 0 and 80",
          });
        }


        experienceYears =
          parsed;
      }


      const qualificationsInput =
        Array.isArray(
          req.body.qualifications
        )
          ? req.body
              .qualifications
          : [];


      const qualifications =
        qualificationsInput
          .map(
            (
              item: any
            ) => {
              const qualificationName =
                cleanOptionalString(
                  item
                    ?.qualificationName
                );

              const institution =
                cleanOptionalString(
                  item
                    ?.institution
                );

              let year:
                number | null =
                null;


              if (
                item?.year !==
                  undefined &&
                item?.year !==
                  null &&
                String(
                  item.year
                ).trim() !==
                  ""
              ) {
                const parsedYear =
                  Number(
                    item.year
                  );


                if (
                  Number.isInteger(
                    parsedYear
                  ) &&
                  parsedYear >=
                    1900 &&
                  parsedYear <=
                    new Date()
                      .getFullYear() +
                      10
                ) {
                  year =
                    parsedYear;
                }
              }


              if (
                !qualificationName &&
                !institution &&
                !year
              ) {
                return null;
              }


              return {
                qualificationName,
                institution,
                year,
              };
            }
          )
          .filter(
            Boolean
          ) as {
            qualificationName:
              string | null;

            institution:
              string | null;

            year:
              number | null;
          }[];


      await prisma.$transaction(
        async (tx) => {
          await tx
            .practitionerProfile
            .update({
              where: {
                id:
                  profile.id,
              },

              data: {
                practitionerType:
                  cleanOptionalString(
                    req.body
                      .practitionerType
                  ),

                professionalTitle:
                  cleanOptionalString(
                    req.body
                      .professionalTitle
                  ),

                experienceYears,

                onboardingStep: {
                  set:
                    Math.max(
                      profile
                        .onboardingStep,
                      3
                    ),
                },
              },
            });


          await tx
            .practitionerSpecialty
            .deleteMany({
              where: {
                practitionerId:
                  profile.id,
              },
            });


          if (
            specialtyIds.length >
            0
          ) {
            await tx
              .practitionerSpecialty
              .createMany({
                data:
                  specialtyIds.map(
                    (
                      specialtyId
                    ) => ({
                      practitionerId:
                        profile.id,

                      specialtyId,
                    })
                  ),

                skipDuplicates:
                  true,
              });
          }


          await tx
            .practitionerQualification
            .deleteMany({
              where: {
                practitionerId:
                  profile.id,
              },
            });


          if (
            qualifications.length >
            0
          ) {
            await tx
              .practitionerQualification
              .createMany({
                data:
                  qualifications.map(
                    (
                      item
                    ) => ({
                      practitionerId:
                        profile.id,

                      ...item,
                    })
                  ),
              });
          }
        }
      );


      const practitioner =
        await getCompleteProfile(
          userId
        );


      return res.status(200).json({
        message:
          "Professional details saved",

        practitioner,
      });

    } catch (error) {
      console.error(
        "savePractitionerProfessionalDetails:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to save professional details",
      });
    }
  };


// ======================================================
// STEP 3 - ONLINE PRESENCE
//
// All fields optional. This step may be skipped.
// ======================================================

export const savePractitionerOnlinePresence =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized",
        });
      }


      const profile =
        await ensurePractitionerProfile(
          userId
        );


      if (!profile) {
        return res.status(403).json({
          message:
            "Practitioner access required",
        });
      }


      await prisma
        .practitionerProfile
        .update({
          where: {
            id:
              profile.id,
          },

          data: {
            websiteUrl:
              cleanOptionalString(
                req.body.websiteUrl
              ),

            instagramUrl:
              cleanOptionalString(
                req.body.instagramUrl
              ),

            facebookUrl:
              cleanOptionalString(
                req.body.facebookUrl
              ),

            youtubeUrl:
              cleanOptionalString(
                req.body.youtubeUrl
              ),

            onboardingStep: {
              set:
                Math.max(
                  profile
                    .onboardingStep,
                  4
                ),
            },
          },
        });


      const practitioner =
        await getCompleteProfile(
          userId
        );


      return res.status(200).json({
        message:
          "Online presence saved",

        practitioner,
      });

    } catch (error) {
      console.error(
        "savePractitionerOnlinePresence:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to save online presence",
      });
    }
  };


// ======================================================
// AVATAR CHOICE
//
// INITIALS = initials
// AVATAR   = one of your predefined Anandam avatars
//
// PHOTO is set automatically when a profile image upload is confirmed.
// ======================================================

export const selectPractitionerAvatar =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized",
        });
      }


      const mode =
        String(
          req.body.avatarMode ||
          ""
        )
          .trim()
          .toUpperCase();


      if (
        mode !==
          "INITIALS" &&
        mode !==
          "AVATAR"
      ) {
        return res.status(400).json({
          message:
            "avatarMode must be INITIALS or AVATAR",
        });
      }


      const avatarId =
        mode ===
        "AVATAR"
          ? cleanOptionalString(
              req.body.avatarId
            )
          : null;


      if (
        mode ===
          "AVATAR" &&
        !avatarId
      ) {
        return res.status(400).json({
          message:
            "avatarId is required when avatarMode is AVATAR",
        });
      }


      const profile =
        await ensurePractitionerProfile(
          userId
        );


      if (!profile) {
        return res.status(403).json({
          message:
            "Practitioner access required",
        });
      }


      const oldPhotoPath =
        profile
          .profileImagePathname;


      await prisma.$transaction([
        prisma.user.update({
          where: {
            id:
              userId,
          },

          data: {
            avatarMode:
              mode,

            avatarId,
          },
        }),

        prisma.practitionerProfile.update({
          where: {
            id:
              profile.id,
          },

          data: {
            profileImageUrl:
              null,

            profileImagePathname:
              null,
          },
        }),
      ]);


      // Best effort cleanup of an old uploaded photo.
      if (
        oldPhotoPath &&
        process.env
          .PRACTITIONER_PROFILE_BLOB_TOKEN
      ) {
        try {
          await del(
            oldPhotoPath,
            {
              token:
                process.env
                  .PRACTITIONER_PROFILE_BLOB_TOKEN,
            }
          );
        } catch (error) {
          console.error(
            "Old practitioner photo cleanup failed:",
            error
          );
        }
      }


      const practitioner =
        await getCompleteProfile(
          userId
        );


      return res.status(200).json({
        message:
          "Avatar updated",

        practitioner,
      });

    } catch (error) {
      console.error(
        "selectPractitionerAvatar:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to update avatar",
      });
    }
  };


// ======================================================
// DIRECT UPLOAD - CREATE SIGNED PUT URL
//
// PROFILE_IMAGE:
// - public Blob store
// - JPEG / PNG / WEBP
// - maximum 4.5 MB
//
// DOCUMENT:
// - private Blob store
// - PDF / Word / Excel / images
// - maximum 4.5 MB
//
// The file is uploaded directly from the browser to Blob.
// It does NOT pass through the Express/Vercel function.
// ======================================================

export const createPractitionerUploadUrl =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized",
        });
      }


      const profile =
        await ensurePractitionerProfile(
          userId
        );


      if (!profile) {
        return res.status(403).json({
          message:
            "Practitioner access required",
        });
      }


      const kind =
        String(
          req.body.kind || ""
        )
          .trim()
          .toUpperCase();


      const fileName =
        String(
          req.body.fileName ||
          ""
        ).trim();

      const contentType =
        String(
          req.body.contentType ||
          ""
        ).trim();

      const sizeBytes =
        Number(
          req.body.sizeBytes
        );


      if (
        !fileName ||
        !contentType ||
        !Number.isFinite(
          sizeBytes
        ) ||
        sizeBytes <= 0
      ) {
        return res.status(400).json({
          message:
            "kind, fileName, contentType and sizeBytes are required",
        });
      }


      let access:
        "public" |
        "private";

      let maxBytes:
        number;

      let allowedContentTypes:
        string[];

      let token:
        string | undefined;

      let folder:
        string;


      if (
        kind ===
        "PROFILE_IMAGE"
      ) {
        access =
          "public";

        maxBytes =
          PROFILE_MAX_BYTES;

        allowedContentTypes =
          PROFILE_CONTENT_TYPES;

        token =
          process.env
            .PRACTITIONER_PROFILE_BLOB_TOKEN;

        folder =
          `practitioners/${userId}/profile`;

      } else if (
        kind ===
        "DOCUMENT"
      ) {
        access =
          "private";

        maxBytes =
          DOCUMENT_MAX_BYTES;

        allowedContentTypes =
          DOCUMENT_CONTENT_TYPES;

        token =
          process.env
            .PRACTITIONER_DOCUMENT_BLOB_TOKEN;

        folder =
          `practitioners/${userId}/documents`;

      } else {
        return res.status(400).json({
          message:
            "kind must be PROFILE_IMAGE or DOCUMENT",
        });
      }


      if (!token) {
        return res.status(500).json({
          message:
            kind ===
            "PROFILE_IMAGE"
              ? "Practitioner profile upload storage is not configured"
              : "Practitioner document upload storage is not configured",
        });
      }


      if (
        sizeBytes >
        maxBytes
      ) {
        return res.status(413).json({
          message:
            kind ===
            "PROFILE_IMAGE"
              ? "Profile image must be 4.5 MB or smaller"
              : "Document must be 4.5 MB or smaller",

          maximumSizeInBytes:
            maxBytes,
        });
      }


      if (
        !allowedContentTypes
          .includes(
            contentType
          )
      ) {
        return res.status(415).json({
          message:
            "Unsupported file type",

          allowedContentTypes,
        });
      }


      const pathname =
        `${folder}/${Date.now()}-${randomBytes(
          6
        ).toString("hex")}-${safeFileName(
          fileName
        )}`;


      const validUntil =
        Date.now() +
        15 * 60 * 1000;


      const signedToken =
        await issueSignedToken({
          token,

          pathname,

          operations: [
            "put",
          ],

          validUntil,

          allowedContentTypes: [
            contentType,
          ],

          maximumSizeInBytes:
            maxBytes,
        });


      const {
        presignedUrl,
      } =
        await presignUrl(
          signedToken,
          {
            access,

            operation:
              "put",

            pathname,

            validUntil,

            allowedContentTypes: [
              contentType,
            ],

            maximumSizeInBytes:
              maxBytes,

            allowOverwrite:
              false,
          }
        );


      return res.status(200).json({
        kind,

        pathname,

        access,

        uploadUrl:
          presignedUrl,

        method:
          "PUT",

        contentType,

        maximumSizeInBytes:
          maxBytes,

        expiresAt:
          new Date(
            validUntil
          ).toISOString(),
      });

    } catch (error) {
      console.error(
        "createPractitionerUploadUrl:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to prepare upload",
      });
    }
  };


// ======================================================
// DIRECT UPLOAD - CONFIRM AFTER BROWSER PUT FINISHES
//
// We HEAD the actual blob and verify:
// - it belongs to this practitioner path
// - its actual content type
// - its actual size
//
// Only then is it attached to the practitioner profile.
// ======================================================

export const confirmPractitionerUpload =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized",
        });
      }


      const profile =
        await ensurePractitionerProfile(
          userId
        );


      if (!profile) {
        return res.status(403).json({
          message:
            "Practitioner access required",
        });
      }


      const kind =
        String(
          req.body.kind ||
          ""
        )
          .trim()
          .toUpperCase();

      const pathname =
        String(
          req.body.pathname ||
          ""
        ).trim();

      const originalFileName =
        safeFileName(
          String(
            req.body.fileName ||
            "upload"
          )
        );

      const documentType =
        cleanOptionalString(
          req.body.documentType
        ) ||
        "SUPPORTING_DOCUMENT";


      let token:
        string | undefined;

      let expectedPrefix:
        string;

      let maxBytes:
        number;

      let allowedContentTypes:
        string[];


      if (
        kind ===
        "PROFILE_IMAGE"
      ) {
        token =
          process.env
            .PRACTITIONER_PROFILE_BLOB_TOKEN;

        expectedPrefix =
          `practitioners/${userId}/profile/`;

        maxBytes =
          PROFILE_MAX_BYTES;

        allowedContentTypes =
          PROFILE_CONTENT_TYPES;

      } else if (
        kind ===
        "DOCUMENT"
      ) {
        token =
          process.env
            .PRACTITIONER_DOCUMENT_BLOB_TOKEN;

        expectedPrefix =
          `practitioners/${userId}/documents/`;

        maxBytes =
          DOCUMENT_MAX_BYTES;

        allowedContentTypes =
          DOCUMENT_CONTENT_TYPES;

      } else {
        return res.status(400).json({
          message:
            "kind must be PROFILE_IMAGE or DOCUMENT",
        });
      }


      if (!token) {
        return res.status(500).json({
          message:
            "Upload storage is not configured",
        });
      }


      if (
        !pathname.startsWith(
          expectedPrefix
        )
      ) {
        return res.status(403).json({
          message:
            "Upload does not belong to this practitioner",
        });
      }


      const metadata =
        await head(
          pathname,
          {
            token,
          }
        );


      const validSize =
        metadata.size <=
        maxBytes;

      const validType =
        allowedContentTypes
          .includes(
            metadata
              .contentType
          );


      if (
        !validSize ||
        !validType
      ) {
        try {
          await del(
            pathname,
            {
              token,
            }
          );
        } catch {
          // Ignore cleanup error.
        }


        return res.status(400).json({
          message:
            !validSize
              ? (
                  kind ===
                  "PROFILE_IMAGE"
                    ? "Profile image must be 4.5 MB or smaller"
                    : "Document must be 4.5 MB or smaller"
                )
              : "Unsupported uploaded file type",
        });
      }


      if (
        kind ===
        "PROFILE_IMAGE"
      ) {
        const previousPath =
          profile
            .profileImagePathname;


        await prisma.$transaction([
          prisma.user.update({
            where: {
              id:
                userId,
            },

            data: {
              avatarMode:
                "PHOTO",

              avatarId:
                null,
            },
          }),

          prisma.practitionerProfile.update({
            where: {
              id:
                profile.id,
            },

            data: {
              profileImageUrl:
                metadata.url,

              profileImagePathname:
                metadata.pathname,
            },
          }),
        ]);


        if (
          previousPath &&
          previousPath !==
            metadata.pathname
        ) {
          try {
            await del(
              previousPath,
              {
                token,
              }
            );
          } catch (error) {
            console.error(
              "Old profile photo cleanup failed:",
              error
            );
          }
        }


        const practitioner =
          await getCompleteProfile(
            userId
          );


        return res.status(200).json({
          message:
            "Profile image uploaded",

          practitioner,
        });
      }


      const document =
        await prisma
          .practitionerDocument
          .upsert({
            where: {
              blobPathname:
                metadata.pathname,
            },

            create: {
              practitionerId:
                profile.id,

              fileName:
                originalFileName,

              contentType:
                metadata.contentType,

              sizeBytes:
                metadata.size,

              blobUrl:
                metadata.url,

              blobPathname:
                metadata.pathname,

              documentType,
            },

            update: {
              fileName:
                originalFileName,

              contentType:
                metadata.contentType,

              sizeBytes:
                metadata.size,

              documentType,
            },
          });


      return res.status(201).json({
        message:
          "Document uploaded",

        document,
      });

    } catch (error) {
      console.error(
        "confirmPractitionerUpload:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to confirm upload",
      });
    }
  };


// ======================================================
// PRIVATE DOCUMENT - TEMPORARY DOWNLOAD URL
// ======================================================

export const getPractitionerDocumentDownloadUrl =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized",
        });
      }


      const documentId =
        String(
          req.params.documentId
        );


      const document =
        await prisma
          .practitionerDocument
          .findFirst({
            where: {
              id:
                documentId,

              practitioner: {
                userId,
              },
            },
          });


      if (!document) {
        return res.status(404).json({
          message:
            "Document not found",
        });
      }


      const token =
        process.env
          .PRACTITIONER_DOCUMENT_BLOB_TOKEN;


      if (!token) {
        return res.status(500).json({
          message:
            "Practitioner document storage is not configured",
        });
      }


      const validUntil =
        Date.now() +
        5 * 60 * 1000;


      const signedToken =
        await issueSignedToken({
          token,

          pathname:
            document
              .blobPathname,

          operations: [
            "get",
          ],

          validUntil,
        });


      const {
        presignedUrl,
      } =
        await presignUrl(
          signedToken,
          {
            access:
              "private",

            operation:
              "get",

            pathname:
              document
                .blobPathname,

            validUntil,
          }
        );


      return res.status(200).json({
        url:
          presignedUrl,

        expiresAt:
          new Date(
            validUntil
          ).toISOString(),
      });

    } catch (error) {
      console.error(
        "getPractitionerDocumentDownloadUrl:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to open document",
      });
    }
  };


// ======================================================
// DELETE SUPPORTING DOCUMENT
// ======================================================

export const deletePractitionerDocument =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized",
        });
      }


      const documentId =
        String(
          req.params.documentId
        );


      const document =
        await prisma
          .practitionerDocument
          .findFirst({
            where: {
              id:
                documentId,

              practitioner: {
                userId,
              },
            },
          });


      if (!document) {
        return res.status(404).json({
          message:
            "Document not found",
        });
      }


      const token =
        process.env
          .PRACTITIONER_DOCUMENT_BLOB_TOKEN;


      await prisma
        .practitionerDocument
        .delete({
          where: {
            id:
              document.id,
          },
        });


      if (token) {
        try {
          await del(
            document
              .blobPathname,
            {
              token,
            }
          );
        } catch (error) {
          console.error(
            "Blob document cleanup failed:",
            error
          );
        }
      }


      return res.status(200).json({
        message:
          "Document deleted",
      });

    } catch (error) {
      console.error(
        "deletePractitionerDocument:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to delete document",
      });
    }
  };


// ======================================================
// STEP 4 - REVIEW & SUBMIT
//
// IMPORTANT:
// Only User.fullName and User.email are mandatory.
//
// Submitting does NOT make the practitioner public.
// It moves the profile to PENDING_REVIEW.
// SUPER_ADMIN approval will be built later.
// ======================================================

export const submitPractitionerOnboarding =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized",
        });
      }


      const user =
        await prisma.user.findUnique({
          where: {
            id:
              userId,
          },

          include: {
            practitionerProfile:
              true,
          },
        });


      if (
        !user ||
        user.role !==
          UserRole.PRACTITIONER
      ) {
        return res.status(403).json({
          message:
            "Practitioner access required",
        });
      }


      if (
        !user.fullName?.trim() ||
        !user.email?.trim()
      ) {
        return res.status(400).json({
          message:
            "Full name and email are required before submission",
        });
      }


      const profile =
        user
          .practitionerProfile ||
        await ensurePractitionerProfile(
          userId
        );


      if (!profile) {
        return res.status(403).json({
          message:
            "Practitioner profile is unavailable",
        });
      }


      await prisma
        .practitionerProfile
        .update({
          where: {
            id:
              profile.id,
          },

          data: {
            onboardingStep:
              4,

            onboardingCompleted:
              true,

            approvalStatus:
              "PENDING_REVIEW",

            submittedAt:
              new Date(),

            // SUPER_ADMIN decides when this becomes visible.
            isVisible:
              false,
          },
        });


      const practitioner =
        await getCompleteProfile(
          userId
        );


      return res.status(200).json({
        message:
          "Practitioner profile submitted",

        practitioner,
      });

    } catch (error) {
      console.error(
        "submitPractitionerOnboarding:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to submit practitioner profile",
      });
    }
  };
