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


  if (
    type ===
    "SENIOR_LEADERSHIP_PERSONALITY"
  ) {
    return {
      reportTitle:
        "Senior Leadership Personality Assessment",

      assessmentName:
        "Anandam Senior Leadership Personality Test",

      subtitle:
        "Review your responses across strategic judgement, leadership influence, crew dynamics, resilience, adaptability and integrity.",

      insightTitle:
        "Your Senior Leadership Assessment",

      dimensionTitle:
        "Assessment Sections",

      dimensionSubtitle:
        "This draft assessment currently reports responses without validated scoring cut-offs.",
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


function profileResponsePageCount(
  doc: PDFKit.PDFDocument,
  analysis: any
) {
  const responses =
    Array.isArray(
      analysis?.responses
    )
      ? analysis.responses
      : [];


  if (
    responses.length ===
    0
  ) {
    return 1;
  }


  const width =
    doc.page.width -
    48;


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


  const firstRowY =
    123;


  const bottomLimit =
    doc.page.height -
    45;


  let pageCount =
    1;


  let y =
    firstRowY;


  doc
    .font(
      "Helvetica"
    )
    .fontSize(
      7.2
    );


  for (
    const response
    of responses
  ) {
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
      bottomLimit
    ) {
      pageCount +=
        1;

      y =
        firstRowY;
    }


    y +=
      rowHeight;
  }


  return pageCount;
}


function profileReportPageTotal(
  doc: PDFKit.PDFDocument,
  analysis: any
) {
  return (
    1 +
    (
      hasBigFiveRadarPage(
        analysis
      )
        ? 1
        : 0
    ) +
    profileResponsePageCount(
      doc,
      analysis
    ) +
    1
  );
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
        10
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
          38,
        {
          width:
            columnWidth -
            10,

          align:
        "center",

      lineBreak:
        false,
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
      doc,
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
    `Page 2 of ${profileReportPageTotal(
      doc,
      analysis
    )}`
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


  const totalReportPages =
    profileReportPageTotal(
      doc,
      analysis
    );


  let responsePageNumber =
    hasBigFiveRadarPage(
      analysis
    )
      ? 3
      : 2;


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
        `Page ${responsePageNumber} of ${totalReportPages}`
      );


      responsePageNumber +=
        1;


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


  drawPageFooter(
    doc,
    `Page ${responsePageNumber} of ${totalReportPages}`
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
    profileReportPageTotal(
      doc,
      analysis
    );


  drawPageFooter(
    doc,
    `Page ${legalPageNumber} of ${legalPageNumber}`
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



// =====================================================
// FIGMA V2 REPORT RENDERER
// =====================================================

const REPORT_ASSETS_V2 = {
  goldTop: path.join(REPORT_ASSET_DIR, "cover-gold-top.png"),
  goldBottom: path.join(REPORT_ASSET_DIR, "cover-gold-bottom.png"),
  purpleTop: path.join(REPORT_ASSET_DIR, "cover-purple-top.png"),
  purpleBottom: path.join(REPORT_ASSET_DIR, "cover-purple-bottom.png"),
  coverLogo: path.join(REPORT_ASSET_DIR, "logo name.png"),
  smallLogo: path.join(REPORT_ASSET_DIR, "small-name-logo.png"),
};

const V2_RESPONSE_STYLES: Record<number, {
  label: string;
  color: string;
  background: string;
}> = {
  1: { label: "Strongly Disagree", color: "#A34848", background: "#FBEAEA" },
  2: { label: "Disagree", color: "#98602E", background: "#FFF0E2" },
  3: { label: "Neutral", color: "#62645F", background: "#F0F0EE" },
  4: { label: "Agree", color: "#527343", background: "#EDF5E9" },
  5: { label: "Strongly Agree", color: "#2E7052", background: "#E1F1E8" },
};

function isSeniorLeadershipReport(analysis: any) {
  return analysis?.test?.type === "SENIOR_LEADERSHIP_PERSONALITY";
}

function v2AssessmentName(analysis: any) {
  if (isSeniorLeadershipReport(analysis)) {
    return "Senior Leadership Personality Test";
  }

  const copy = getReportCopy(analysis);
  return copy.assessmentName || analysis?.test?.title || "Assessment Result";
}

function v2CoverTitle(analysis: any) {
  if (isSeniorLeadershipReport(analysis)) {
    return "Senior Leadership Personality\nTest";
  }

  return getReportCopy(analysis).reportTitle;
}

function v2CoverSubtitle(analysis: any) {
  if (isSeniorLeadershipReport(analysis)) {
    return "A senior maritime leadership assessment covering judgement, influence, teamwork, resilience, adaptability and integrity.";
  }

  return getReportCopy(analysis).subtitle;
}

function v2Responses(analysis: any) {
  return Array.isArray(analysis?.responses) ? analysis.responses : [];
}

function v2RawValue(response: any): number | null {
  const raw = Number(response?.rawValue);
  return Number.isFinite(raw) && raw >= 1 && raw <= 5 ? raw : null;
}

function v2ScaleLabels(analysis: any) {
  const labels = { ...V2_RESPONSE_STYLES } as Record<number, any>;
  for (const response of v2Responses(analysis)) {
    const raw = v2RawValue(response);
    if (raw && response?.response) {
      labels[raw] = {
        ...labels[raw],
        label: String(response.response).replace(/^Never \/ /, "").replace(/^Rarely \/ /, "").replace(/^Sometimes \/ /, "").replace(/^Often \/ /, "").replace(/^Almost always \/ /, ""),
      };
    }
  }
  return labels;
}

function v2ResponseDistribution(analysis: any) {
  const counts = [0, 0, 0, 0, 0];
  for (const response of v2Responses(analysis)) {
    const raw = v2RawValue(response);
    if (raw) counts[raw - 1] += 1;
  }
  return counts;
}

function v2Chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result.length ? result : [[]];
}

function v2Dimensions(analysis: any) {
  return Array.isArray(analysis?.dimensions) ? analysis.dimensions : [];
}

function v2HasScoredDimensions(analysis: any) {
  return !isSeniorLeadershipReport(analysis) && v2Dimensions(analysis).length > 0;
}

function v2Header(doc: PDFKit.PDFDocument, analysis: any) {
  const width = doc.page.width;
  const logo = assetExists(REPORT_ASSETS_V2.smallLogo)
    ? REPORT_ASSETS_V2.smallLogo
    : REPORT_ASSETS_V2.coverLogo;

  if (assetExists(logo)) {
    doc.image(logo, 24, 9, { fit: [82, 22] });
  } else {
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#01013D").text("ANANDUM", 24, 15, { lineBreak: false });
  }

  const name = v2AssessmentName(analysis);
  doc.font("Helvetica").fontSize(name.length > 34 ? 7.2 : 8.5).fillColor("#8F9399").text(
    name,
    width - 220,
    14,
    { width: 196, align: "right", lineBreak: false, ellipsis: true }
  );

  doc.moveTo(0, 40).lineTo(width, 40).lineWidth(0.7).strokeColor("#D9D9D9").stroke();
}

function v2Footer(doc: PDFKit.PDFDocument, pageNumber: number, totalPages: number) {
  const oldBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc.font("Helvetica").fontSize(10).fillColor("#808496").text(
    `Page ${pageNumber} of ${totalPages}`,
    0,
    811,
    { width: doc.page.width, align: "center", lineBreak: false }
  );
  doc.page.margins.bottom = oldBottom;
}

function v2AddContentPage(doc: PDFKit.PDFDocument, analysis: any) {
  doc.addPage();
  v2Header(doc, analysis);
}

function v2PageHeading(
  doc: PDFKit.PDFDocument,
  title: string,
  subtitle?: string
) {
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#1B2033").text(title, 24, 65, { width: 547 });
  if (subtitle) {
    doc.font("Helvetica").fontSize(8).fillColor("#667085").text(subtitle, 24, 88, { width: 547 });
  }
}

function v2DrawCover(doc: PDFKit.PDFDocument, analysis: any) {
  const width = doc.page.width;
  const height = doc.page.height;
  const senior = isSeniorLeadershipReport(analysis);
  const top = senior ? REPORT_ASSETS_V2.purpleTop : REPORT_ASSETS_V2.goldTop;
  const bottom = senior ? REPORT_ASSETS_V2.purpleBottom : REPORT_ASSETS_V2.goldBottom;

  if (assetExists(top)) doc.image(top, 0, 0, { width });
  if (assetExists(bottom)) doc.image(bottom, 0, height - 256, { width });

  if (assetExists(REPORT_ASSETS_V2.coverLogo)) {
    doc.image(REPORT_ASSETS_V2.coverLogo, (width - 133) / 2, 215, { fit: [133, 78], align: "center" });
  } else {
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#01013D").text("ANANDUM", 0, 255, { width, align: "center" });
  }

  doc.font("Helvetica").fontSize(10).fillColor("#5D616B").text(
    "ASSESSMENT RESULT REPORT",
    24,
    335,
    { width: width - 48, align: "center" }
  );

  doc.font("Helvetica-Bold").fontSize(24).fillColor("#0C1421").text(
    v2CoverTitle(analysis),
    60,
    357,
    { width: width - 120, align: "center", lineGap: 1 }
  );

  doc.roundedRect((width - 63) / 2, 417, 63, 3, 1.5).fill("#B88A32");

  doc.font("Helvetica").fontSize(12).fillColor("#5D616B").text(
    v2CoverSubtitle(analysis),
    (width - 380) / 2,
    434,
    { width: 380, align: "center", lineGap: 3 }
  );

  const boxX = 24;
  const boxY = 490;
  const boxWidth = width - 48;
  const boxHeight = 65;
  const colWidth = boxWidth / 3;
  doc.rect(boxX, boxY, boxWidth, boxHeight).fillAndStroke("#FAFAFA", "#F8F3EB");

  const labels = ["Participant", "Assessment taken", "Date & time completed"];
  const values = [
    analysis?.participant?.fullName || "—",
    v2AssessmentName(analysis),
    formatDateTime(analysis?.completedAt),
  ];

  for (let index = 0; index < 3; index += 1) {
    const x = boxX + colWidth * index;
    doc.font("Helvetica").fontSize(9).fillColor("#666666").text(labels[index], x + 5, boxY + 15, { width: colWidth - 10, align: "center" });
    doc.font("Helvetica-Bold").fontSize(values[index].length > 30 ? 8.2 : 10).fillColor("#0C1421").text(values[index], x + 6, boxY + 36, { width: colWidth - 12, align: "center", height: 18, ellipsis: true });
  }
}

function v2DrawRadar(
  doc: PDFKit.PDFDocument,
  dimensions: any[],
  centerX: number,
  centerY: number,
  radius: number
) {
  const source = dimensions.slice(0, Math.min(6, dimensions.length));
  const count = source.length;
  if (count < 3) return;

  const point = (r: number, index: number) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return { x: centerX + Math.cos(angle) * r, y: centerY + Math.sin(angle) * r };
  };

  const polygon = (pts: Array<{x:number;y:number}>) => {
    doc.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) doc.lineTo(pts[i].x, pts[i].y);
    doc.closePath();
  };

  for (let level = 1; level <= 5; level += 1) {
    const pts = source.map((_item, index) => point(radius * level / 5, index));
    polygon(pts);
    doc.lineWidth(level === 5 ? 0.8 : 0.45).strokeColor("#C5CAD4").stroke();
  }

  source.forEach((_item, index) => {
    const outer = point(radius, index);
    doc.moveTo(centerX, centerY).lineTo(outer.x, outer.y).lineWidth(0.45).strokeColor("#C5CAD4").stroke();
  });

  const values = source.map((dimension, index) => point(radius * Math.max(0, Math.min(100, Number(dimension?.percentage || 0))) / 100, index));
  doc.save();
  polygon(values);
  doc.fillColor("#7086FD").fillOpacity(0.32).strokeColor("#7086FD").strokeOpacity(1).lineWidth(1.3).fillAndStroke();
  doc.restore();

  values.forEach((p) => doc.circle(p.x, p.y, 2.4).fill("#7086FD"));

  source.forEach((dimension, index) => {
    const labelPoint = point(radius + 31, index);
    const label = String(dimension?.label || dimension?.key || "");
    doc.font("Helvetica").fontSize(7.6).fillColor("#4D515A").text(label, labelPoint.x - 52, labelPoint.y - 6, { width: 104, align: "center", height: 22, ellipsis: true });
  });
}

function v2DrawInsightsPage(doc: PDFKit.PDFDocument, analysis: any) {
  v2PageHeading(doc, getReportCopy(analysis).insightTitle || "Your Assessment Insights");

  const x = 24;
  const width = 547;
  const insightY = 86;
  doc.moveTo(x, insightY).lineTo(x, insightY + 67).lineWidth(2).strokeColor("#B88A32").stroke();
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#0C1421").text(analysis?.analysis?.headline || "Your assessment is complete.", x + 10, insightY + 4, { width: width - 20 });
  doc.font("Helvetica").fontSize(8.6).fillColor("#60657C").text(analysis?.analysis?.summary || "Your responses have been recorded for reflection and development.", x + 10, insightY + 25, { width: width - 20, lineGap: 2, height: 45, ellipsis: true });

  if (v2HasScoredDimensions(analysis)) {
    const top = (analysis?.analysis?.topDimensions || v2Dimensions(analysis).slice(0, 3)).slice(0, 3);
    const gap = 10;
    const cardWidth = (width - gap * 2) / 3;
    top.forEach((item: any, index: number) => {
      const cx = x + index * (cardWidth + gap);
      doc.roundedRect(cx, 177, cardWidth, 102, 8).fillAndStroke("#EEF8F7", "#CDE1DF");
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#1B2033").text(item?.title || item?.profileTitle || item?.label || "", cx + 18, 195, { width: cardWidth - 36, height: 28, ellipsis: true });
      doc.font("Helvetica-Bold").fontSize(17).fillColor("#1B2033").text(`${Number(item?.percentage || 0).toFixed(1).replace(/\.0$/, "")}%`, cx + 18, 233);
      doc.font("Helvetica").fontSize(7.5).fillColor("#3D4550").text(item?.label || "", cx + 18, 255, { width: cardWidth - 36, height: 18, ellipsis: true });
    });

    doc.roundedRect(x, 295, width, 406, 8).lineWidth(0.7).strokeColor("#CFCFCF").stroke();
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#1B2033").text("Your Personality Profile", x + 24, 319);
    doc.font("Helvetica").fontSize(9).fillColor("#9498A7").text("Your key dimensions at a glance", x + 24, 339);
    v2DrawRadar(doc, v2Dimensions(analysis), doc.page.width / 2, 515, 116);
  } else {
    doc.roundedRect(x, 188, width, 322, 8).lineWidth(0.7).strokeColor("#CFCFCF").stroke();
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#1B2033").text("Assessment Sections", x + 18, 210);
    doc.font("Helvetica").fontSize(8.5).fillColor("#667085").text("This assessment currently reports your responses without validated score cut-offs.", x + 18, 232, { width: width - 36 });

    const sections = Array.isArray(analysis?.sections) ? analysis.sections : [];
    sections.forEach((section: any, index: number) => {
      const y = 275 + index * 70;
      doc.roundedRect(x + 18, y, width - 36, 52, 7).fillAndStroke(index === 0 ? "#EDF3FC" : index === 1 ? "#F2EEFA" : "#EAF6F3", "#D8DFE8");
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#243746").text(section?.title || section?.code || `Section ${index + 1}`, x + 34, y + 11, { width: 360, height: 18, ellipsis: true });
      doc.font("Helvetica").fontSize(8.5).fillColor("#60657C").text(`${section?.answered ?? 0} of ${section?.total ?? 0} responses completed`, x + 34, y + 31);
    });
  }
}

function v2DrawDimensionsPage(doc: PDFKit.PDFDocument, analysis: any) {
  const dimensions = v2Dimensions(analysis);
  v2PageHeading(doc, getReportCopy(analysis).dimensionTitle || "Your Personality Dimensions", getReportCopy(analysis).dimensionSubtitle);
  const x = 24;
  const width = 547;
  const boxY = 114;
  const rowHeight = Math.min(86, Math.max(54, 600 / Math.max(1, dimensions.length)));
  const boxHeight = Math.min(648, 30 + rowHeight * dimensions.length);
  doc.roundedRect(x, boxY, width, boxHeight, 8).lineWidth(0.7).strokeColor("#CFCFCF").stroke();

  dimensions.forEach((dimension: any, index: number) => {
    const y = boxY + 12 + index * rowHeight;
    const color = getDimensionColor(index);
    const percentage = Math.max(0, Math.min(100, Number(dimension?.percentage || 0)));
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#1B2033").text(dimension?.label || "", x + 18, y, { width: 310, height: 18, ellipsis: true });
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#1B2033").text(`${Math.round(percentage * 10) / 10}%`, x + 343, y, { width: 58, align: "right" });
    const pillX = x + width - 118;
    doc.roundedRect(pillX, y - 2, 100, 22, 11).fill(color);
    doc.font("Helvetica").fontSize(7.2).fillColor("#FFFFFF").text(dimension?.level || "", pillX + 4, y + 5, { width: 92, align: "center", height: 12, ellipsis: true });
    if (rowHeight >= 66) {
      doc.font("Helvetica").fontSize(7.5).fillColor("#60657C").text(dimension?.description || "", x + 18, y + 23, { width: width - 36, height: 22, ellipsis: true });
    }
    const progressY = y + rowHeight - 14;
    doc.rect(x + 18, progressY, width - 36, 4).fill("#E1E4EE");
    doc.rect(x + 18, progressY, (width - 36) * percentage / 100, 4).fill(color);
    if (index < dimensions.length - 1) doc.moveTo(x + 18, y + rowHeight - 1).lineTo(x + width - 18, y + rowHeight - 1).lineWidth(0.5).strokeColor("#E3E3E3").stroke();
  });
}

function v2DrawScalePlotPage(doc: PDFKit.PDFDocument, analysis: any, items: any[], startIndex: number) {
  v2PageHeading(doc, "A Closer Look at Your Answers", "See how each selected response sits on the five-point scale.");
  const labels = v2ScaleLabels(analysis);
  const x = 24;
  const statementWidth = 310;
  const scaleX = x + statementWidth;
  const scaleWidth = 235;
  const headerY = 100;
  const colWidth = scaleWidth / 5;

  doc.rect(x, headerY, 547, 34).fill("#F1F3F5");
  doc.font("Helvetica").fontSize(6.5).fillColor("#1B2033").text("Statement", x + 7, headerY + 11, { width: statementWidth - 12 });
  for (let value = 1; value <= 5; value += 1) {
    doc.text(labels[value].label, scaleX + (value - 1) * colWidth + 2, headerY + 7, { width: colWidth - 4, align: "center", height: 23, ellipsis: true });
  }

  const rowHeight = 31;
  items.forEach((response: any, index: number) => {
    const y = headerY + 34 + index * rowHeight;
    doc.moveTo(x, y + rowHeight).lineTo(x + 547, y + rowHeight).lineWidth(0.45).strokeColor("#D7D7D7").stroke();
    for (let value = 1; value <= 5; value += 1) {
      const vx = scaleX + (value - 1) * colWidth;
      doc.moveTo(vx, y).lineTo(vx, y + rowHeight).lineWidth(0.35).strokeColor("#E1E1E1").stroke();
    }
    doc.font("Helvetica").fontSize(6.7).fillColor("#243746").text(response?.questionText || "", x + 7, y + 8, { width: statementWidth - 14, height: 18, ellipsis: true });

    const raw = v2RawValue(response);
    if (raw) {
      const style = V2_RESPONSE_STYLES[raw];
      const center = scaleX + (raw - 0.5) * colWidth;
      const neutralX = scaleX + 2.5 * colWidth;
      doc.moveTo(Math.min(neutralX, center), y + rowHeight / 2).lineTo(Math.max(neutralX, center), y + rowHeight / 2).lineWidth(1.3).strokeColor(style.color).stroke();
      doc.circle(center, y + rowHeight / 2, 5.5).fill(style.color);
    }
  });

  doc.font("Helvetica").fontSize(7).fillColor("#8F9399").text(`Questions ${startIndex + 1}–${startIndex + items.length}`, x, 772, { width: 547, align: "right" });
}

function v2ReflectionText(analysis: any, distribution: number[]) {
  const labels = v2ScaleLabels(analysis);
  const max = Math.max(...distribution);
  if (max <= 0) return "Use this page to notice where your responses clustered and where they varied. Consider what those patterns mean in the context of your current role and circumstances.";
  const dominant = distribution.map((count, index) => ({ count, value: index + 1 })).sort((a, b) => b.count - a.count)[0];
  return `Your responses most often fell in “${labels[dominant.value].label}”. Consider where your answers were consistent, where they varied, and what each statement meant to you when you responded.`;
}

function v2DrawResponsePatternPage(doc: PDFKit.PDFDocument, analysis: any) {
  v2PageHeading(doc, "Overall Response Pattern", "A summary of how your answers were distributed across the five-point scale.");
  const counts = v2ResponseDistribution(analysis);
  const labels = v2ScaleLabels(analysis);
  const chartX = 38;
  const chartY = 135;
  const chartW = 533;
  const chartH = 235;
  const maxCount = Math.max(5, ...counts);

  for (let tick = 0; tick <= 4; tick += 1) {
    const y = chartY + chartH - (tick / 4) * chartH;
    const value = Math.round(maxCount * tick / 4);
    doc.moveTo(chartX, y).lineTo(chartX + chartW, y).lineWidth(0.5).strokeColor("#D9D9D9").stroke();
    doc.font("Helvetica").fontSize(7).fillColor("#1B2033").text(String(value), 18, y - 4, { width: 16, align: "right" });
  }

  const barSlot = chartW / 5;
  counts.forEach((count, index) => {
    const barW = 54;
    const h = count / maxCount * chartH;
    const x = chartX + index * barSlot + (barSlot - barW) / 2;
    const style = V2_RESPONSE_STYLES[index + 1];
    doc.rect(x, chartY + chartH - h, barW, h).fill(style.color);
    doc.font("Helvetica").fontSize(7.5).fillColor("#1B2033").text(String(count), x, chartY + chartH - h - 14, { width: barW, align: "center" });
    doc.font("Helvetica").fontSize(6.7).fillColor("#243746").text(labels[index + 1].label, x - 10, chartY + chartH + 14, { width: barW + 20, align: "center", height: 28, ellipsis: true });
  });

  doc.roundedRect(24, 426, 547, 98, 8).fill("#E6F4F3");
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#1B2033").text("Something to reflect on", 42, 440, { width: 511 });
  doc.rect(42, 462, 2, 49).fill("#259A91");
  doc.font("Helvetica").fontSize(9).fillColor("#60657C").text(v2ReflectionText(analysis, counts), 52, 462, { width: 492, lineGap: 3, height: 55, ellipsis: true });
}

function v2DrawBubbleMapPage(doc: PDFKit.PDFDocument, analysis: any) {
  const dimensions = v2Dimensions(analysis).slice(0, 6);
  v2PageHeading(doc, "Your Domain Map", "See how your main assessment areas compare.");
  const colors = [
    ["#FFF4EB", "#A65B16"],
    ["#EFF9F1", "#4D8563"],
    ["#F6F1FC", "#8A6BA8"],
    ["#FFFAE8", "#947A36"],
    ["#FFF1F5", "#A96980"],
    ["#EFF6FD", "#5B80A5"],
  ];
  const centers = [[107,240],[297,240],[487,240],[107,444],[297,444],[487,444]];
  dimensions.forEach((dimension: any, index: number) => {
    const [cx, cy] = centers[index];
    const [bg, fg] = colors[index];
    doc.circle(cx, cy, 82).fillAndStroke(bg, fg);
    const score10 = Math.round(Number(dimension?.percentage || 0) / 10 * 10) / 10;
    doc.font("Helvetica-Bold").fontSize(26).fillColor(fg).text(`${score10}/10`, cx - 62, cy - 24, { width: 124, align: "center" });
    doc.font("Helvetica").fontSize(10).fillColor("#000000").text(dimension?.label || "", cx - 62, cy + 17, { width: 124, align: "center", height: 32, ellipsis: true });
  });
  doc.roundedRect(24, 586, 547, 97, 8).fill("#E6F4F3");
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#1B2033").text("Something to reflect on", 42, 600);
  doc.rect(42, 622, 2, 49).fill("#259A91");
  doc.font("Helvetica").fontSize(9).fillColor("#60657C").text("Think about a recent situation where you felt engaged and effective. Which of these areas were most present? Consider one small change that could help your daily work better match what matters to you.", 52, 622, { width: 492, lineGap: 3, height: 55, ellipsis: true });
}

function v2DrawCloserLookPage(doc: PDFKit.PDFDocument, analysis: any) {
  v2PageHeading(doc, "A Closer Look at Your Responses", "These patterns are possibilities to explore, not conclusions.");
  const dimensions = v2HasScoredDimensions(analysis)
    ? v2Dimensions(analysis).slice(0, 4)
    : (Array.isArray(analysis?.sections) ? analysis.sections.slice(0, 4).map((section: any) => ({ label: section.title, description: `${section.answered || 0} of ${section.total || 0} statements completed.` })) : []);

  const boxes = [
    { x:24, y:140, bg:"#EDF3FC", border:"#CDDCEE" },
    { x:311, y:140, bg:"#F2EEFA", border:"#DED4EF" },
    { x:24, y:500, bg:"#EAF6F3", border:"#CBE5DE" },
    { x:311, y:500, bg:"#FAF4E8", border:"#EADDC3" },
  ];
  const centerX = 297.5;
  const centerY = 378;

  boxes.forEach((box, index) => {
    const item = dimensions[index];
    if (!item) return;
    doc.roundedRect(box.x, box.y, 260, 120, 8).fillAndStroke(box.bg, box.border);
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#000000").text(item?.profileTitle || item?.label || `Area ${index + 1}`, box.x + 12, box.y + 18, { width: 236, height: 30, ellipsis: true });
    doc.font("Helvetica").fontSize(9.5).fillColor("#000000").text(item?.description || "", box.x + 12, box.y + 51, { width: 236, height: 53, lineGap: 3, ellipsis: true });
    const fromX = box.x < centerX ? box.x + 260 : box.x;
    const fromY = box.y < centerY ? box.y + 120 : box.y;
    doc.save();
    doc.dash(3, { space: 3 });
    doc.moveTo(fromX, fromY).lineTo(centerX, centerY).lineWidth(1.5).strokeColor("#78A8AC").stroke();
    doc.undash();
    doc.restore();
  });

  doc.circle(centerX, centerY, 86).fill("#193B4A");
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#FFFFFF").text(isSeniorLeadershipReport(analysis) ? "Your Leadership\nResponses" : "Your Motivational\nPreferences", centerX - 66, centerY - 20, { width: 132, align: "center" });
}

function v2CardResponseStyle(response: any) {
  const raw = v2RawValue(response) || 3;
  return V2_RESPONSE_STYLES[raw];
}

function v2DrawAnswerGlancePage(doc: PDFKit.PDFDocument, analysis: any, items: any[], startIndex: number) {
  v2PageHeading(doc, `Your Answers at a Glance (Q${startIndex + 1}–${startIndex + items.length})`);
  const cardW = 267.5;
  const cardH = 117;
  const gapX = 12;
  const gapY = 12;
  const startY = 95;

  items.forEach((response: any, localIndex: number) => {
    const col = localIndex % 2;
    const row = Math.floor(localIndex / 2);
    const x = 24 + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);
    const style = v2CardResponseStyle(response);
    const responseText = response?.response || style.label;
    const dimension = response?.dimensionLabel || response?.sectionTitle || response?.sectionCode || "Response";

    doc.roundedRect(x, y, cardW, cardH, 8).lineWidth(0.7).strokeColor("#E2E7ED").stroke();
    doc.font("Helvetica").fontSize(9).fillColor("#64748B").text(`Question ${String(startIndex + localIndex + 1).padStart(2, "0")}`, x + 18, y + 13, { width: cardW - 36 });
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#243746").text(dimension, x + 18, y + 39, { width: cardW - 36, height: 16, ellipsis: true });

    const pillW = Math.min(124, Math.max(66, 14 + doc.widthOfString(responseText)));
    doc.roundedRect(x + 18, y + 58, pillW, 22, 11).fill(style.background);
    doc.circle(x + 26, y + 69, 3).fill(style.color);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(style.color).text(responseText, x + 33, y + 63, { width: pillW - 18, height: 14, ellipsis: true });

    doc.font("Helvetica").fontSize(8.6).fillColor("#243746").text(response?.questionText || "", x + 18, y + 88, { width: cardW - 36, height: 19, ellipsis: true });
  });
}

