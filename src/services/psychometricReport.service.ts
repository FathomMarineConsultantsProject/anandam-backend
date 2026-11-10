import * as fs
  from "fs";

import * as path
  from "path";

import PDFDocument
  from "pdfkit";

import {
  getPsychometricAnalysis,
} from "./psychometricAnalytics.service";


const COLORS = {
  heading:
    "#0C1421",

  navy:
    "#01013D",

  body:
    "#60657C",

  muted:
    "#8F9399",

  border:
    "#D9D9D9",

  accent:
    "#8C3422",

  gold:
    "#B88A32",

  paleGold:
    "#FFF3D8",

  soft:
    "#FAFAFA",

  tealCard:
    "#EEF8F7",

  tealBorder:
    "#CDE1DF",

  track:
    "#E1E4EE",

  purple:
    "#8D6FC9",

  blue:
    "#7999D9",

  cyan:
    "#6FB1C9",

  orange:
    "#E5AE67",

  pink:
    "#D262DB",
};


const REPORT_ASSET_DIR =
  path.join(
    process.cwd(),
    "src",
    "psychometric result pdf"
  );


const REPORT_ASSETS = {
  headerTop:
    path.join(
      REPORT_ASSET_DIR,
      "header1.png"
    ),

  headerBottom:
    path.join(
      REPORT_ASSET_DIR,
      "header2.png"
    ),

  coverLogo:
    path.join(
      REPORT_ASSET_DIR,
      "logo name.png"
    ),

  smallLogo:
    path.join(
      REPORT_ASSET_DIR,
      "small name logo.png"
    ),
};

function assetExists(
  filePath: string
) {
  return fs.existsSync(
    filePath
  );
}

function getReportCopy(
  analysis: any
) {
  const type =
    analysis?.test?.type;


  if (
    type ===
    "BIG_FIVE"
  ) {
    return {
      reportTitle:
        "Personality Insights",

      assessmentName:
        "Psychometric Personality Test",

      subtitle:
        "Explore your traits and understand yourself better through the Big Five personality model.",

      insightTitle:
        "Your Personality Insights",

      dimensionTitle:
        "Your Personality Dimensions",

      dimensionSubtitle:
        "See how your five personality areas compare.",
    };
  }


  if (
    type ===
    "PERSONALITY_16PF"
  ) {
    return {
      reportTitle:
        "Behavioural Pattern",

      assessmentName:
        "16 PF Personality",

      subtitle:
        "Explore your behavioural tendencies and understand how they may influence the way you work and interact.",

      insightTitle:
        "Your Behavioural Insights",

      dimensionTitle:
        "Your Behavioural Dimensions",

      dimensionSubtitle:
        "See how your behavioural tendencies compare.",
    };
  }


  if (
    type ===
    "MOTIVATION_VALUES"
  ) {
    return {
      reportTitle:
        "Motivation & Values",

      assessmentName:
        "Motivation & Values",

      subtitle:
        "Explore the values and motivations that influence your decisions and priorities.",

      insightTitle:
        "Your Motivation & Values",

      dimensionTitle:
        "Your Motivational Dimensions",

      dimensionSubtitle:
        "See how your motivational priorities compare.",
    };
  }


  return {
    reportTitle:
      "Maritime Human Performance Analysis",

    assessmentName:
      "Maritime Human Performance Analysis",

    subtitle:
      "Review your score, performance analysis and assessment responses.",

    insightTitle:
      "Your Performance Analysis",

    dimensionTitle:
      "Your Performance Dimensions",

    dimensionSubtitle:
      "See how your performance compares across the main assessment areas.",
  };
}

function drawInnerHeader(
  doc: PDFKit.PDFDocument,
  assessmentName: string
) {
  const pageWidth =
    doc.page.width;


  const logoPath =
    assetExists(
      REPORT_ASSETS.smallLogo
    )
      ? REPORT_ASSETS.smallLogo
      : REPORT_ASSETS.coverLogo;


  // ====================================================
  // SMALL ANANDUM LOGO
  // ====================================================

  if (
    assetExists(
      logoPath
    )
  ) {
    doc.image(
      logoPath,
      24,
      10,
      {
        width:
          80,
      }
    );
  }


  // ====================================================
  // DYNAMIC TEST NAME - TOP RIGHT
  // ====================================================

  const headerFontSize =
    assessmentName.length >
    28
      ? 7.5
      : assessmentName.length >
          20
        ? 8.5
        : 9.5;


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      headerFontSize
    )
    .fillColor(
      "#8F9399"
    )
    .text(
      assessmentName,
      pageWidth -
        220,
      14,
      {
        width:
          196,

        align:
          "right",

        lineBreak:
          false,
      }
    );


  // ====================================================
  // HEADER DIVIDER
  // ====================================================

  doc
    .moveTo(
      0,
      40
    )
    .lineTo(
      pageWidth,
      40
    )
    .lineWidth(
      0.7
    )
    .strokeColor(
      "#D9D9D9"
    )
    .stroke();


  doc.x =
    24;

  doc.y =
    62;
}

