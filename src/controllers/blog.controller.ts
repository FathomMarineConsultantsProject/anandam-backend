import {
  Response,
  Request,
} from "express";

import {
  PrismaClient,
  Prisma,
} from "@prisma/client";

import {
  randomBytes,
} from "crypto";

import {
  AuthRequest,
} from "../middleware/auth.middleware";


const prisma =
  new PrismaClient();


// ======================================================
// CONSTANTS
// ======================================================

const BLOG_VISIBILITIES = [
  "PUBLIC",
  "PRIVATE",
];

const MAX_TITLE_LENGTH =
  200;

const MAX_ILLUSTRATION_KEY_LENGTH =
  100;

// 500 KB JSON article limit.
// More than enough for text-only blog content.
const MAX_CONTENT_SIZE =
  500 * 1024;


// ======================================================
// HELPERS
// ======================================================

const getParam = (
  value:
    | string
    | string[]
    | undefined
): string | undefined => {

  return Array.isArray(
    value
  )
    ? value[0]
    : value;
};


// ======================================================
// SHARE TOKEN
// ======================================================

const generateShareToken =
  (): string => {

    return randomBytes(
      32
    ).toString(
      "hex"
    );
  };


// ======================================================
// PUBLIC FRONTEND LINK
// ======================================================

const buildPublicBlogUrl = (
  token:
    | string
    | null
    | undefined
): string | null => {

  if (!token) {
    return null;
  }


  const frontendUrl =
    (
      process.env.FRONTEND_URL ||
      "http://localhost:5173"
    ).replace(
      /\/+$/,
      ""
    );


  /*
    Public frontend page.

    No Anandam login should be required
    for this frontend route.
  */
  return (
    `${frontendUrl}` +
    `/blog/${token}`
  );
};


// ======================================================
// CONTENT VALIDATION
// ======================================================

const validateBlogContent = (
  value: unknown
):
  | {
      valid: true;
      content:
        Prisma.InputJsonValue;
    }
  | {
      valid: false;
      error: string;
    } => {

  if (
    value === null ||
    typeof value !==
      "object"
  ) {

    return {
      valid:
        false,

      error:
        "Blog content must be a valid editor JSON document",
    };
  }


  let serialized:
    string;


  try {

    serialized =
      JSON.stringify(
        value
      );

  } catch {

    return {
      valid:
        false,

      error:
        "Blog content contains invalid JSON",
    };
  }


  if (
    serialized.length >
    MAX_CONTENT_SIZE
  ) {

    return {
      valid:
        false,

      error:
        "Blog content is too large",
    };
  }


  return {
    valid:
      true,

    content:
      value as
        Prisma.InputJsonValue,
  };
};


// ======================================================
// EXTRACT PLAIN TEXT FROM EDITOR JSON
//
// Used only for blog cards / excerpts.
// ======================================================

const extractPlainText = (
  node: any
): string => {

  if (
    node === null ||
    node === undefined
  ) {
    return "";
  }


  if (
    Array.isArray(
      node
    )
  ) {

    return node
      .map(
        extractPlainText
      )
      .filter(
        Boolean
      )
      .join(
        " "
      );
  }


  if (
    typeof node !==
      "object"
  ) {
    return "";
  }


  const ownText =
    typeof node.text ===
      "string"
      ? node.text
      : "";


  const childText =
    Array.isArray(
      node.content
    )
      ? node.content
          .map(
            extractPlainText
          )
          .filter(
            Boolean
          )
          .join(
            " "
          )
      : "";


  return [
    ownText,
    childText,
  ]
    .filter(
      Boolean
    )
    .join(
      " "
    );
};


// ======================================================
// CREATE EXCERPT
// ======================================================