function v2DrawResponseTablePage(doc: PDFKit.PDFDocument, analysis: any, items: any[], startIndex: number) {
  v2PageHeading(doc, "Your Responses");
  const x = 24;
  const width = 547;
  const y0 = 100;
  const rowH = 31;
  const cols = { q: 30, statement: 320, dimension: 87, response: 110 };
  doc.rect(x, y0, width, 23).fill("#F1F1F1");
  doc.font("Helvetica").fontSize(6.5).fillColor("#1B2033");
  doc.text("Q", x + 8, y0 + 8, { width: cols.q - 8 });
  doc.text("Statement", x + cols.q, y0 + 8, { width: cols.statement });
  doc.text("Dimension", x + cols.q + cols.statement, y0 + 8, { width: cols.dimension });
  doc.text("Your response", x + cols.q + cols.statement + cols.dimension, y0 + 8, { width: cols.response });

  items.forEach((response: any, index: number) => {
    const y = y0 + 23 + index * rowH;
    doc.moveTo(x, y + rowH).lineTo(x + width, y + rowH).lineWidth(0.5).strokeColor("#D7D7D7").stroke();
    doc.font("Helvetica").fontSize(6.8).fillColor("#1B2033");
    doc.text(String(startIndex + index + 1), x + 8, y + 8, { width: cols.q - 8 });
    doc.text(response?.questionText || "", x + cols.q, y + 7, { width: cols.statement - 8, height: 18, ellipsis: true });
    doc.text(response?.dimensionLabel || response?.sectionTitle || response?.sectionCode || "—", x + cols.q + cols.statement, y + 7, { width: cols.dimension - 6, height: 18, ellipsis: true });
    doc.text(response?.response || "—", x + cols.q + cols.statement + cols.dimension, y + 7, { width: cols.response - 6, height: 18, ellipsis: true });
  });
}