function drawPageFooter(
  doc: PDFKit.PDFDocument,
  text: string
) {
  const previousX =
    doc.x;

  const previousY =
    doc.y;

  const previousBottomMargin =
    doc.page.margins.bottom;


  /*
    Figma places the page number at approximately y = 811.

    Temporarily remove PDFKit's bottom-margin restriction so
    drawing the footer does NOT create another page.
  */

  doc.page.margins.bottom =
    0;


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      10
    )
    .fillColor(
      "#808496"
    )
    .text(
      text,
      0,
      811,
      {
        width:
          doc.page.width,

        align:
          "center",

        lineBreak:
          false,
      }
    );


  doc.page.margins.bottom =
    previousBottomMargin;


  /*
    Do not let footer drawing change the content cursor.
  */

  doc.x =
    previousX;

  doc.y =
    previousY;
}


function getDimensionColor(
  index: number
) {
  const colors = [
    COLORS.purple,
    COLORS.cyan,
    COLORS.blue,
    COLORS.orange,
    COLORS.pink,
    "#77A58B",
    "#B58BC8",
    "#7297C7",
    "#C9896D",
    "#8C79B7",
  ];


  return colors[
    index %
      colors.length
  ];
}


function hasBigFiveRadarPage(
  analysis: any
) {
  return (
    analysis?.resultKind !==
      "MARITIME_SCORED" &&
    analysis?.test?.type ===
      "BIG_FIVE"
  );
}


function profileReportPageTotal(
  analysis: any
) {
  return hasBigFiveRadarPage(
    analysis
  )
    ? 4
    : 3;
}


function getDimensionPercentageByKey(
  analysis: any,
  key: string
) {
  const dimensions =
    Array.isArray(
      analysis?.dimensions
    )
      ? analysis.dimensions
      : [];


  const dimension =
    dimensions.find(
      (item: any) =>
        item?.key ===
        key
    );


  return Math.max(
    0,
    Math.min(
      100,
      Number(
        dimension?.percentage ??
          0
      )
    )
  );
}

const REPORT_TIME_ZONE =
  process.env.REPORT_TIME_ZONE ||
  "Asia/Kolkata";


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


  const datePart =
    date.toLocaleDateString(
      "en-GB",
      {
        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric",

        timeZone:
          REPORT_TIME_ZONE,
      }
    );


  const timePart =
    date.toLocaleTimeString(
      "en-US",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          true,

        timeZone:
          REPORT_TIME_ZONE,
      }
    )
      .toUpperCase();


  return `${datePart} at ${timePart}`;
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
  doc: PDFKit.PDFDocument,
  assessmentName =
    "Assessment Result"
) {
  drawInnerHeader(
    doc,
    assessmentName
  );
}


