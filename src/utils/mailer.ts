import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE === "true",

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendPasswordResetEmail = async (
  email: string,
  otp: string
) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Your Anandam Password Reset Code",

      html: `
        <div
          style="
            max-width: 520px;
            margin: 0 auto;
            padding: 32px;
            font-family: Arial, Helvetica, sans-serif;
            color: #20283A;
            background: #FCF9F5;
            border-radius: 12px;
          "
        >
          <h2
            style="
              margin-bottom: 16px;
              color: #712E1E;
            "
          >
            Reset Your Password
          </h2>

          <p>
            We received a request to reset your Anandam password.
          </p>

          <p>
            Use the verification code below:
          </p>

          <div
            style="
              margin: 28px 0;
              font-size: 34px;
              font-weight: 700;
              letter-spacing: 10px;
              color: #712E1E;
            "
          >
            ${otp}
          </div>

          <p>
            This code will expire in <strong>10 minutes</strong>.
          </p>

          <p>
            If you didn't request a password reset, you can safely ignore
            this email.
          </p>

          <hr
            style="
              margin: 28px 0;
              border: none;
              border-top: 1px solid #E5E5E5;
            "
          />

          <p
            style="
              font-size: 12px;
              color: #8897AD;
            "
          >
            Anandam by Fathom
          </p>
        </div>
      `,
    });

    console.log(
      "Password reset email sent:",
      info.messageId
    );

    return info;
  } catch (error) {
    console.error(
      "Password reset email error:",
      error
    );

    throw error;
  }
};