function v2DrawPlanPage(doc: PDFKit.PDFDocument, analysis: any) {
  v2PageHeading(doc, "Your 30–60–90 Day Plan", "Turn your insights into small, practical steps over the next 90 days.");
  const cards = [
    { y: 109, h:154, pill:"Days 1–30", title:"Understand Yourself", text:"Notice which tasks you enjoy, what motivates you and when you feel most engaged. Use these observations to choose one area you would like to work on.", bg:"#F7FAFF", pillBg:"#D2E4FF", pillBorder:"#CADFFF" },
    { y: 277, h:150, pill:"Days 31–60", title:"Take Action", text:"Set a small, achievable goal based on what you learned. Try a new approach, practise it regularly and ask someone you trust for helpful feedback.", bg:"#FCFAFE", pillBg:"#F2ECFA", pillBorder:"#CFC1DD" },
    { y: 441, h:150, pill:"Days 61–90", title:"Review Your Progress", text:"Look back at what worked, what felt challenging and what you learned. Keep the habits you found useful and choose your next goal based on your progress.", bg:"#FAFDFC", pillBg:"#EAF6EF", pillBorder:"#D5FFE9" },
  ];
  cards.forEach((card) => {
    doc.roundedRect(24, card.y, 547, card.h, 8).fillAndStroke(card.bg, "#CFCFCF");
    doc.roundedRect(43, card.y + 22, 95, 30, 16).fillAndStroke(card.pillBg, card.pillBorder);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0A0D13").text(card.pill, 43, card.y + 32, { width:95, align:"center" });
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#1B2033").text(card.title, 43, card.y + 80, { width:509 });
    doc.font("Helvetica").fontSize(9.4).fillColor("#3D434D").text(card.text, 43, card.y + 103, { width:509, lineGap:2, height:36, ellipsis:true });
  });
}