function writePageTitle(
  doc: PDFKit.PDFDocument,
  title: string,
  subtitle?: string,
  assessmentName?: string
) {
  writeBrand(
    doc,
    assessmentName ||
      "Assessment Result"
  );


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      17
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      title
    );


  if (
    subtitle
  ) {
    doc
      .moveDown(
        0.35
      )
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
        subtitle
      );
  }


  doc.moveDown(
    1.1
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
  const pageWidth =
    doc.page.width;

  const copy =
    getReportCopy(
      analysis
    );


  // ====================================================
  // TOP FIGMA WAVE
  // ====================================================

  if (
    assetExists(
      REPORT_ASSETS.headerTop
    )
  ) {
    doc.image(
      REPORT_ASSETS.headerTop,
      0,
      0,
      {
        width:
          pageWidth,
      }
    );
  }


  // ====================================================
  // BOTTOM FIGMA WAVE
  // ====================================================

  if (
    assetExists(
      REPORT_ASSETS.headerBottom
    )
  ) {
    doc.image(
      REPORT_ASSETS.headerBottom,
      0,
      544,
      {
        width:
          pageWidth,
      }
    );
  }


  // ====================================================
  // MAIN ANANDUM LOGO
  // ====================================================

  if (
    assetExists(
      REPORT_ASSETS.coverLogo
    )
  ) {
    const logoWidth =
      133;

    const logoHeight =
      78;


    doc.image(
      REPORT_ASSETS.coverLogo,
      (
        pageWidth -
        logoWidth
      ) /
        2,
      230,
      {
        fit: [
          logoWidth,
          logoHeight,
        ],

        align:
          "center",
      }
    );
  }


  // ====================================================
  // ASSESSMENT RESULT REPORT
  // ====================================================

  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      10
    )
    .fillColor(
      "#5D616B"
    )
    .text(
      "ASSESSMENT RESULT REPORT",
      24,
      347,
      {
        width:
          pageWidth -
          48,

        align:
          "center",
      }
    );


  // ====================================================
  // REPORT TITLE
  // ====================================================

  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      24
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      copy.reportTitle,
      24,
      372,
      {
        width:
          pageWidth -
          48,

        align:
          "center",
      }
    );


  // ====================================================
  // GOLD UNDERLINE
  // ====================================================

  doc
    .roundedRect(
      (
        pageWidth -
        63
      ) /
        2,
      404,
      63,
      3,
      1.5
    )
    .fill(
      COLORS.gold
    );


  // ====================================================
  // SUBTITLE
  // ====================================================

  const subtitleWidth =
    350;


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      12
    )
    .fillColor(
      "#5D616B"
    )
    .text(
      copy.subtitle,
      (
        pageWidth -
        subtitleWidth
      ) /
        2,
      420,
      {
        width:
          subtitleWidth,

        align:
          "center",

        lineGap:
          3,
      }
    );


  // ====================================================
  // PARTICIPANT INFORMATION BOX
  // ====================================================

  const boxX =
    24;

  const boxY =
    477;

  const boxWidth =
    pageWidth -
    48;

  const boxHeight =
    68;

  const columnWidth =
    boxWidth /
    3;


  doc
    .rect(
      boxX,
      boxY,
      boxWidth,
      boxHeight
    )
    .fillAndStroke(
      "#FAFAFA",
      "#F8F3EB"
    );


  const labels = [
    "Participant",
    "Assessment taken",
    "Date & time completed",
  ];


  const values = [
    analysis?.participant
      ?.fullName ||
      "—",

    copy.assessmentName,

    formatDateTime(
      analysis?.completedAt
    ),
  ];


  for (
    let index = 0;
    index <
    3;
    index += 1
  ) {
    const x =
      boxX +
      (
        columnWidth *
        index
      );


    // LABEL

    doc
      .font(
        "Helvetica"
      )
      .fontSize(
        10
      )
      .fillColor(
        "#666666"
      )
      .text(
        labels[
          index
        ],
        x,
        boxY +
          15,
        {
          width:
            columnWidth,

          align:
            "center",
        }
      );


    // VALUE

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
        values[
          index
        ],
        x +
          5,
        boxY +
          37,
        {
          width:
            columnWidth -
            10,

          align:
            "center",
        }
      );
  }


  /*
    Reset cursor.

    This is important because the cover uses
    absolute positioning.
  */

  doc.x =
    24;

  doc.y =
    560;
}

