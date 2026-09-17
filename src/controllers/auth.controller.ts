import {
  Request,
  Response,
} from "express";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  randomInt,
  randomBytes,
  createHash,
} from "crypto";

import {
  PrismaClient,
} from "@prisma/client";

import {
  sendPasswordResetEmail,
} from "../utils/mailer";


const prisma = new PrismaClient();


// ======================================================
// AUTH SESSION CONFIGURATION
// ======================================================

// Access token = 6 hours
const ACCESS_TOKEN_EXPIRES_IN =
  "6h" as const;

const ACCESS_TOKEN_EXPIRES_SECONDS =
  6 * 60 * 60;


// Refresh/login session = 7 days
const REFRESH_TOKEN_EXPIRES_IN =
  "7d" as const;

const REFRESH_TOKEN_EXPIRES_MS =
  7 * 24 * 60 * 60 * 1000;

const REFRESH_TOKEN_EXPIRES_SECONDS =
  7 * 24 * 60 * 60;


// ======================================================
// TOKEN HELPERS
// ======================================================

const generateRefreshToken = (
  userId: string
) => {
  /*
    tokenId makes refresh tokens unique even if
    the same user logs in twice during the same second.
  */

  const tokenId =
    randomBytes(16).toString("hex");


  return jwt.sign(
    {
      userId,
      tokenId,
    },

    process.env
      .JWT_REFRESH_SECRET as string,

    {
      expiresIn:
        REFRESH_TOKEN_EXPIRES_IN,
    }
  );
};


const generateAccessToken = (
  userId: string,
  sessionId: string
) => {
  return jwt.sign(
    {
      userId,
      sessionId,
    },

    process.env
      .JWT_ACCESS_SECRET as string,

    {
      expiresIn:
        ACCESS_TOKEN_EXPIRES_IN,
    }
  );
};


// ======================================================
// CREATE LOGIN SESSION
// ======================================================

const createAuthSession = async (
  userId: string
) => {
  const refreshToken =
    generateRefreshToken(userId);


  const expiresAt =
    new Date(
      Date.now() +
        REFRESH_TOKEN_EXPIRES_MS
    );


  /*
    One RefreshToken DB row represents
    one login/device session.
  */

  const session =
    await prisma.refreshToken.create({
      data: {
        token:
          refreshToken,

        userId,

        expiresAt,
      },
    });


  const accessToken =
    generateAccessToken(
      userId,
      session.id
    );


  return {
    accessToken,
    refreshToken,
    sessionExpiresAt:
      session.expiresAt,
  };
};


// ======================================================
// REGISTER USER
// ======================================================

export const registerUser = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      email,
      password,
      fullName,
      rank,
      vessel,
    } = req.body;


    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });


    if (existingUser) {
      return res.status(400).json({
        error:
          "Email already registered",
      });
    }


    const salt =
      await bcrypt.genSalt(10);


    const passwordHash =
      await bcrypt.hash(
        password,
        salt
      );


    const newUser =
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          rank,
          vessel,
        },
      });


    const {
      accessToken,
      refreshToken,
      sessionExpiresAt,
    } = await createAuthSession(
      newUser.id
    );


    return res.status(201).json({
      status: "success",

      accessToken,
      refreshToken,

      accessTokenExpiresInSeconds:
        ACCESS_TOKEN_EXPIRES_SECONDS,

      refreshTokenExpiresInSeconds:
        REFRESH_TOKEN_EXPIRES_SECONDS,

      sessionExpiresAt,

      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
      },
    });

  } catch (error) {
    console.error(
      "Registration error:",
      error
    );


    return res.status(500).json({
      error:
        "Internal server error during registration",
    });
  }
};


// ======================================================
// LOGIN USER
// ======================================================

export const loginUser = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      email,
      password,
    } = req.body;


    if (!email || !password) {
      return res.status(400).json({
        error:
          "Email and password are required",
      });
    }


    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });


    if (!user) {
      return res.status(404).json({
        error:
          "User not found",
      });
    }


    const isMatch =
      await bcrypt.compare(
        password,
        user.passwordHash
      );


    if (!isMatch) {
      return res.status(401).json({
        error:
          "Invalid credentials",
      });
    }


    const {
      accessToken,
      refreshToken,
      sessionExpiresAt,
    } = await createAuthSession(
      user.id
    );


    return res.status(200).json({
      status: "success",

      accessToken,
      refreshToken,

      /*
        Frontend now knows exactly how long
        the access token remains valid.
      */

      accessTokenExpiresInSeconds:
        ACCESS_TOKEN_EXPIRES_SECONDS,

      refreshTokenExpiresInSeconds:
        REFRESH_TOKEN_EXPIRES_SECONDS,

      sessionExpiresAt,

      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    });

  } catch (error) {
    console.error(
      "Login error:",
      error
    );


    return res.status(500).json({
      error:
        "Internal server error during login",
    });
  }
};