const createExcerpt = (
  content: unknown
): string => {

  const text =
    extractPlainText(
      content
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  if (
    text.length <=
    180
  ) {
    return text;
  }


  return (
    text.slice(
      0,
      177
    ).trim() +
    "..."
  );
};


// ======================================================
// READING TIME
// ======================================================

const calculateReadingTime =
  (
    content: unknown
  ): number => {

    const text =
      extractPlainText(
        content
      ).trim();


    if (!text) {
      return 1;
    }


    const words =
      text
        .split(
          /\s+/
        )
        .filter(
          Boolean
        )
        .length;


    return Math.max(
      1,
      Math.ceil(
        words / 200
      )
    );
  };


// ======================================================
// CREATE / PUBLISH BLOG
//
// POST /api/blogs
// ======================================================

export const createBlog =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {

    try {

      const userId =
        req.user?.userId;


      if (!userId) {

        return res
          .status(401)
          .json({
            error:
              "Unauthorized",
          });
      }


      const title =
        String(
          req.body.title ??
          ""
        ).trim();


      const coverIllustrationKey =
        String(
          req.body
            .coverIllustrationKey ??
          ""
        ).trim();


      const visibility =
        String(
          req.body.visibility ??
          ""
        )
          .trim()
          .toUpperCase();


      // ==================================================
      // VALIDATION
      // ==================================================

      if (!title) {

        return res
          .status(400)
          .json({
            error:
              "Blog title is required",
          });
      }


      if (
        title.length >
        MAX_TITLE_LENGTH
      ) {

        return res
          .status(400)
          .json({
            error:
              "Blog title cannot exceed 200 characters",
          });
      }


      if (
        !coverIllustrationKey
      ) {

        return res
          .status(400)
          .json({
            error:
              "Please select a blog illustration",
          });
      }


      if (
        coverIllustrationKey
          .length >
        MAX_ILLUSTRATION_KEY_LENGTH
      ) {

        return res
          .status(400)
          .json({
            error:
              "Invalid blog illustration",
          });
      }


      if (
        !BLOG_VISIBILITIES
          .includes(
            visibility
          )
      ) {

        return res
          .status(400)
          .json({
            error:
              "visibility must be PUBLIC or PRIVATE",
          });
      }


      const contentResult =
        validateBlogContent(
          req.body.content
        );


      if (
  contentResult.valid === false
) {

  return res
    .status(400)
    .json({
      error:
        contentResult.error,
    });
}


      const excerpt =
        createExcerpt(
          req.body.content
        );


      const publicShareToken =
        visibility ===
        "PUBLIC"
          ? generateShareToken()
          : null;


      const blog =
        await prisma
          .blog
          .create({

            data: {

              authorId:
                userId,

              title,

              excerpt,

              content:
                contentResult
                  .content,

              coverIllustrationKey,

              visibility,

              publicShareToken,
            },

            include: {

              author: {
                select: {
                  id:
                    true,

                  fullName:
                    true,

                  avatarMode:
                    true,

                  avatarId:
                    true,
                },
              },
            },
          });


      return res
        .status(201)
        .json({

          status:
            "success",

          message:
            visibility ===
            "PUBLIC"
              ? "Blog published publicly"
              : "Private blog published successfully",

          data: {

            ...blog,

            readingTimeMinutes:
              calculateReadingTime(
                blog.content
              ),

            publicUrl:
              buildPublicBlogUrl(
                blog
                  .publicShareToken
              ),

            isOwner:
              true,

            canEdit:
              true,

            canDelete:
              true,

            canShare:
              blog.visibility ===
              "PUBLIC",
          },
        });

    } catch (error) {

      console.error(
        "Create blog error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Failed to publish blog",
        });
    }
  };


// ======================================================
// PUBLIC BLOG FEED INSIDE ANANDAM
//
// GET /api/blogs
//
// Login required.
// Only PUBLIC blogs are shown.
// ======================================================

export const getPublicBlogs =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {

    try {

      const userId =
        req.user?.userId;


      if (!userId) {

        return res
          .status(401)
          .json({
            error:
              "Unauthorized",
          });
      }


      const blogs =
        await prisma
          .blog
          .findMany({

            where: {
              visibility:
                "PUBLIC",
            },

            orderBy: {
              publishedAt:
                "desc",
            },

            select: {

              id:
                true,

              title:
                true,

              excerpt:
                true,

              coverIllustrationKey:
                true,

              visibility:
                true,

              publicShareToken:
                true,

              publishedAt:
                true,

              createdAt:
                true,

              updatedAt:
                true,

              authorId:
                true,

              author: {
                select: {
                  id:
                    true,

                  fullName:
                    true,

                  avatarMode:
                    true,

                  avatarId:
                    true,
                },
              },
            },
          });


      const data =
        blogs.map(
          (
            blog
          ) => ({

            ...blog,

            publicUrl:
              buildPublicBlogUrl(
                blog
                  .publicShareToken
              ),

            isOwner:
              blog.authorId ===
              userId,

            canShare:
              true,
          })
        );


      return res
        .status(200)
        .json({

          status:
            "success",

          count:
            data.length,

          data,
        });

    } catch (error) {

      console.error(
        "Get public blogs error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Failed to fetch blogs",
        });
    }
  };


