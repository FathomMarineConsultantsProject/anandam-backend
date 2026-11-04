import PDFDocument
  from "pdfkit";

import {
  getPsychometricAnalysis,
} from "./psychometricAnalytics.service";


const COLORS = {
  heading:
    "#0C1421",

  body:
    "#6F737B",

  border:
    "#D9D9D9",

  accent:
    "#8C3422",

  gold:
    "#C99A31",

  soft:
    "#F7F4EF",

  track:
    "#E7E7E7",
};


function formatDateTime(
  value:
    | string
    | Date
    | null
    | undefined
) {
  if (!value) {
    return "—";
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }


  return date.toLocaleString(
    "en-GB",
    {
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}


function safeFilename(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(
      0,
      80
    );
}


function ensureSpace(
  doc: PDFKit.PDFDocument,
  height = 80
) {
  const bottom =
    doc.page.height -
    doc.page.margins
      .bottom;


  if (
    doc.y +
      height >
    bottom
  ) {
    doc.addPage();
  }
}


function writeBrand(
  doc: PDFKit.PDFDocument
) {
  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      10
    )
    .fillColor(
      COLORS.gold
    )
    .text(
      "ANANDUM",
      {
        characterSpacing:
          2,
      }
    );


  doc
    .moveDown(
      0.2
    )
    .strokeColor(
      COLORS.border
    )
    .moveTo(
      doc.page
        .margins.left,
      doc.y
    )
    .lineTo(
      doc.page.width -
        doc.page
          .margins.right,
      doc.y
    )
    .stroke();


  doc.moveDown(
    1
  );
}


function writePageTitle(
  doc: PDFKit.PDFDocument,
  title: string,
  subtitle?: string
) {
  writeBrand(
    doc
  );


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      19
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      title
    );


  if (subtitle) {
    doc
      .moveDown(
        0.35
      )
      .font(
        "Helvetica"
      )
      .fontSize(
        10
      )
      .fillColor(
        COLORS.body
      )
      .text(
        subtitle
      );
  }


  doc.moveDown(
    1.3
  );
}


function writeSectionTitle(
  doc: PDFKit.PDFDocument,
  title: string
) {
  ensureSpace(
    doc,
    45
  );


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      14
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      title
    );


  doc.moveDown(
    0.6
  );
}


function writeProgress(
  doc: PDFKit.PDFDocument,
  label: string,
  percentage: number,
  description?: string,
  level?: string
) {
  ensureSpace(
    doc,
    description
      ? 75
      : 58
  );


  const startX =
    doc.x;

  const startY =
    doc.y;

  const width =
    doc.page.width -
    doc.page
      .margins.left -
    doc.page
      .margins.right;


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      10
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      label,
      startX,
      startY,
      {
        width:
          width -
          100,
      }
    );


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      10
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      `${Math.round(
        percentage
      )}%`,
      startX +
        width -
        80,
      startY,
      {
        width:
          80,

        align:
          "right",
      }
    );


  let y =
    startY +
    17;


  if (
    description
  ) {
    doc
      .font(
        "Helvetica"
      )
      .fontSize(
        8.5
      )
      .fillColor(
        COLORS.body
      )
      .text(
        description,
        startX,
        y,
        {
          width:
            width -
            110,
        }
      );


    y =
      doc.y +
      5;
  }


  doc
    .roundedRect(
      startX,
      y,
      width,
      5,
      2
    )
    .fill(
      COLORS.track
    );


  doc
    .roundedRect(
      startX,
      y,
      Math.max(
        1,
        width *
          (
            Math.max(
              0,
              Math.min(
                100,
                percentage
              )
            ) /
            100
          )
      ),
      5,
      2
    )
    .fill(
      COLORS.gold
    );


  doc.y =
    y +
    12;


  if (level) {
    doc
      .font(
        "Helvetica"
      )
      .fontSize(
        8
      )
      .fillColor(
        COLORS.body
      )
      .text(
        level
      );


    doc.moveDown(
      0.4
    );
  }


  doc
    .strokeColor(
      "#EEEEEE"
    )
    .moveTo(
      startX,
      doc.y
    )
    .lineTo(
      startX +
        width,
      doc.y
    )
    .stroke();


  doc.moveDown(
    0.9
  );
}