// ======================================================
// REFRESH ACCESS TOKEN
// ======================================================

export const refreshAccessToken =
  async (
    req: Request,
    res: Response
  ): Promise<any> => {
    try {
      const refreshToken =
        String(
          req.body.refreshToken || ""
        ).trim();


      // ------------------------------------------------
      // Missing token
      // ------------------------------------------------

      if (!refreshToken) {
        return res.status(401).json({
          status: "error",

          code:
            "REFRESH_TOKEN_MISSING",

          message:
            "Your session cannot be refreshed. Please sign in again.",

          action:
            "LOGIN_REQUIRED",

          shouldLogout: true,
        });
      }


      // ------------------------------------------------
      // Find login session
      // ------------------------------------------------

      const storedToken =
        await prisma.refreshToken.findUnique({
          where: {
            token:
              refreshToken,
          },
        });


      if (!storedToken) {
        return res.status(401).json({
          status: "error",

          code:
            "SESSION_EXPIRED",

          message:
            "Your session has expired or you have been logged out. Please sign in again.",

          action:
            "LOGIN_REQUIRED",

          shouldLogout: true,
        });
      }


      // ------------------------------------------------
      // Check DB expiration
      // ------------------------------------------------

      if (
        storedToken.expiresAt.getTime() <=
        Date.now()
      ) {
        await prisma.refreshToken.deleteMany({
          where: {
            id:
              storedToken.id,
          },
        });


        return res.status(401).json({
          status: "error",

          code:
            "SESSION_EXPIRED",

          message:
            "Your login session has expired. Please sign in again.",

          action:
            "LOGIN_REQUIRED",

          shouldLogout: true,
        });
      }


      // ------------------------------------------------
      // Verify JWT refresh token
      // ------------------------------------------------

      let decoded: {
        userId: string;
        tokenId?: string;
      };


      try {
        decoded = jwt.verify(
          refreshToken,

          process.env
            .JWT_REFRESH_SECRET as string
        ) as {
          userId: string;
          tokenId?: string;
        };

      } catch (error) {

        /*
          Remove unusable session.
        */

        await prisma.refreshToken.deleteMany({
          where: {
            token:
              refreshToken,
          },
        });


        return res.status(401).json({
          status: "error",

          code:
            "SESSION_EXPIRED",

          message:
            "Your login session has expired. Please sign in again.",

          action:
            "LOGIN_REQUIRED",

          shouldLogout: true,
        });
      }


      // ------------------------------------------------
      // Verify session belongs to same user
      // ------------------------------------------------

      if (
        !decoded.userId ||
        decoded.userId !==
          storedToken.userId
      ) {
        await prisma.refreshToken.deleteMany({
          where: {
            id:
              storedToken.id,
          },
        });


        return res.status(401).json({
          status: "error",

          code:
            "SESSION_INVALID",

          message:
            "Your login session is no longer valid. Please sign in again.",

          action:
            "LOGIN_REQUIRED",

          shouldLogout: true,
        });
      }


      // ------------------------------------------------
      // Generate another 6-hour access token
      // ------------------------------------------------

      const newAccessToken =
        generateAccessToken(
          storedToken.userId,
          storedToken.id
        );


      return res.status(200).json({
        status: "success",

        message:
          "Session refreshed successfully.",

        accessToken:
          newAccessToken,

        accessTokenExpiresInSeconds:
          ACCESS_TOKEN_EXPIRES_SECONDS,

        sessionExpiresAt:
          storedToken.expiresAt,
      });

    } catch (error) {
      console.error(
        "Refresh error:",
        error
      );


      return res.status(500).json({
        status: "error",

        code:
          "REFRESH_FAILED",

        message:
          "Unable to refresh your session. Please try again.",
      });
    }
  };


// ======================================================
// LOGOUT USER
// ======================================================

export const logoutUser = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const refreshToken =
      String(
        req.body.refreshToken || ""
      ).trim();


    if (!refreshToken) {
      return res.status(400).json({
        status: "error",

        code:
          "REFRESH_TOKEN_REQUIRED",

        message:
          "Unable to identify the current login session.",
      });
    }


    /*
      Remove this particular login/device session.

      Because access tokens contain the DB session ID,
      deleting this row also causes the existing access
      token to become invalid immediately.
    */

    await prisma.refreshToken.deleteMany({
      where: {
        token:
          refreshToken,
      },
    });


    return res.status(200).json({
      status: "success",

      code:
        "LOGOUT_SUCCESS",

      message:
        "You have been logged out successfully. Please sign in again to continue.",

      action:
        "LOGIN_REQUIRED",

      shouldLogout: true,
    });

  } catch (error) {
    console.error(
      "Logout error:",
      error
    );


    return res.status(500).json({
      status: "error",

      code:
        "LOGOUT_FAILED",

      message:
        "Unable to complete logout.",
    });
  }
};