function v2DrawUnderstandingPage(doc: PDFKit.PDFDocument, analysis: any) {
  v2PageHeading(doc, "Understanding Your Report");
  const x = 24;
  const width = 547;
  const sections = [
    ["What This Report Shows", "This report summarises your answers and highlights patterns in your preferences and responses. It includes explanations and practical suggestions to support reflection and development."],
    ["What This Report Does Not Measure", "Your results do not establish your abilities, job performance, leadership suitability or mental health. They should not be used to diagnose a condition or determine suitability for a job."],
    ["How to Read Your Scores", isSeniorLeadershipReport(analysis) ? "This Senior Leadership report does not apply a validated score, weighting model or decision cut-off. Review the response patterns descriptively rather than as a ranking." : "Higher percentages show stronger agreement or a more pronounced self-reported preference in that area. They do not mean better performance, and lower percentages should not automatically be treated as weaknesses."],
    ["Your Answers Have Context", "Your responses may reflect your current experiences, circumstances and interpretation of the questions. The report describes what you shared at the time of the assessment rather than a fixed definition of who you are."],
    ["Using Your Results", "Use the report to recognise preferences, explore areas of interest and choose practical steps for development. Consider the insights alongside your own experiences and feedback from people you trust."],
    ["Sources and instrument transparency", `Primary source: ANANDUM, “${v2AssessmentName(analysis)} – Assessment Result Report”, completed ${formatDateTime(analysis?.completedAt)}.`],
  ];
  let y = 116;
  for (const [title, body] of sections) {
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#1B2033").text(title, x, y, { width });
    y = doc.y + 8;
    doc.font("Helvetica").fontSize(8.8).fillColor("#303744").text(body, x, y, { width, lineGap:2 });
    y = doc.y + 15;
    doc.moveTo(x, y).lineTo(x + width, y).lineWidth(0.5).strokeColor("#E5E5E5").stroke();
    y += 16;
  }
  doc.roundedRect(24, Math.min(690, y + 4), 547, 58, 8).fill("#F8F3EB");
  doc.font("Helvetica").fontSize(7.8).fillColor("#60657C").text("CONFIDENTIAL | This computer-generated developmental report is not endorsed, signed or authored by a psychiatrist or psychologist. Do not use it as the sole basis for health, legal, personnel or other high-stakes decisions.", 38, Math.min(706, y + 20), { width:519, lineGap:2 });
}