function writeCover(
  doc: PDFKit.PDFDocument,
  analysis: any
) {
  const width =
    doc.page.width -
    doc.page
      .margins.left -
    doc.page
      .margins.right;


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      12
    )
    .fillColor(
      COLORS.gold
    )
    .text(
      "ANANDUM",
      {
        align:
          "center",

        characterSpacing:
          3,
      }
    );


  doc.moveDown(
    5
  );


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      9
    )
    .fillColor(
      COLORS.body
    )
    .text(
      "ASSESSMENT RESULT REPORT",
      {
        align:
          "center",

        characterSpacing:
          1.5,
      }
    );


  doc.moveDown(
    1
  );


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      23
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      analysis
        .test
        .title,
      {
        align:
          "center",
      }
    );


  doc.moveDown(
    0.7
  );


  if (
    analysis
      .test
      .description
  ) {
    doc
      .font(
        "Helvetica"
      )
      .fontSize(
        10
      )
      .fillColor(
        COLORS.body
      )
      .text(
        analysis
          .test
          .description,
        {
          align:
            "center",

          width:
            width -
            70,

          indent:
            35,
        }
      );
  }


  doc.moveDown(
    4
  );


  const y =
    doc.y;


  doc
    .roundedRect(
      doc.page
        .margins.left,
      y,
      width,
      analysis
          .resultKind ===
        "MARITIME_SCORED"
        ? 115
        : 85,
      5
    )
    .fill(
      COLORS.soft
    );


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      9
    )
    .fillColor(
      COLORS.body
    )
    .text(
      "Participant",
      doc.page
        .margins.left +
        18,
      y +
        18
    );


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      10
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      analysis
        .participant
        .fullName ||
        "—",
      doc.page
        .margins.left +
        18,
      y +
        35
    );


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      9
    )
    .fillColor(
      COLORS.body
    )
    .text(
      "Attempt",
      doc.page
        .margins.left +
        width /
          3,
      y +
        18
    );


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      10
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      String(
        analysis
          .attemptNumber
      ),
      doc.page
        .margins.left +
        width /
          3,
      y +
        35
    );


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      9
    )
    .fillColor(
      COLORS.body
    )
    .text(
      "Date & time completed",
      doc.page
        .margins.left +
        (
          width /
          3
        ) *
          2,
      y +
        18
    );


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      9
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      formatDateTime(
        analysis
          .completedAt
      ),
      doc.page
        .margins.left +
        (
          width /
          3
        ) *
          2,
      y +
        35,
      {
        width:
          width /
            3 -
          20,
      }
    );


  if (
    analysis
      .resultKind ===
    "MARITIME_SCORED"
  ) {
    doc
      .font(
        "Helvetica-Bold"
      )
      .fontSize(
        9
      )
      .fillColor(
        COLORS.body
      )
      .text(
        "Overall result",
        doc.page
          .margins.left +
          18,
        y +
          72
      );


    doc
      .font(
        "Helvetica-Bold"
      )
      .fontSize(
        13
      )
      .fillColor(
        COLORS.accent
      )
      .text(
        `${analysis.score.correct} / ${analysis.score.total}   ${analysis.score.percentage}%`,
        doc.page
          .margins.left +
          18,
        y +
          89
      );
  }
}


function writeProfileAnalytics(
  doc: PDFKit.PDFDocument,
  analysis: any
) {
  writePageTitle(
    doc,
    `Your ${analysis.test.title}`,
    "Explore your strongest tendencies and how they may show up day to day."
  );


  doc
    .roundedRect(
      doc.x,
      doc.y,
      doc.page.width -
        doc.page
          .margins.left -
        doc.page
          .margins.right,
      92,
      5
    )
    .fill(
      "#F5F2FB"
    );


  const boxY =
    doc.y;


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      12
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      analysis
        .analysis
        .headline,
      doc.page
        .margins.left +
        16,
      boxY +
        17,
      {
        width:
          doc.page.width -
          doc.page
            .margins.left -
          doc.page
            .margins.right -
          32,
      }
    );


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      9.5
    )
    .fillColor(
      COLORS.body
    )
    .text(
      analysis
        .analysis
        .summary,
      doc.page
        .margins.left +
        16,
      doc.y +
        8,
      {
        width:
          doc.page.width -
          doc.page
            .margins.left -
          doc.page
            .margins.right -
          32,
      }
    );


  doc.y =
    boxY +
    112;


  writeSectionTitle(
    doc,
    "Your Profile Dimensions"
  );


  for (
    const dimension
    of analysis.dimensions
  ) {
    writeProgress(
      doc,
      dimension.label,
      dimension.percentage,
      dimension.description,
      dimension.level
    );
  }
}