// ======================================================
// FORGOT PASSWORD - SEND VERIFICATION CODE
// ======================================================

export const sendForgotPasswordCode =
  async (
    req: Request,
    res: Response
  ): Promise<any> => {
    try {
      const email =
        String(
          req.body.email || ""
        ).trim();


      if (!email) {
        return res.status(400).json({
          error:
            "Email is required",
        });
      }


      const user =
        await prisma.user.findFirst({
          where: {
            email: {
              equals: email,
              mode:
                "insensitive",
            },
          },
        });


      /*
        Same response when account doesn't exist
        prevents email enumeration.
      */

      if (!user) {
        return res.status(200).json({
          status:
            "success",

          message:
            "If an account exists with this email, a verification code has been sent.",

          resendAfterSeconds:
            60,
        });
      }


      const existingReset =
        await prisma.passwordReset.findUnique({
          where: {
            userId:
              user.id,
          },
        });


      if (
        existingReset &&
        existingReset
          .resendAvailableAt
          .getTime() >
          Date.now()
      ) {
        const remainingSeconds =
          Math.ceil(
            (
              existingReset
                .resendAvailableAt
                .getTime() -
              Date.now()
            ) / 1000
          );


        return res.status(429).json({
          error:
            "Please wait before requesting another verification code",

          retryAfterSeconds:
            remainingSeconds,
        });
      }


      const otp =
        randomInt(
          100000,
          1000000
        ).toString();


      const otpHash =
        await bcrypt.hash(
          otp,
          10
        );


      const otpExpiresAt =
        new Date(
          Date.now() +
            10 * 60 * 1000
        );


      const resendAvailableAt =
        new Date(
          Date.now() +
            60 * 1000
        );


      await prisma.passwordReset.upsert({
        where: {
          userId:
            user.id,
        },

        create: {
          userId:
            user.id,

          otpHash,

          otpExpiresAt,

          otpAttempts:
            0,

          resendAvailableAt,
        },

        update: {
          otpHash,

          otpExpiresAt,

          otpAttempts:
            0,

          resendAvailableAt,

          verifiedAt:
            null,

          resetTokenHash:
            null,

          resetTokenExpiresAt:
            null,
        },
      });


      try {
        await sendPasswordResetEmail(
          user.email,
          otp
        );

      } catch (mailError) {

        console.error(
          "Forgot password email sending failed:",
          mailError
        );


        await prisma.passwordReset.deleteMany({
          where: {
            userId:
              user.id,
          },
        });


        return res.status(500).json({
          error:
            "Unable to send verification code. Please try again.",
        });
      }


      return res.status(200).json({
        status:
          "success",

        message:
          "If an account exists with this email, a verification code has been sent.",

        expiresInSeconds:
          600,

        resendAfterSeconds:
          60,
      });

    } catch (error) {

      console.error(
        "Forgot password send code error:",
        error
      );


      return res.status(500).json({
        error:
          "Internal server error",
      });
    }
  };


// ======================================================
// FORGOT PASSWORD - VERIFY CODE
// ======================================================