function writeProfileAnalytics(
  doc: PDFKit.PDFDocument,
  analysis: any
) {
  const copy =
    getReportCopy(
      analysis
    );


  drawInnerHeader(
    doc,
    copy.assessmentName
  );


  const pageWidth =
    doc.page.width;

  const contentX =
    24;

  const contentWidth =
    pageWidth -
    48;


  // ====================================================
  // PAGE TITLE
  // ====================================================

  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      13
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      copy.insightTitle,
      contentX,
      66
    );


  // ====================================================
  // GOLD ACCENT INSIGHT
  // ====================================================

  const insightY =
    87;


  doc
    .moveTo(
      contentX,
      insightY
    )
    .lineTo(
      contentX,
      insightY +
        67
    )
    .lineWidth(
      2
    )
    .strokeColor(
      COLORS.gold
    )
    .stroke();


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      10.5
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      analysis?.analysis
        ?.headline ||
        "Your assessment profile is ready.",
      contentX +
        12,
      insightY +
        4,
      {
        width:
          contentWidth -
          18,
      }
    );


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      8.8
    )
    .fillColor(
      COLORS.body
    )
    .text(
      analysis?.analysis
        ?.summary ||
        "",
      contentX +
        12,
      insightY +
        26,
      {
        width:
          contentWidth -
          18,

        lineGap:
          2,
      }
    );


  // ====================================================
  // TOP 3 CARDS
  // ====================================================

  const cards =
    Array.isArray(
      analysis?.analysis
        ?.topDimensions
    )
      ? analysis.analysis
          .topDimensions
          .slice(
            0,
            3
          )
      : [];


  const cardsY =
    178;

  const cardGap =
    16;

  const cardWidth =
    (
      contentWidth -
      cardGap *
        2
    ) /
    3;

  const cardHeight =
    101;


  cards.forEach(
    (
      card: any,
      index: number
    ) => {
      const x =
        contentX +
        index *
          (
            cardWidth +
            cardGap
          );


      doc
        .roundedRect(
          x,
          cardsY,
          cardWidth,
          cardHeight,
          8
        )
        .fillAndStroke(
          COLORS.tealCard,
          COLORS.tealBorder
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
          card.title ||
            card.label ||
            "",
          x +
            18,
          cardsY +
            18,
          {
            width:
              cardWidth -
              36,
          }
        );


      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(
          18
        )
        .fillColor(
          COLORS.heading
        )
        .text(
          `${Number(
            card.percentage ??
              0
          ).toFixed(
            Number.isInteger(
              Number(
                card.percentage ??
                  0
              )
            )
              ? 0
              : 1
          )}%`,
          x +
            18,
          cardsY +
            58
        );


      doc
        .font(
          "Helvetica"
        )
        .fontSize(
          8
        )
        .fillColor(
          "#3D4550"
        )
        .text(
          card.label ||
            "",
          x +
            cardWidth /
              2,
          cardsY +
            65,
          {
            width:
              cardWidth /
                2 -
              18,

            align:
              "right",
          }
        );
    }
  );


  // ====================================================
  // DIMENSION BOX
  // ====================================================

  const dimensions =
    Array.isArray(
      analysis?.dimensions
    )
      ? analysis.dimensions
      : [];


  const boxY =
    295;

  const boxWidth =
    contentWidth;

  const availableHeight =
    doc.page.height -
    boxY -
    55;

  const headerHeight =
    58;

  const rowHeight =
    dimensions.length
      ? Math.max(
          39,
          Math.min(
            78,
            (
              availableHeight -
              headerHeight
            ) /
              dimensions.length
          )
        )
      : 70;

  const boxHeight =
    headerHeight +
    rowHeight *
      dimensions.length;


  doc
    .roundedRect(
      contentX,
      boxY,
      boxWidth,
      boxHeight,
      8
    )
    .lineWidth(
      0.7
    )
    .strokeColor(
      "#CFCFCF"
    )
    .stroke();


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      13
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      copy.dimensionTitle,
      contentX +
        18,
      boxY +
        15
    );


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
      copy.dimensionSubtitle,
      contentX +
        18,
      boxY +
        34
    );


  doc
    .moveTo(
      contentX +
        18,
      boxY +
        headerHeight,
    )
    .lineTo(
      contentX +
        boxWidth -
        18,
      boxY +
        headerHeight
    )
    .lineWidth(
      0.7
    )
    .strokeColor(
      "#DADADA"
    )
    .stroke();


  dimensions.forEach(
    (
      dimension: any,
      index: number
    ) => {
      const y =
        boxY +
        headerHeight +
        rowHeight *
          index;

      const color =
        getDimensionColor(
          index
        );

      const percentage =
        Math.max(
          0,
          Math.min(
            100,
            Number(
              dimension.percentage ??
                0
            )
          )
        );


      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(
          rowHeight <
            50
            ? 8
            : 9.5
        )
        .fillColor(
          COLORS.heading
        )
        .text(
          dimension.label,
          contentX +
            18,
          y +
            11,
          {
            width:
              boxWidth -
              190,
          }
        );

// ====================================================
// PERCENTAGE
//
// Move it left so there is clear separation
// between percentage and level pill.
// ====================================================

const scoreWidth =
  64;

const scoreX =
  contentX +
  boxWidth -
  220;


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
    `${Math.round(
      percentage *
        10
    ) /
      10}%`,
    scoreX,
    y +
      12,
    {
      width:
        scoreWidth,

      align:
        "right",

      lineBreak:
        false,
    }
  );


// ====================================================
// LEVEL PILL
//
// Lowered to visually align with Figma.
// ====================================================

const pillWidth =
  105;

const pillHeight =
  22;

const pillX =
  contentX +
  boxWidth -
  pillWidth -
  18;

const pillY =
  y +
  10;


doc
  .roundedRect(
    pillX,
    pillY,
    pillWidth,
    pillHeight,
    11
  )
  .fill(
    color
  );


doc
  .font(
    "Helvetica"
  )
  .fontSize(
    7.4
  )
  .fillColor(
    "#FFFFFF"
  )
  .text(
    dimension.level ||
      "",
    pillX,
    pillY +
      7,
    {
      width:
        pillWidth,

      align:
        "center",

      lineBreak:
        false,
    }
  );
      


      if (
        rowHeight >=
        50
      ) {
        doc
          .font(
            "Helvetica"
          )
          .fontSize(
            7.5
          )
          .fillColor(
            COLORS.body
          )
          .text(
            dimension.description ||
              "",
            contentX +
              18,
            y +
              31,
            {
              width:
                boxWidth -
                36,

              ellipsis:
                true,
            }
          );
      }


      const progressY =
        y +
        rowHeight -
        10;

      const progressX =
        contentX +
        18;

      const progressWidth =
        boxWidth -
        36;


      doc
        .rect(
          progressX,
          progressY,
          progressWidth,
          4
        )
        .fill(
          COLORS.track
        );


      doc
        .rect(
          progressX,
          progressY,
          progressWidth *
            (
              percentage /
              100
            ),
          4
        )
        .fill(
          color
        );


      if (
        index <
        dimensions.length -
          1
      ) {
        doc
          .moveTo(
            contentX +
              18,
            y +
              rowHeight
          )
          .lineTo(
            contentX +
              boxWidth -
              18,
            y +
              rowHeight
          )
          .lineWidth(
            0.6
          )
          .strokeColor(
            "#DDDDDD"
          )
          .stroke();
      }
    }
  );


  drawPageFooter(
    doc,
    `Page 1 of ${profileReportPageTotal(
      analysis
    )}`
  );
}