// ======================================================
// MY BLOGS
//
// GET /api/blogs/mine
//
// Shows both PUBLIC and PRIVATE.
// ======================================================

export const getMyBlogs =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {

    try {

      const userId =
        req.user?.userId;


      if (!userId) {

        return res
          .status(401)
          .json({
            error:
              "Unauthorized",
          });
      }


      const blogs =
        await prisma
          .blog
          .findMany({

            where: {
              authorId:
                userId,
            },

            orderBy: {
              updatedAt:
                "desc",
            },

            select: {

              id:
                true,

              title:
                true,

              excerpt:
                true,

              coverIllustrationKey:
                true,

              visibility:
                true,

              publicShareToken:
                true,

              publishedAt:
                true,

              createdAt:
                true,

              updatedAt:
                true,
            },
          });


      const data =
        blogs.map(
          (
            blog
          ) => ({

            ...blog,

            publicUrl:
              buildPublicBlogUrl(
                blog
                  .publicShareToken
              ),

            isOwner:
              true,

            canEdit:
              true,

            canDelete:
              true,

            canShare:
              blog.visibility ===
              "PUBLIC",
          })
        );


      return res
        .status(200)
        .json({

          status:
            "success",

          count:
            data.length,

          data,
        });

    } catch (error) {

      console.error(
        "Get my blogs error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Failed to fetch your blogs",
        });
    }
  };


// ======================================================
// VIEW BLOG WHILE LOGGED IN
//
// GET /api/blogs/:blogId
//
// PUBLIC:
// any logged-in Anandam user.
//
// PRIVATE:
// owner only.
// ======================================================

export const getBlogById =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {

    try {

      const userId =
        req.user?.userId;


      if (!userId) {

        return res
          .status(401)
          .json({
            error:
              "Unauthorized",
          });
      }


      const blogId =
        getParam(
          req.params.blogId
        );


      if (!blogId) {

        return res
          .status(400)
          .json({
            error:
              "blogId is required",
          });
      }


      const blog =
        await prisma
          .blog
          .findUnique({

            where: {
              id:
                blogId,
            },

            include: {

              author: {
                select: {
                  id:
                    true,

                  fullName:
                    true,

                  avatarMode:
                    true,

                  avatarId:
                    true,
                },
              },
            },
          });


      if (!blog) {

        return res
          .status(404)
          .json({
            error:
              "Blog not found",
          });
      }


      const isOwner =
        blog.authorId ===
        userId;


      if (
        blog.visibility ===
          "PRIVATE" &&
        !isOwner
      ) {

        /*
          Return 404 rather than exposing
          existence of someone else's private blog.
        */
        return res
          .status(404)
          .json({
            error:
              "Blog not found",
          });
      }


      return res
        .status(200)
        .json({

          status:
            "success",

          data: {

            ...blog,

            readingTimeMinutes:
              calculateReadingTime(
                blog.content
              ),

            publicUrl:
              blog.visibility ===
              "PUBLIC"
                ? buildPublicBlogUrl(
                    blog
                      .publicShareToken
                  )
                : null,

            isOwner,

            canEdit:
              isOwner,

            canDelete:
              isOwner,

            canShare:
              blog.visibility ===
              "PUBLIC",
          },
        });

    } catch (error) {

      console.error(
        "Get blog error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Failed to fetch blog",
        });
    }
  };


// ======================================================
// PUBLIC SHARED BLOG
//
// GET /api/blogs/public/:shareToken
//
// NO LOGIN.
// ======================================================