function writeMaritimeAnalytics(
  doc: PDFKit.PDFDocument,
  analysis: any
) {
  writePageTitle(
    doc,
    "Maritime Human Performance Analysis",
    "Assessment performance, section results and observed development areas."
  );


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      25
    )
    .fillColor(
      COLORS.accent
    )
    .text(
      `${analysis.score.percentage}%`,
      {
        align:
          "center",
      }
    );


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      9
    )
    .fillColor(
      COLORS.body
    )
    .text(
      `${analysis.score.correct} of ${analysis.score.total} correct • ${analysis.score.level}`,
      {
        align:
          "center",
      }
    );


  doc.moveDown(
    1.8
  );


  writeSectionTitle(
    doc,
    "Section Breakdown"
  );


  for (
    const section
    of analysis.sections
  ) {
    writeProgress(
      doc,
      section.title,
      section.percentage,
      `${section.score} / ${section.maxScore} correct`,
      section.level
    );
  }


  writeSectionTitle(
    doc,
    "Performance Analysis"
  );


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      11
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      analysis
        .analysis
        .headline
    );


  doc
    .moveDown(
      0.5
    )
    .font(
      "Helvetica"
    )
    .fontSize(
      9.5
    )
    .fillColor(
      COLORS.body
    )
    .text(
      analysis
        .analysis
        .summary
    );


  doc.moveDown(
    1.2
  );


  writeSectionTitle(
    doc,
    "Domain Performance"
  );


  for (
    const domain
    of analysis.domains
  ) {
    writeProgress(
      doc,
      domain.label,
      domain.percentage,
      `${domain.score} / ${domain.maxScore} correct`,
      domain.level
    );
  }
}


function writeResponses(
  doc: PDFKit.PDFDocument,
  analysis: any
) {
  doc.addPage();


  writePageTitle(
    doc,
    "Your Responses",
    analysis
        .resultKind ===
      "MARITIME_SCORED"
      ? (
          analysis
            .answerKeyAvailable
            ? "Your selected answers are shown together with the correct answers."
            : "Your selected answers are shown. Correct answers are available only after answer review has been unlocked."
        )
      : "Your responses are descriptive. There is no correct or incorrect answer."
  );


  for (
    const response
    of analysis.responses
  ) {
    ensureSpace(
      doc,
      analysis
          .resultKind ===
        "MARITIME_SCORED"
        ? 105
        : 88
    );


    doc
      .font(
        "Helvetica-Bold"
      )
      .fontSize(
        9
      )
      .fillColor(
        COLORS.accent
      )
      .text(
        `Question ${response.questionNumber}${
          response.itemCode
            ? ` • ${response.itemCode}`
            : ""
        }`
      );


    doc
      .moveDown(
        0.25
      )
      .font(
        "Helvetica"
      )
      .fontSize(
        9
      )
      .fillColor(
        COLORS.heading
      )
      .text(
        response
          .questionText
      );


    doc.moveDown(
      0.45
    );


    if (
      analysis
        .resultKind ===
      "MARITIME_SCORED"
    ) {
      doc
        .font(
          "Helvetica-Bold"
        )
        .fillColor(
          COLORS.body
        )
        .text(
          "Your answer: ",
          {
            continued:
              true,
          }
        )
        .font(
          "Helvetica"
        )
        .fillColor(
          COLORS.heading
        )
        .text(
          response
            .selectedOption
            ? `${response.selectedOption}. ${response.selectedOptionText || ""}`
            : "Not answered"
        );


      if (
        analysis
          .answerKeyAvailable
      ) {
        doc
          .font(
            "Helvetica-Bold"
          )
          .fillColor(
            COLORS.body
          )
          .text(
            "Correct answer: ",
            {
              continued:
                true,
            }
          )
          .font(
            "Helvetica"
          )
          .fillColor(
            COLORS.heading
          )
          .text(
            response
              .correctOption
              ? `${response.correctOption}. ${response.correctOptionText || ""}`
              : "—"
          );


        doc
          .font(
            "Helvetica-Bold"
          )
          .fillColor(
            response
              .isCorrect
              ? "#21855B"
              : "#A23C32"
          )
          .text(
            response
              .isCorrect
              ? "Correct"
              : "Incorrect"
          );
      }
    } else {
      doc
        .font(
          "Helvetica-Bold"
        )
        .fillColor(
          COLORS.body
        )
        .text(
          "Dimension: ",
          {
            continued:
              true,
          }
        )
        .font(
          "Helvetica"
        )
        .fillColor(
          COLORS.heading
        )
        .text(
          response
            .dimensionLabel ||
          "—"
        );


      doc
        .font(
          "Helvetica-Bold"
        )
        .fillColor(
          COLORS.body
        )
        .text(
          "Your response: ",
          {
            continued:
              true,
          }
        )
        .font(
          "Helvetica"
        )
        .fillColor(
          COLORS.heading
        )
        .text(
          response
            .response ||
          "—"
        );
    }


    doc.moveDown(
      0.6
    );


    doc
      .strokeColor(
        "#ECECEC"
      )
      .moveTo(
        doc.page
          .margins.left,
        doc.y
      )
      .lineTo(
        doc.page.width -
          doc.page
            .margins.right,
        doc.y
      )
      .stroke();


    doc.moveDown(
      0.8
    );
  }
}