function writeProfileRadarPage(
  doc: PDFKit.PDFDocument,
  analysis: any
) {
  doc.addPage();


  const copy =
    getReportCopy(
      analysis
    );


  drawInnerHeader(
    doc,
    copy.assessmentName
  );


  const pageWidth =
    doc.page.width;

  const contentX =
    24;

  const contentWidth =
    pageWidth -
    48;


  // ====================================================
  // PERSONALITY INSIGHT HEADER
  // Repeats the Figma summary above the radar only.
  // Existing analytics page remains untouched.
  // ====================================================

  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      13
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      copy.insightTitle,
      contentX,
      66
    );


  const insightY =
    87;


  doc
    .moveTo(
      contentX,
      insightY
    )
    .lineTo(
      contentX,
      insightY +
        67
    )
    .lineWidth(
      2
    )
    .strokeColor(
      COLORS.gold
    )
    .stroke();


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      10.5
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      analysis?.analysis
        ?.headline ||
        "Your assessment profile is ready.",
      contentX +
        12,
      insightY +
        4,
      {
        width:
          contentWidth -
          18,
      }
    );


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      8.8
    )
    .fillColor(
      COLORS.body
    )
    .text(
      analysis?.analysis
        ?.summary ||
        "",
      contentX +
        12,
      insightY +
        26,
      {
        width:
          contentWidth -
          18,

        lineGap:
          2,
      }
    );


  // ====================================================
  // TOP 3 CARDS
  // Same values and styling as the existing analytics page.
  // ====================================================

  const cards =
    Array.isArray(
      analysis?.analysis
        ?.topDimensions
    )
      ? analysis.analysis
          .topDimensions
          .slice(
            0,
            3
          )
      : [];


  const cardsY =
    178;

  const cardGap =
    16;

  const cardWidth =
    (
      contentWidth -
      cardGap *
        2
    ) /
    3;

  const cardHeight =
    101;


  cards.forEach(
    (
      card: any,
      index: number
    ) => {
      const x =
        contentX +
        index *
          (
            cardWidth +
            cardGap
          );


      doc
        .roundedRect(
          x,
          cardsY,
          cardWidth,
          cardHeight,
          8
        )
        .fillAndStroke(
          COLORS.tealCard,
          COLORS.tealBorder
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
          card.title ||
            card.label ||
            "",
          x +
            18,
          cardsY +
            18,
          {
            width:
              cardWidth -
              36,
          }
        );


      const numericPercentage =
        Number(
          card.percentage ??
            0
        );


      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(
          18
        )
        .fillColor(
          COLORS.heading
        )
        .text(
          `${numericPercentage.toFixed(
            Number.isInteger(
              numericPercentage
            )
              ? 0
              : 1
          )}%`,
          x +
            18,
          cardsY +
            58
        );


      doc
        .font(
          "Helvetica"
        )
        .fontSize(
          8
        )
        .fillColor(
          "#3D4550"
        )
        .text(
          card.label ||
            "",
          x +
            cardWidth /
              2,
          cardsY +
            65,
          {
            width:
              cardWidth /
                2 -
              18,

            align:
              "right",
          }
        );
    }
  );


  // ====================================================
  // RADAR PROFILE BOX
  // ====================================================

  const boxY =
    295;

  const boxHeight =
    406;


  doc
    .roundedRect(
      contentX,
      boxY,
      contentWidth,
      boxHeight,
      8
    )
    .lineWidth(
      0.7
    )
    .strokeColor(
      "#CFCFCF"
    )
    .stroke();


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
      "Your Personality Profile",
      contentX +
        25,
      boxY +
        23
    );


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      10
    )
    .fillColor(
      "#9498A7"
    )
    .text(
      "Your five dimensions at a glance",
      contentX +
        25,
      boxY +
        42
    );


  const axisDefinitions = [
    {
      key:
        "CONSCIENTIOUSNESS",
      label:
        "Diligence",
    },
    {
      key:
        "EMOTIONAL_STABILITY",
      label:
        "Composure",
    },
    {
      key:
        "OPENNESS",
      label:
        "Curiosity",
    },
    {
      key:
        "AGREEABLENESS",
      label:
        "Cooperativeness",
    },
    {
      key:
        "EXTRAVERSION",
      label:
        "Sociability",
    },
  ];


  const centerX =
    pageWidth /
    2;

  const centerY =
    515;

  const outerRadius =
    116;

  const axisCount =
    axisDefinitions.length;


  function radarPoint(
    radius: number,
    index: number
  ) {
    const angle =
      -Math.PI /
        2 +
      (
        index *
        Math.PI *
        2
      ) /
        axisCount;


    return {
      x:
        centerX +
        Math.cos(
          angle
        ) *
          radius,

      y:
        centerY +
        Math.sin(
          angle
        ) *
          radius,
    };
  }


  function tracePolygon(
    points: Array<{
      x: number;
      y: number;
    }>
  ) {
    if (
      points.length ===
      0
    ) {
      return;
    }


    doc.moveTo(
      points[0].x,
      points[0].y
    );


    for (
      let index = 1;
      index <
      points.length;
      index += 1
    ) {
      doc.lineTo(
        points[index].x,
        points[index].y
      );
    }


    doc.closePath();
  }


  const outerPoints =
    axisDefinitions.map(
      (
        _axis,
        index
      ) =>
        radarPoint(
          outerRadius,
          index
        )
    );


  doc.save();

  tracePolygon(
    outerPoints
  );

  doc
    .fillColor(
      "#F4F6FA"
    )
    .strokeColor(
      "#C5CAD4"
    )
    .lineWidth(
      0.8
    )
    .fillAndStroke();

  doc.restore();


  // Nested 20/40/60/80/100 rings.
  for (
    let level = 1;
    level <=
    5;
    level += 1
  ) {
    const levelRadius =
      outerRadius *
      (
        level /
        5
      );

    const levelPoints =
      axisDefinitions.map(
        (
          _axis,
          index
        ) =>
          radarPoint(
            levelRadius,
            index
          )
      );


    tracePolygon(
      levelPoints
    );

    doc
      .lineWidth(
        level ===
          5
          ? 0.8
          : 0.55
      )
      .strokeColor(
        "#C5CAD4"
      )
      .stroke();
  }


  // Axis spokes.
  outerPoints.forEach(
    (point) => {
      doc
        .moveTo(
          centerX,
          centerY
        )
        .lineTo(
          point.x,
          point.y
        )
        .lineWidth(
          0.55
        )
        .strokeColor(
          "#C5CAD4"
        )
        .stroke();
    }
  );


  // Scale values along the upper axis.
  [
    100,
    80,
    60,
    40,
    20,
    0,
  ].forEach(
    (value) => {
      const ratio =
        value /
        100;

      const y =
        centerY -
        outerRadius *
          ratio -
        4;


      doc
        .font(
          "Helvetica"
        )
        .fontSize(
          6.2
        )
        .fillColor(
          "#8F9399"
        )
        .text(
          String(
            value
          ),
          centerX +
            4,
          y,
          {
            width:
              22,

            lineBreak:
              false,
          }
        );
    }
  );


  const radarValues =
    axisDefinitions.map(
      (axis) =>
        getDimensionPercentageByKey(
          analysis,
          axis.key
        )
    );


  const valuePoints =
    radarValues.map(
      (
        value,
        index
      ) =>
        radarPoint(
          outerRadius *
            (
              value /
              100
            ),
          index
        )
    );


  doc.save();

  tracePolygon(
    valuePoints
  );

  doc
    .fillColor(
      "#7086FD"
    )
    .fillOpacity(
      0.34
    )
    .strokeColor(
      "#7086FD"
    )
    .strokeOpacity(
      1
    )
    .lineWidth(
      1.3
    )
    .fillAndStroke();

  doc.restore();


  valuePoints.forEach(
    (point) => {
      doc
        .circle(
          point.x,
          point.y,
          2.5
        )
        .fill(
          "#7086FD"
        );
    }
  );


  // ====================================================
  // RADAR AXIS LABELS
  // ====================================================

  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      8.5
    )
    .fillColor(
      "#4D515A"
    );


  doc.text(
    "Diligence",
    centerX -
      45,
    centerY -
      outerRadius -
      28,
    {
      width:
        90,

      align:
        "center",
    }
  );


  doc.text(
    "Composure",
    centerX +
      103,
    centerY -
      46,
    {
      width:
        90,
    }
  );


  doc.text(
    "Curiosity",
    centerX +
      77,
    centerY +
      111,
    {
      width:
        90,
    }
  );


  doc.text(
    "Cooperativeness",
    centerX -
      188,
    centerY +
      111,
    {
      width:
        110,

      align:
        "right",
    }
  );


  doc.text(
    "Sociability",
    centerX -
      193,
    centerY -
      46,
    {
      width:
        90,

      align:
        "right",
    }
  );


  drawPageFooter(
    doc,
    "Page 2 of 4"
  );
}