export const getPublicBlogByToken =
  async (
    req: Request,
    res: Response
  ): Promise<any> => {

    try {

      const shareToken =
        getParam(
          req.params.shareToken
        );


      if (!shareToken) {

        return res
          .status(400)
          .json({
            error:
              "Share token is required",
          });
      }


      const blog =
        await prisma
          .blog
          .findFirst({

            where: {

              publicShareToken:
                shareToken,

              visibility:
                "PUBLIC",
            },

            include: {

              author: {
                select: {

                  id:
                    true,

                  fullName:
                    true,

                  avatarMode:
                    true,

                  avatarId:
                    true,
                },
              },
            },
          });


      if (!blog) {

        return res
          .status(404)
          .json({

            error:
              "This blog link is invalid or no longer public",
          });
      }


      return res
        .status(200)
        .json({

          status:
            "success",

          data: {

            id:
              blog.id,

            title:
              blog.title,

            excerpt:
              blog.excerpt,

            content:
              blog.content,

            coverIllustrationKey:
              blog
                .coverIllustrationKey,

            visibility:
              blog.visibility,

            publishedAt:
              blog.publishedAt,

            updatedAt:
              blog.updatedAt,

            author:
              blog.author,

            readingTimeMinutes:
              calculateReadingTime(
                blog.content
              ),

            publicUrl:
              buildPublicBlogUrl(
                blog
                  .publicShareToken
              ),

            canShare:
              true,
          },
        });

    } catch (error) {

      console.error(
        "Public blog error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Failed to fetch public blog",
        });
    }
  };


// ======================================================
// EDIT BLOG
//
// PATCH /api/blogs/:blogId
//
// Owner only.
//
// Visibility is intentionally handled separately
// so public-link rotation cannot be bypassed.
// ======================================================

export const updateBlog =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {

    try {

      const userId =
        req.user?.userId;


      if (!userId) {

        return res
          .status(401)
          .json({
            error:
              "Unauthorized",
          });
      }


      const blogId =
        getParam(
          req.params.blogId
        );


      if (!blogId) {

        return res
          .status(400)
          .json({
            error:
              "blogId is required",
          });
      }


      const existing =
        await prisma
          .blog
          .findFirst({

            where: {
              id:
                blogId,

              authorId:
                userId,
            },
          });


      if (!existing) {

        return res
          .status(404)
          .json({
            error:
              "Blog not found",
          });
      }


      /*
        Prevent accidental visibility updates here.

        Use:
        PATCH /api/blogs/:blogId/visibility
      */
      if (
        req.body.visibility !==
        undefined
      ) {

        return res
          .status(400)
          .json({
            error:
              "Use the visibility endpoint to change Public or Private status",
          });
      }


      const data:
        Prisma.BlogUpdateInput =
        {};


      // ==================================================
      // TITLE
      // ==================================================

      if (
        req.body.title !==
        undefined
      ) {

        const title =
          String(
            req.body.title ??
            ""
          ).trim();


        if (!title) {

          return res
            .status(400)
            .json({
              error:
                "Blog title cannot be empty",
            });
        }


        if (
          title.length >
          MAX_TITLE_LENGTH
        ) {

          return res
            .status(400)
            .json({
              error:
                "Blog title cannot exceed 200 characters",
            });
        }


        data.title =
          title;
      }


      // ==================================================
      // ILLUSTRATION
      // ==================================================

      if (
        req.body
          .coverIllustrationKey !==
        undefined
      ) {

        const key =
          String(
            req.body
              .coverIllustrationKey ??
            ""
          ).trim();


        if (!key) {

          return res
            .status(400)
            .json({
              error:
                "Please select a blog illustration",
            });
        }


        if (
          key.length >
          MAX_ILLUSTRATION_KEY_LENGTH
        ) {

          return res
            .status(400)
            .json({
              error:
                "Invalid blog illustration",
            });
        }


        data
          .coverIllustrationKey =
          key;
      }


      // ==================================================
      // CONTENT
      // ==================================================

      if (
        req.body.content !==
        undefined
      ) {

        const contentResult =
          validateBlogContent(
            req.body.content
          );


        if (
  contentResult.valid === false
) {

  return res
    .status(400)
    .json({
      error:
        contentResult.error,
    });
}


        data.content =
          contentResult
            .content;


        data.excerpt =
          createExcerpt(
            req.body.content
          );
      }


      const updated =
        await prisma
          .blog
          .update({

            where: {
              id:
                blogId,
            },

            data,

            include: {

              author: {
                select: {
                  id:
                    true,

                  fullName:
                    true,

                  avatarMode:
                    true,

                  avatarId:
                    true,
                },
              },
            },
          });


      return res
        .status(200)
        .json({

          status:
            "success",

          message:
            "Blog updated successfully",

          data: {

            ...updated,

            readingTimeMinutes:
              calculateReadingTime(
                updated.content
              ),

            publicUrl:
              buildPublicBlogUrl(
                updated
                  .publicShareToken
              ),

            isOwner:
              true,

            canEdit:
              true,

            canDelete:
              true,

            canShare:
              updated.visibility ===
              "PUBLIC",
          },
        });

    } catch (error) {

      console.error(
        "Update blog error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Failed to update blog",
        });
    }
  };