function writeLegalPage(
  doc: PDFKit.PDFDocument,
  analysis: any
) {
  doc.addPage();


  writePageTitle(
    doc,
    "Understanding Your Results",
    "Important information about interpretation and use of this report."
  );


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      9.5
    )
    .fillColor(
      COLORS.body
    )
    .text(
      analysis
          .resultKind ===
        "MARITIME_SCORED"
        ? (
            "This report summarizes performance on the questions presented during this assessment attempt. Results should be used for reflection, learning and development and should not be treated as a standalone employment or high-stakes decision."
          )
        : (
            "These results describe self-reported preferences, tendencies and motivations at the time the assessment was completed. They are intended for reflection and personal development."
          ),
      {
        lineGap:
          3,
      }
    );


  doc.moveDown(
    1.4
  );


  writeSectionTitle(
    doc,
    "Assessment Disclaimer and Limitation of Liability"
  );


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      9.2
    )
    .fillColor(
      COLORS.body
    )
    .text(
      analysis
        .legal
        .disclaimerText ||
        (
          "This assessment is intended for self-awareness and personal development only. " +
          "It does not constitute a medical, psychological or psychiatric diagnosis."
        ),
      {
        lineGap:
          3,
      }
    );


  doc.moveDown(
    1.3
  );


  writeSectionTitle(
    doc,
    "Participant Acknowledgement"
  );


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      9.2
    )
    .fillColor(
      COLORS.body
    )
    .text(
      analysis
        .legal
        .acknowledgementText ||
        "Participant acknowledgement was recorded before the assessment began.",
      {
        lineGap:
          3,
      }
    );


  doc.moveDown(
    1
  );


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      9
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      "Acknowledged:"
    );


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      9
    )
    .fillColor(
      COLORS.body
    )
    .text(
      formatDateTime(
        analysis
          .legal
          .acknowledgedAt
      )
    );


  if (
    analysis
      .legal
      .disclaimerVersion
  ) {
    doc
      .moveDown(
        0.4
      )
      .font(
        "Helvetica"
      )
      .fontSize(
        8.5
      )
      .fillColor(
        COLORS.body
      )
      .text(
        `Disclaimer version: ${analysis.legal.disclaimerVersion}`
      );
  }
}


export async function generatePsychometricReport(
  userId: string,
  attemptId: string
) {
  const analysis =
    await getPsychometricAnalysis(
      userId,
      attemptId
    );


  const buffer =
    await new Promise<Buffer>(
      (
        resolve,
        reject
      ) => {
        const document =
          new PDFDocument({
            size:
              "A4",

            margins: {
              top:
                45,

              bottom:
                45,

              left:
                48,

              right:
                48,
            },

            info: {
              Title:
                `${analysis.test.title} - Assessment Result Report`,

              Author:
                "Fathom Marine Consultants - Anandum",
            },
          });


        const chunks:
          Buffer[] = [];


        document.on(
          "data",
          (
            chunk:
              Buffer
          ) => {
            chunks.push(
              Buffer.from(
                chunk
              )
            );
          }
        );


        document.on(
          "end",
          () => {
            resolve(
              Buffer.concat(
                chunks
              )
            );
          }
        );


        document.on(
          "error",
          reject
        );


        writeCover(
          document,
          analysis
        );


        document.addPage();


        if (
          analysis
            .resultKind ===
          "MARITIME_SCORED"
        ) {
          writeMaritimeAnalytics(
            document,
            analysis
          );
        } else {
          writeProfileAnalytics(
            document,
            analysis
          );
        }


        writeResponses(
          document,
          analysis
        );


        writeLegalPage(
          document,
          analysis
        );


        document.end();
      }
    );


  const filename =
    `${safeFilename(
      analysis.test.code ||
      analysis.test.title
    )}-attempt-${analysis.attemptNumber}-report.pdf`;


  return {
    filename,

    buffer,

    analysis,
  };
}