function writeMaritimeAnalytics(
  doc: PDFKit.PDFDocument,
  analysis: any
) {
  writePageTitle(
  doc,
  "Maritime Human Performance Analysis",
  "Assessment performance, section results and observed development areas.",
  analysis.test.title
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

function writeProfileResponsesTable(
  doc: PDFKit.PDFDocument,
  analysis: any
) {
  doc.addPage();


  const copy =
    getReportCopy(
      analysis
    );


  drawInnerHeader(
    doc,
    copy.assessmentName
  );


  const pageWidth =
    doc.page.width;

  const x =
    24;

  const width =
    pageWidth -
    48;


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      15
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      "Your Responses",
      x,
      66
    );


  const tableY =
    100;


  const columns = {
    question:
      30,

    statement:
      310,

    dimension:
      105,

    response:
      width -
      445,
  };


  function drawHeader(
    y: number
  ) {
    doc
      .rect(
        x,
        y,
        width,
        23
      )
      .fill(
        COLORS.paleGold
      );


    doc
      .font(
        "Helvetica"
      )
      .fontSize(
        7
      )
      .fillColor(
        COLORS.heading
      );


    doc.text(
      "Q",
      x +
        8,
      y +
        8,
      {
        width:
          columns.question,
      }
    );


    doc.text(
      "Statement",
      x +
        columns.question,
      y +
        8,
      {
        width:
          columns.statement,
      }
    );


    doc.text(
      "Dimension",
      x +
        columns.question +
        columns.statement,
      y +
        8,
      {
        width:
          columns.dimension,
      }
    );


    doc.text(
      "Your response",
      x +
        columns.question +
        columns.statement +
        columns.dimension,
      y +
        8,
      {
        width:
          columns.response,
      }
    );
  }


  drawHeader(
    tableY
  );


  let y =
    tableY +
    23;


  const responses =
    Array.isArray(
      analysis?.responses
    )
      ? analysis.responses
      : [];


  for (
    const response
    of responses
  ) {
    doc
      .font(
        "Helvetica"
      )
      .fontSize(
        7.2
      );


    const statementHeight =
      doc.heightOfString(
        response.questionText ||
          "",
        {
          width:
            columns.statement -
            10,

          lineGap:
            0,
        }
      );


    const dimensionHeight =
      doc.heightOfString(
        response.dimensionLabel ||
          "",
        {
          width:
            columns.dimension -
            8,
        }
      );


    const responseHeight =
      doc.heightOfString(
        response.response ||
          "",
        {
          width:
            columns.response -
            8,
        }
      );


    const rowHeight =
      Math.max(
        26,
        statementHeight +
          10,
        dimensionHeight +
          10,
        responseHeight +
          10
      );


    if (
      y +
      rowHeight >
      doc.page.height -
        45
    ) {
      drawPageFooter(
        doc,
        "Your Responses"
      );


      doc.addPage();


      drawInnerHeader(
        doc,
        copy.assessmentName
      );


      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(
          15
        )
        .fillColor(
          COLORS.heading
        )
        .text(
          "Your Responses",
          x,
          66
        );


      y =
        tableY;


      drawHeader(
        y
      );


      y +=
        23;
    }


    doc
      .font(
        "Helvetica"
      )
      .fontSize(
        7.2
      )
      .fillColor(
        COLORS.heading
      );


    doc.text(
      String(
        response.questionNumber
      ),
      x +
        8,
      y +
        8,
      {
        width:
          columns.question -
          8,
      }
    );


    doc.text(
      response.questionText ||
        "",
      x +
        columns.question,
      y +
        8,
      {
        width:
          columns.statement -
          10,
      }
    );


    doc.text(
      response.dimensionLabel ||
        "—",
      x +
        columns.question +
        columns.statement,
      y +
        8,
      {
        width:
          columns.dimension -
          8,
      }
    );


    doc.text(
      response.response ||
        "—",
      x +
        columns.question +
        columns.statement +
        columns.dimension,
      y +
        8,
      {
        width:
          columns.response -
          8,
      }
    );


    doc
      .moveTo(
        x,
        y +
          rowHeight
      )
      .lineTo(
        x +
          width,
        y +
          rowHeight
      )
      .lineWidth(
        0.5
      )
      .strokeColor(
        "#D7D7D7"
      )
      .stroke();


    y +=
      rowHeight;
  }


  const responsePageNumber =
    hasBigFiveRadarPage(
      analysis
    )
      ? 3
      : 2;


  drawPageFooter(
    doc,
    `Page ${responsePageNumber} of ${profileReportPageTotal(
      analysis
    )}`
  );
}

function writeResponses(
  doc: PDFKit.PDFDocument,
  analysis: any
) {
  // Personality / Behaviour / Motivation
  // use the compact Figma response table.
  if (
    analysis.resultKind !==
    "MARITIME_SCORED"
  ) {
    writeProfileResponsesTable(
      doc,
      analysis
    );

    return;
  }


  // Maritime keeps the existing detailed
  // correct-answer / selected-answer layout.
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


  const copy =
    getReportCopy(
      analysis
    );


  drawInnerHeader(
    doc,
    copy.assessmentName
  );


  const x =
    24;

  const width =
    doc.page.width -
    48;


  // ====================================================
  // UNDERSTANDING YOUR RESULTS
  // ====================================================

  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      15
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      "Understanding Your Results",
      x,
      66
    );


  let y =
    95;


  const understanding = [
    "Your results represent a snapshot of your responses at the time the assessment was completed.",

    "Preferences, behaviours, motivations, and responses may change over time or vary depending on circumstances and context.",

    "This report should therefore be used as a tool for reflection and development rather than as a permanent definition of the participant.",
  ];


  for (
    const paragraph
    of understanding
  ) {
    doc
      .font(
        "Helvetica"
      )
      .fontSize(
        9.4
      )
      .fillColor(
        "#303744"
      )
      .text(
        paragraph,
        x,
        y,
        {
          width,

          lineGap:
            2,
        }
      );


    y =
      doc.y +
      13;
  }


  // ====================================================
  // DISCLAIMER
  // ====================================================

  y +=
    15;


  doc
    .font(
      "Helvetica-Bold"
    )
    .fontSize(
      15
    )
    .fillColor(
      COLORS.heading
    )
    .text(
      "Assessment Disclaimer and Limitation of Liability",
      x,
      y,
      {
        width,
      }
    );


  y =
    doc.y +
    17;


  const disclaimer = [
    "This psychometric assessment and the results contained in this report are intended for self-awareness, reflection, and personal development only.",

    "The findings are based on the participant's responses and reported state at the time of completing the assessment. Results are therefore indicative and informational in nature and should not be interpreted as diagnostic conclusions.",

    "This assessment does not constitute, and should not be considered, a medical, psychological, psychiatric, or clinical diagnosis. It does not replace assessment, advice, diagnosis, or treatment provided by a suitably qualified professional.",

    "Assessment results reflect self-reported responses and may be influenced by factors including the participant's interpretation of the questions, circumstances, mood, and responses at the time of testing.",

    "Fathom Marine Consultants and Anandum by Fathom do not guarantee the accuracy, completeness, suitability, or applicability of the assessment results for any specific individual, situation, or decision.",

    "To the fullest extent permitted by applicable law, Fathom Marine Consultants and Anandum by Fathom accept no liability for any decision, action, loss, or consequence arising from reliance solely on the findings contained in this report.",

    "The results should be considered as one source of information and should not be used as the sole basis for medical, psychological, employment, selection, suitability, or other high-stakes decisions.",

    "Where medical, psychological, psychiatric, or other professional advice is required, the participant should consult an appropriately qualified professional.",
  ];


  for (
    const paragraph
    of disclaimer
  ) {
    doc
      .font(
        "Helvetica"
      )
      .fontSize(
        9.1
      )
      .fillColor(
        "#303744"
      )
      .text(
        paragraph,
        x,
        y,
        {
          width,

          lineGap:
            2,
        }
      );


    y =
      doc.y +
      12;
  }


  const legalPageNumber =
    hasBigFiveRadarPage(
      analysis
    )
      ? 4
      : 3;


  drawPageFooter(
    doc,
    `Page ${legalPageNumber} of ${profileReportPageTotal(
      analysis
    )}`
  );

  // ====================================================
// PARTICIPANT ACKNOWLEDGEMENT
// ====================================================

const acknowledgement =
  analysis?.disclaimerAcknowledgement ||
  analysis?.acknowledgement ||
  analysis?.disclaimer?.acknowledgement ||
  null;


const acknowledgedAt =
  acknowledgement?.acknowledgedAt ||
  acknowledgement?.acceptedAt ||
  analysis?.acknowledgedAt ||
  null;


if (
  acknowledgedAt
) {
  y +=
    12;


  // Small divider

  doc
    .moveTo(
      x,
      y
    )
    .lineTo(
      x +
        width,
      y
    )
    .lineWidth(
      0.6
    )
    .strokeColor(
      "#D9D9D9"
    )
    .stroke();


  y +=
    14;


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
      "Participant Acknowledgement",
      x,
      y,
      {
        width,
      }
    );


  y =
    doc.y +
    7;


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      8.8
    )
    .fillColor(
      "#303744"
    )
    .text(
      `The participant acknowledged and accepted the Assessment Disclaimer and Limitation of Liability on ${formatDateTime(
        acknowledgedAt
      )}.`,
      x,
      y,
      {
        width,

        lineGap:
          2,
      }
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


        if (
          hasBigFiveRadarPage(
            analysis
          )
        ) {
          writeProfileRadarPage(
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