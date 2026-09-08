import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  randomInt,
  randomBytes,
  createHash,
} from "crypto";
import { PrismaClient } from "@prisma/client";
import { sendPasswordResetEmail } from "../utils/mailer";

const prisma = new PrismaClient();

//SIGN UP
export const registerUser = async( req: Request, res: Response): Promise<any>=>{
    try {
        const {email, password, fullName, rank, vessel} = req.body;

        const existingUser = await prisma.user.findUnique({where:{email}});

        if(existingUser)
        {
            return res.status(400).json({error: 'Email already registered'});
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await prisma.user.create({
            data:{email, passwordHash, fullName, rank, vessel}
        });
        //Generate access and refresh token
        const {accessToken, refreshToken} = generateToken(newUser.id)
        
        await prisma.refreshToken.create({
            data:{
                token: refreshToken,
                userId: newUser.id,
                expiresAt: new Date(Date.now() +7 * 24 * 60 * 60 * 1000)
            }
        });
        res.status(201).json({
            status: 'success',
            accessToken,
            refreshToken,
            user: {id: newUser.id, email: newUser.email, fullName: newUser.fullName}
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: 'Internal server error during registration' });
    }
};

//LOGIN USER
export const loginUser= async(req:Request, res: Response):Promise<any>=>{
    try {
        const {email, password} = req.body;

        const user = await prisma.user.findUnique({where:{email}});

        if(!user)
        {
            return res.status(404).json({error:'User not found'})
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if(!isMatch)
        {
            return res.status(401).json({error:'Invalid credentials'});
        }

        const {accessToken, refreshToken} = generateToken(user.id);

        // Save this new device's session to the database
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });
        

        return res.status(200).json({
            status:'success',
            accessToken,
            refreshToken,
            user: {id: user.id, email: user.email, fullName: user.fullName}
        })
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
}

//Helper function to generate tokens
const generateToken = (userId: string) =>{
    const accessToken = jwt.sign(
        {userId},
        process.env.JWT_ACCESS_SECRET as string,
        {expiresIn: '15m'}
    )

    const refreshToken = jwt.sign(
        {userId},
        process.env.JWT_REFRESH_SECRET as string,
        {expiresIn: '7d'}
    );

    return {accessToken, refreshToken};
}

//Refresh token endpoint
export const refreshAccessToken = async (req: Request, res: Response): Promise<any> =>{
    try {
        const {refreshToken} = req.body;

        if(!refreshToken)
        {
            return res.status(401).json({error:"Refresh token is expired"});
        }

        //Check if the token is actually exist in the database
        const storedToken = await prisma.refreshToken.findUnique({
            where:{token: refreshToken}
        });

        if(!storedToken)
        {
            return res.status(403).json({error: "Invalid refresh token"});
        }

        //verify if the token hasn't expired
        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string, async (err, decoded: any)=>{
            if(err)
            {
                await prisma.refreshToken.delete({where:{token: refreshToken}});
                return res.status(403).json({error:"Refresh token expired. Please login again"});
            }
            const newAccessToken = jwt.sign(
                {userId: decoded.userId},
                process.env.JWT_ACCESS_SECRET as string,
                {expiresIn: '15m'}
            );
            res.status(200).json({
                status: 'success',
                accessToken: newAccessToken
            });
        });
    } catch (error) {
        console.error("Refresh error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// FORGOT PASSWORD - SEND VERIFICATION CODE
export const sendForgotPasswordCode = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const email = String(req.body.email || "").trim();

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    // Case-insensitive lookup
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    /*
      We intentionally return the same success response even if
      the account does not exist.

      This prevents people from using this endpoint to discover
      which email addresses are registered.
    */
    if (!user) {
      return res.status(200).json({
        status: "success",
        message:
          "If an account exists with this email, a verification code has been sent.",
        resendAfterSeconds: 60,
      });
    }

    // Check whether a reset request already exists
    const existingReset = await prisma.passwordReset.findUnique({
      where: {
        userId: user.id,
      },
    });

    // Prevent resend before cooldown finishes
    if (
      existingReset &&
      existingReset.resendAvailableAt.getTime() > Date.now()
    ) {
      const remainingSeconds = Math.ceil(
        (existingReset.resendAvailableAt.getTime() - Date.now()) / 1000
      );

      return res.status(429).json({
        error: "Please wait before requesting another verification code",
        retryAfterSeconds: remainingSeconds,
      });
    }

    // Generate secure 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();

    // Never store OTP as plain text
    const otpHash = await bcrypt.hash(otp, 10);

    const otpExpiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    ); // 10 minutes

    const resendAvailableAt = new Date(
      Date.now() + 60 * 1000
    ); // 60 seconds

    /*
      Because userId is unique in PasswordReset, upsert means:

      No existing request -> create one
      Existing request    -> replace old OTP with new OTP
    */
    await prisma.passwordReset.upsert({
      where: {
        userId: user.id,
      },

      create: {
        userId: user.id,
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        resendAvailableAt,
      },

      update: {
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        resendAvailableAt,

        // New OTP invalidates previous verification/reset token
        verifiedAt: null,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    });

    try {
      await sendPasswordResetEmail(user.email, otp);
    } catch (mailError) {
      console.error(
        "Forgot password email sending failed:",
        mailError
      );

      // Do not leave behind an OTP that was never delivered
      await prisma.passwordReset.deleteMany({
        where: {
          userId: user.id,
        },
      });

      return res.status(500).json({
        error:
          "Unable to send verification code. Please try again.",
      });
    }

    return res.status(200).json({
      status: "success",
      message:
        "If an account exists with this email, a verification code has been sent.",
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
    });
  } catch (error) {
    console.error(
      "Forgot password send code error:",
      error
    );

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

// FORGOT PASSWORD - VERIFY CODE
export const verifyForgotPasswordCode = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const email = String(req.body.email || "").trim();
    const code = String(req.body.code || "").trim();

    // -----------------------------
    // BASIC VALIDATION
    // -----------------------------
    if (!email || !code) {
      return res.status(400).json({
        error: "Email and verification code are required",
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        error: "Verification code must be 6 digits",
      });
    }

    // -----------------------------
    // FIND USER
    // -----------------------------
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid or expired verification code",
      });
    }

    // -----------------------------
    // FIND PASSWORD RESET REQUEST
    // -----------------------------
    const passwordReset =
      await prisma.passwordReset.findUnique({
        where: {
          userId: user.id,
        },
      });

    if (!passwordReset) {
      return res.status(400).json({
        error: "Invalid or expired verification code",
      });
    }

    // -----------------------------
    // PREVENT REUSING VERIFIED OTP
    // -----------------------------
    if (passwordReset.verifiedAt) {
      return res.status(400).json({
        error:
          "Verification code has already been used. Please continue resetting your password.",
      });
    }

    // -----------------------------
    // CHECK OTP EXPIRY
    // -----------------------------
    if (
      passwordReset.otpExpiresAt.getTime() <
      Date.now()
    ) {
      await prisma.passwordReset.delete({
        where: {
          userId: user.id,
        },
      });

      return res.status(400).json({
        error:
          "Verification code has expired. Please request a new code.",
      });
    }

    // -----------------------------
    // MAXIMUM ATTEMPTS
    // -----------------------------
    const MAX_ATTEMPTS = 5;

    if (
      passwordReset.otpAttempts >= MAX_ATTEMPTS
    ) {
      await prisma.passwordReset.delete({
        where: {
          userId: user.id,
        },
      });

      return res.status(429).json({
        error:
          "Too many incorrect attempts. Please request a new verification code.",
      });
    }

    // -----------------------------
    // COMPARE OTP WITH HASH
    // -----------------------------
    const isValidCode = await bcrypt.compare(
      code,
      passwordReset.otpHash
    );

    if (!isValidCode) {
      const newAttempts =
        passwordReset.otpAttempts + 1;

      // Delete reset request after final failed attempt
      if (newAttempts >= MAX_ATTEMPTS) {
        await prisma.passwordReset.delete({
          where: {
            userId: user.id,
          },
        });

        return res.status(429).json({
          error:
            "Too many incorrect attempts. Please request a new verification code.",
        });
      }

      await prisma.passwordReset.update({
        where: {
          userId: user.id,
        },
        data: {
          otpAttempts: newAttempts,
        },
      });

      return res.status(400).json({
        error: "Invalid verification code",
        attemptsRemaining:
          MAX_ATTEMPTS - newAttempts,
      });
    }

    // -----------------------------
    // OTP CORRECT
    // -----------------------------

    /*
      Generate temporary reset token.

      This token is NOT the OTP.

      The frontend needs this token for the final
      "Create New Password" screen.
    */
    const resetToken = randomBytes(32).toString(
      "hex"
    );

    // Never save actual reset token
    const resetTokenHash = createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const resetTokenExpiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    ); // 15 minutes

    await prisma.passwordReset.update({
      where: {
        userId: user.id,
      },

      data: {
        verifiedAt: new Date(),

        resetTokenHash,
        resetTokenExpiresAt,

        // successful verification
        otpAttempts: 0,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Verification code confirmed",

      /*
        Frontend temporarily keeps this token.

        It will be sent to the final reset-password API.
      */
      resetToken,

      expiresInSeconds: 900,
    });
  } catch (error) {
    console.error(
      "Forgot password verify code error:",
      error
    );

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

// FORGOT PASSWORD - RESET PASSWORD
export const resetForgotPassword = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      resetToken,
      newPassword,
      confirmPassword,
    } = req.body;

    // --------------------------------
    // BASIC VALIDATION
    // --------------------------------
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

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: "Passwords do not match",
      });
    }

    // Matches your Figma rule
    if (newPassword.length < 8) {
      return res.status(400).json({
        error:
          "Password must contain at least 8 characters",
      });
    }

    // --------------------------------
    // HASH RESET TOKEN
    // --------------------------------
    const resetTokenHash = createHash("sha256")
      .update(String(resetToken))
      .digest("hex");

    // --------------------------------
    // FIND VALID RESET REQUEST
    // --------------------------------
    const passwordReset =
      await prisma.passwordReset.findFirst({
        where: {
          resetTokenHash,

          verifiedAt: {
            not: null,
          },

          resetTokenExpiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

    if (!passwordReset) {
      return res.status(400).json({
        error:
          "Invalid or expired password reset request",
      });
    }

    const user = passwordReset.user;

    // --------------------------------
    // DON'T ALLOW CURRENT PASSWORD
    // --------------------------------
    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.passwordHash
    );

    if (isSamePassword) {
      return res.status(400).json({
        error:
          "Your new password must be different from your current password",
      });
    }

    // --------------------------------
    // HASH NEW PASSWORD
    // --------------------------------
    const salt = await bcrypt.genSalt(10);

    const newPasswordHash = await bcrypt.hash(
      newPassword,
      salt
    );

    // --------------------------------
    // UPDATE PASSWORD + CLEANUP
    // --------------------------------
    await prisma.$transaction([
      // Change password
      prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash: newPasswordHash,
        },
      }),

      // Log out existing refresh-token sessions
      prisma.refreshToken.deleteMany({
        where: {
          userId: user.id,
        },
      }),

      // Reset token can never be used again
      prisma.passwordReset.delete({
        where: {
          userId: user.id,
        },
      }),
    ]);

    return res.status(200).json({
      status: "success",
      message:
        "Password reset successfully. Please sign in with your new password.",
    });
  } catch (error) {
    console.error(
      "Forgot password reset error:",
      error
    );

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};