function v2DrawDisclaimerPage(doc: PDFKit.PDFDocument, analysis: any) {
  v2PageHeading(doc, "Understanding Your Results");
  const x = 24;
  const width = 547;
  let y = 96;
  const intro = [
    "Your results represent a snapshot of your responses at the time the assessment was completed.",
    "Preferences, behaviours, motivations, and responses may change over time or vary depending on circumstances and context.",
    "This report should therefore be used as a tool for reflection and development rather than as a permanent definition of the participant.",
  ];
  for (const p of intro) {
    doc.font("Helvetica").fontSize(9).fillColor("#303744").text(p, x, y, { width, lineGap:2 });
    y = doc.y + 12;
  }
  y += 18;
  doc.moveTo(x, y).lineTo(x + width, y).lineWidth(0.5).strokeColor("#E5E5E5").stroke();
  y += 34;
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#1B2033").text("Assessment Disclaimer and Limitation of Liability", x, y, { width });
  y = doc.y + 16;
  const paragraphs = [
    "This psychometric assessment and the results contained in this report are intended for self-awareness, reflection, and personal development only.",
    "The findings are based on the participant's responses and reported state at the time of completing the assessment. Results are indicative and informational in nature and should not be interpreted as diagnostic conclusions.",
    "This assessment does not constitute, and should not be considered, a medical, psychological, psychiatric, or clinical diagnosis. It does not replace assessment, advice, diagnosis, or treatment provided by a suitably qualified professional.",
    "Assessment results reflect self-reported responses and may be influenced by the participant's interpretation of the questions, circumstances, mood, and responses at the time of testing.",
    "Fathom Marine Consultants and Anandum by Fathom do not guarantee the accuracy, completeness, suitability, or applicability of the assessment results for any specific individual, situation, or decision.",
    "To the fullest extent permitted by applicable law, Fathom Marine Consultants and Anandum by Fathom accept no liability for any decision, action, loss, or consequence arising from reliance solely on the findings contained in this report.",
    "The results should be considered as one source of information and should not be used as the sole basis for medical, psychological, employment, selection, suitability, or other high-stakes decisions.",
    "Where medical, psychological, psychiatric, or other professional advice is required, the participant should consult an appropriately qualified professional.",
  ];
  for (const p of paragraphs) {
    doc.font("Helvetica").fontSize(8.6).fillColor("#303744").text(p, x, y, { width, lineGap:1.5 });
    y = doc.y + 10;
  }
}