export const verifyForgotPasswordCode =
  async (
    req: Request,
    res: Response
  ): Promise<any> => {
    try {
      const email =
        String(
          req.body.email || ""
        ).trim();

      const code =
        String(
          req.body.code || ""
        ).trim();


      if (!email || !code) {
        return res.status(400).json({
          error:
            "Email and verification code are required",
        });
      }


      if (
        !/^\d{6}$/.test(code)
      ) {
        return res.status(400).json({
          error:
            "Verification code must be 6 digits",
        });
      }


      const user =
        await prisma.user.findFirst({
          where: {
            email: {
              equals:
                email,

              mode:
                "insensitive",
            },
          },
        });


      if (!user) {
        return res.status(400).json({
          error:
            "Invalid or expired verification code",
        });
      }


      const passwordReset =
        await prisma.passwordReset.findUnique({
          where: {
            userId:
              user.id,
          },
        });


      if (!passwordReset) {
        return res.status(400).json({
          error:
            "Invalid or expired verification code",
        });
      }


      if (
        passwordReset.verifiedAt
      ) {
        return res.status(400).json({
          error:
            "Verification code has already been used. Please continue resetting your password.",
        });
      }


      if (
        passwordReset
          .otpExpiresAt
          .getTime() <
        Date.now()
      ) {
        await prisma.passwordReset.delete({
          where: {
            userId:
              user.id,
          },
        });


        return res.status(400).json({
          error:
            "Verification code has expired. Please request a new code.",
        });
      }


      const MAX_ATTEMPTS =
        5;


      if (
        passwordReset
          .otpAttempts >=
        MAX_ATTEMPTS
      ) {
        await prisma.passwordReset.delete({
          where: {
            userId:
              user.id,
          },
        });


        return res.status(429).json({
          error:
            "Too many incorrect attempts. Please request a new verification code.",
        });
      }


      const isValidCode =
        await bcrypt.compare(
          code,
          passwordReset.otpHash
        );


      if (!isValidCode) {
        const newAttempts =
          passwordReset.otpAttempts +
          1;


        if (
          newAttempts >=
          MAX_ATTEMPTS
        ) {
          await prisma.passwordReset.delete({
            where: {
              userId:
                user.id,
            },
          });


          return res.status(429).json({
            error:
              "Too many incorrect attempts. Please request a new verification code.",
          });
        }


        await prisma.passwordReset.update({
          where: {
            userId:
              user.id,
          },

          data: {
            otpAttempts:
              newAttempts,
          },
        });


        return res.status(400).json({
          error:
            "Invalid verification code",

          attemptsRemaining:
            MAX_ATTEMPTS -
            newAttempts,
        });
      }


      // Generate temporary password-reset token

      const resetToken =
        randomBytes(32).toString(
          "hex"
        );


      const resetTokenHash =
        createHash("sha256")
          .update(resetToken)
          .digest("hex");


      const resetTokenExpiresAt =
        new Date(
          Date.now() +
            15 * 60 * 1000
        );


      await prisma.passwordReset.update({
        where: {
          userId:
            user.id,
        },

        data: {
          verifiedAt:
            new Date(),

          resetTokenHash,

          resetTokenExpiresAt,

          otpAttempts:
            0,
        },
      });


      return res.status(200).json({
        status:
          "success",

        message:
          "Verification code confirmed",

        resetToken,

        expiresInSeconds:
          900,
      });

    } catch (error) {

      console.error(
        "Forgot password verify code error:",
        error
      );


      return res.status(500).json({
        error:
          "Internal server error",
      });
    }
  };


// ======================================================
// FORGOT PASSWORD - RESET PASSWORD
// ======================================================

export const resetForgotPassword =
  async (
    req: Request,
    res: Response
  ): Promise<any> => {
    try {
      const {
        resetToken,
        newPassword,
        confirmPassword,
      } = req.body;


      if (
        !resetToken ||
        !newPassword ||
        !confirmPassword
      ) {
        return res.status(400).json({
          error:
            "Reset token, new password and confirm password are required",
        });
      }


      if (
        newPassword !==
        confirmPassword
      ) {
        return res.status(400).json({
          error:
            "Passwords do not match",
        });
      }


      if (
        newPassword.length <
        8
      ) {
        return res.status(400).json({
          error:
            "Password must contain at least 8 characters",
        });
      }


      const resetTokenHash =
        createHash("sha256")
          .update(
            String(
              resetToken
            )
          )
          .digest("hex");


      const passwordReset =
        await prisma.passwordReset.findFirst({
          where: {
            resetTokenHash,

            verifiedAt: {
              not:
                null,
            },

            resetTokenExpiresAt: {
              gt:
                new Date(),
            },
          },

          include: {
            user:
              true,
          },
        });


      if (!passwordReset) {
        return res.status(400).json({
          error:
            "Invalid or expired password reset request",
        });
      }


      const user =
        passwordReset.user;


      const isSamePassword =
        await bcrypt.compare(
          newPassword,
          user.passwordHash
        );


      if (isSamePassword) {
        return res.status(400).json({
          error:
            "Your new password must be different from your current password",
        });
      }


      const salt =
        await bcrypt.genSalt(10);


      const newPasswordHash =
        await bcrypt.hash(
          newPassword,
          salt
        );


      /*
        Deleting refresh sessions also invalidates
        existing access tokens because middleware now
        verifies the sessionId on every protected request.
      */

      await prisma.$transaction([
        prisma.user.update({
          where: {
            id:
              user.id,
          },

          data: {
            passwordHash:
              newPasswordHash,
          },
        }),


        prisma.refreshToken.deleteMany({
          where: {
            userId:
              user.id,
          },
        }),


        prisma.passwordReset.delete({
          where: {
            userId:
              user.id,
          },
        }),
      ]);


      return res.status(200).json({
        status:
          "success",

        message:
          "Password reset successfully. Please sign in with your new password.",
      });

    } catch (error) {

      console.error(
        "Forgot password reset error:",
        error
      );


      return res.status(500).json({
        error:
          "Internal server error",
      });
    }
  };