// ======================================================
// CHANGE PUBLIC / PRIVATE
//
// PATCH /api/blogs/:blogId/visibility
//
// Owner only.
// ======================================================

export const updateBlogVisibility =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {

    try {

      const userId =
        req.user?.userId;


      if (!userId) {

        return res
          .status(401)
          .json({
            error:
              "Unauthorized",
          });
      }


      const blogId =
        getParam(
          req.params.blogId
        );


      const visibility =
        String(
          req.body.visibility ??
          ""
        )
          .trim()
          .toUpperCase();


      if (!blogId) {

        return res
          .status(400)
          .json({
            error:
              "blogId is required",
          });
      }


      if (
        !BLOG_VISIBILITIES
          .includes(
            visibility
          )
      ) {

        return res
          .status(400)
          .json({
            error:
              "visibility must be PUBLIC or PRIVATE",
          });
      }


      const existing =
        await prisma
          .blog
          .findFirst({

            where: {
              id:
                blogId,

              authorId:
                userId,
            },
          });


      if (!existing) {

        return res
          .status(404)
          .json({
            error:
              "Blog not found",
          });
      }


      // ==================================================
      // SAME VISIBILITY
      //
      // Keep existing URL.
      // ==================================================

      if (
        existing.visibility ===
        visibility
      ) {

        return res
          .status(200)
          .json({

            status:
              "success",

            message:
              "Blog visibility is already up to date",

            data: {

              id:
                existing.id,

              visibility:
                existing.visibility,

              publicUrl:
                buildPublicBlogUrl(
                  existing
                    .publicShareToken
                ),
            },
          });
      }


      // ==================================================
      // PRIVATE -> PUBLIC
      //
      // ALWAYS generate a brand-new share token.
      // ==================================================

      if (
        visibility ===
        "PUBLIC"
      ) {

        const newToken =
          generateShareToken();


        const updated =
          await prisma
            .blog
            .update({

              where: {
                id:
                  blogId,
              },

              data: {

                visibility:
                  "PUBLIC",

                publicShareToken:
                  newToken,
              },
            });


        return res
          .status(200)
          .json({

            status:
              "success",

            message:
              "Blog is now public. A new share link has been generated.",

            data: {

              id:
                updated.id,

              visibility:
                updated.visibility,

              publicUrl:
                buildPublicBlogUrl(
                  updated
                    .publicShareToken
                ),
            },
          });
      }


      // ==================================================
      // PUBLIC -> PRIVATE
      //
      // Destroy the share token.
      //
      // Old public links immediately stop working.
      // ==================================================

      const updated =
        await prisma
          .blog
          .update({

            where: {
              id:
                blogId,
            },

            data: {

              visibility:
                "PRIVATE",

              publicShareToken:
                null,
            },
          });


      return res
        .status(200)
        .json({

          status:
            "success",

          message:
            "Blog is now private. The old public link is no longer valid.",

          data: {

            id:
              updated.id,

            visibility:
              updated.visibility,

            publicUrl:
              null,
          },
        });

    } catch (error) {

      console.error(
        "Blog visibility error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Failed to update blog visibility",
        });
    }
  };


// ======================================================
// DELETE BLOG
//
// DELETE /api/blogs/:blogId
//
// Owner only.
// ======================================================

export const deleteBlog =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {

    try {

      const userId =
        req.user?.userId;


      if (!userId) {

        return res
          .status(401)
          .json({
            error:
              "Unauthorized",
          });
      }


      const blogId =
        getParam(
          req.params.blogId
        );


      if (!blogId) {

        return res
          .status(400)
          .json({
            error:
              "blogId is required",
          });
      }


      const existing =
        await prisma
          .blog
          .findFirst({

            where: {
              id:
                blogId,

              authorId:
                userId,
            },

            select: {
              id:
                true,
            },
          });


      if (!existing) {

        return res
          .status(404)
          .json({
            error:
              "Blog not found",
          });
      }


      await prisma
        .blog
        .delete({

          where: {
            id:
              blogId,
          },
        });


      return res
        .status(200)
        .json({

          status:
            "success",

          message:
            "Blog deleted successfully",
        });

    } catch (error) {

      console.error(
        "Delete blog error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Failed to delete blog",
        });
    }
  };