function buildV2ReportPages(analysis: any) {
  const responses = v2Responses(analysis);
  const pages: Array<(doc: PDFKit.PDFDocument) => void> = [];

  if (analysis?.resultKind === "MARITIME_SCORED") {
    pages.push((doc) => writeMaritimeAnalytics(doc, analysis));
    pages.push((doc) => writeResponses(doc, analysis));
    pages.push((doc) => v2DrawUnderstandingPage(doc, analysis));
    pages.push((doc) => v2DrawDisclaimerPage(doc, analysis));
    return pages;
  }

  pages.push((doc) => v2DrawInsightsPage(doc, analysis));

  if (v2HasScoredDimensions(analysis)) {
    pages.push((doc) => v2DrawDimensionsPage(doc, analysis));
  }

  for (const [index, chunk] of v2Chunks(responses, 20).entries()) {
    pages.push((doc) => v2DrawScalePlotPage(doc, analysis, chunk, index * 20));
  }

  pages.push((doc) => v2DrawResponsePatternPage(doc, analysis));

  if (v2HasScoredDimensions(analysis)) {
    pages.push((doc) => v2DrawBubbleMapPage(doc, analysis));
  }

  pages.push((doc) => v2DrawCloserLookPage(doc, analysis));

  for (const [index, chunk] of v2Chunks(responses, 10).entries()) {
    pages.push((doc) => v2DrawAnswerGlancePage(doc, analysis, chunk, index * 10));
  }

  for (const [index, chunk] of v2Chunks(responses, 20).entries()) {
    pages.push((doc) => v2DrawResponseTablePage(doc, analysis, chunk, index * 20));
  }

  pages.push((doc) => v2DrawPlanPage(doc, analysis));
  pages.push((doc) => v2DrawUnderstandingPage(doc, analysis));
  pages.push((doc) => v2DrawDisclaimerPage(doc, analysis));
  return pages;
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
                24,

              right:
                24,
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

        // Cover is deliberately excluded from visible page numbering.
        v2DrawCover(
          document,
          analysis
        );

        const pages =
          buildV2ReportPages(
            analysis
          );

        const totalPages =
          pages.length;

        pages.forEach(
          (
            render,
            index
          ) => {
            v2AddContentPage(
              document,
              analysis
            );

            render(
              document
            );

            v2Footer(
              document,
              index + 1,
              totalPages
            );
          }
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
