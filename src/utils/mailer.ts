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


const MAIL_TIME_ZONE =
  process.env.REPORT_TIME_ZONE ||
  "Asia/Kolkata";


function escapeHtml(
  value: string
) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatCompletedAt(
  value: Date | string
) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }


  const datePart =
    date.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: MAIL_TIME_ZONE,
      }
    );


  const timePart =
    date.toLocaleTimeString(
      "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: MAIL_TIME_ZONE,
      }
    );


  return `${datePart}, ${timePart}`;
}


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


type PsychometricResultEmailInput = {
  to: string;
  participantName: string;
  participantEmail: string;
  assessmentTitle: string;
  attemptNumber: number;
  completedAt: Date | string;
  pdfFilename: string;
  pdfBuffer: Buffer;
};


export async function sendPsychometricResultEmail({
  to,
  participantName,
  participantEmail,
  assessmentTitle,
  attemptNumber,
  completedAt,
  pdfFilename,
  pdfBuffer,
}: PsychometricResultEmailInput) {
  const completedText =
    formatCompletedAt(
      completedAt
    );


  const subject =
    `Anandam Assessment Completed - ${assessmentTitle} - ${participantName}`;


  const text = [
    "A psychometric assessment has been completed in Anandam.",
    "",
    `Participant: ${participantName}`,
    `Email: ${participantEmail}`,
    `Assessment: ${assessmentTitle}`,
    `Attempt: ${attemptNumber}`,
    `Completed: ${completedText}`,
    "",
    "The participant's result report is attached.",
  ].join("\n");


  const html = `
    <div
      style="
        max-width: 620px;
        margin: 0 auto;
        padding: 32px;
        font-family: Arial, Helvetica, sans-serif;
        color: #20283A;
        background: #FFFFFF;
      "
    >
      <p style="margin: 0 0 24px; line-height: 1.6;">
        A psychometric assessment has been completed in Anandam.
      </p>

      <table
        role="presentation"
        cellspacing="0"
        cellpadding="0"
        style="
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        "
      >
        <tr>
          <td style="padding: 7px 14px 7px 0; color: #60657C; width: 120px;">
            Participant:
          </td>
          <td style="padding: 7px 0; font-weight: 600;">
            ${escapeHtml(participantName)}
          </td>
        </tr>

        <tr>
          <td style="padding: 7px 14px 7px 0; color: #60657C;">
            Email:
          </td>
          <td style="padding: 7px 0;">
            <a
              href="mailto:${escapeHtml(participantEmail)}"
              style="color: #712E1E;"
            >
              ${escapeHtml(participantEmail)}
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding: 7px 14px 7px 0; color: #60657C;">
            Assessment:
          </td>
          <td style="padding: 7px 0;">
            ${escapeHtml(assessmentTitle)}
          </td>
        </tr>

        <tr>
          <td style="padding: 7px 14px 7px 0; color: #60657C;">
            Attempt:
          </td>
          <td style="padding: 7px 0;">
            ${attemptNumber}
          </td>
        </tr>

        <tr>
          <td style="padding: 7px 14px 7px 0; color: #60657C;">
            Completed:
          </td>
          <td style="padding: 7px 0;">
            ${escapeHtml(completedText)}
          </td>
        </tr>
      </table>

      <p style="margin: 0; line-height: 1.6;">
        The participant's result report is attached.
      </p>
    </div>
  `;


  const info =
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });


  console.log(
    "Psychometric result email sent:",
    {
      messageId:
        info.messageId,
      recipient:
        to,
      participantEmail,
      assessmentTitle,
      attemptNumber,
    }
  );


  return info;
}
