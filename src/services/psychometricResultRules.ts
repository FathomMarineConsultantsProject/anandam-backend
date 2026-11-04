import {
  PsychometricTestType,
} from "@prisma/client";


type ResultRange =
  | "VERY_LOW"
  | "LOW"
  | "BALANCED"
  | "STRONG"
  | "VERY_HIGH";


type DimensionRule = {
  label: string;

  displayLabels: Record<
    ResultRange,
    string
  >;

  highInterpretation: string;

  lowInterpretation: string;
};


function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}


function rangeFromRawScore(
  rawScore: number
): ResultRange {
  if (
    rawScore <= 7
  ) {
    return "VERY_LOW";
  }

  if (
    rawScore <= 10
  ) {
    return "LOW";
  }

  if (
    rawScore <= 13
  ) {
    return "BALANCED";
  }

  if (
    rawScore <= 16
  ) {
    return "STRONG";
  }

  return "VERY_HIGH";
}


export function getLikertBand(
  rawScore: number
) {
  if (
    rawScore <= 7
  ) {
    return "Less Pronounced";
  }

  if (
    rawScore <= 10
  ) {
    return "Moderate-Low";
  }

  if (
    rawScore <= 13
  ) {
    return "Balanced";
  }

  if (
    rawScore <= 16
  ) {
    return "Strong";
  }

  return "Highly Pronounced";
}


/* ======================================================
   BIG FIVE
   ====================================================== */

const BIG_FIVE_RULES:
  Record<
    string,
    DimensionRule
  > = {
  OPENNESS: {
    label:
      "Openness",

    displayLabels: {
      VERY_LOW:
        "Consistency Focused",

      LOW:
        "Practical & Established",

      BALANCED:
        "Practical Explorer",

      STRONG:
        "Curious & Flexible",

      VERY_HIGH:
        "Explorer & Innovator",
    },

    highInterpretation:
      "Enjoys new ideas, unfamiliar perspectives and experimentation.",

    lowInterpretation:
      "Prefers familiar, proven and practical approaches.",
  },


  CONSCIENTIOUSNESS: {
    label:
      "Conscientiousness",

    displayLabels: {
      VERY_LOW:
        "Spontaneous Operator",

      LOW:
        "Adaptive Worker",

      BALANCED:
        "Flexible Organizer",

      STRONG:
        "Reliable Planner",

      VERY_HIGH:
        "Structured Achiever",
    },

    highInterpretation:
      "Shows planning, reliability, persistence and organization.",

    lowInterpretation:
      "Prefers flexibility and spontaneity over rigid structure.",
  },


  EXTRAVERSION: {
    label:
      "Extraversion",

    displayLabels: {
      VERY_LOW:
        "Independent Reflector",

      LOW:
        "Reflective Contributor",

      BALANCED:
        "Socially Flexible",

      STRONG:
        "Engaged Communicator",

      VERY_HIGH:
        "Social Energizer",
    },

    highInterpretation:
      "Gains energy from interaction and active collaboration.",

    lowInterpretation:
      "Prefers quieter environments, focused interaction or independent work.",
  },


  AGREEABLENESS: {
    label:
      "Agreeableness",

    displayLabels: {
      VERY_LOW:
        "Independent Evaluator",

      LOW:
        "Objective Challenger",

      BALANCED:
        "Cooperative but Independent",

      STRONG:
        "Cooperative Partner",

      VERY_HIGH:
        "Collaborative Supporter",
    },

    highInterpretation:
      "Emphasizes cooperation, empathy, trust and support.",

    lowInterpretation:
      "Shows greater independence, directness and willingness to challenge consensus.",
  },


  EMOTIONAL_STABILITY: {
    label:
      "Emotional Stability",

    displayLabels: {
      VERY_LOW:
        "Stress Sensitive",

      LOW:
        "Emotionally Responsive",

      BALANCED:
        "Responsive & Grounded",

      STRONG:
        "Steady Under Pressure",

      VERY_HIGH:
        "Calm & Resilient",
    },

    highInterpretation:
      "Tends to remain composed and recover effectively under pressure.",

    lowInterpretation:
      "May react more strongly to stress, frustration or uncertainty.",
  },
};


/* ======================================================
   WORKPLACE / BEHAVIOURAL
   ====================================================== */

const BEHAVIOURAL_RULES:
  Record<
    string,
    DimensionRule
  > = {
  ANALYTICAL_REFLECTIVE_THINKING: {
    label:
      "Analytical & Reflective Thinking",

    displayLabels: {
      VERY_LOW:
        "Action-First Thinker",

      LOW:
        "Practical Processor",

      BALANCED:
        "Balanced Thinker",

      STRONG:
        "Evidence-Led Solver",

      VERY_HIGH:
        "Deep Analytical Thinker",
    },

    highInterpretation:
      "Shows an evidence-led, reflective approach and interest in understanding underlying causes.",

    lowInterpretation:
      "Shows a faster, practical and action-first processing style.",
  },


  ASSERTIVENESS_SOCIAL_CONFIDENCE: {
    label:
      "Assertiveness & Social Confidence",

    displayLabels: {
      VERY_LOW:
        "Low-Profile Contributor",

      LOW:
        "Reserved Contributor",

      BALANCED:
        "Situationally Assertive",

      STRONG:
        "Assertive Contributor",

      VERY_HIGH:
        "Confident Influencer",
    },

    highInterpretation:
      "Shows comfort speaking up, presenting ideas and taking direction-setting roles.",

    lowInterpretation:
      "Shows a preference for reserved or lower-profile participation.",
  },


  ADAPTABILITY_OPENNESS_CHANGE: {
    label:
      "Adaptability & Openness to Change",

    displayLabels: {
      VERY_LOW:
        "Strong Routine Preference",

      LOW:
        "Predictability Oriented",

      BALANCED:
        "Selectively Adaptive",

      STRONG:
        "Adaptive & Flexible",

      VERY_HIGH:
        "Highly Change-Ready",
    },

    highInterpretation:
      "Shows comfort with change and questioning established approaches when appropriate.",

    lowInterpretation:
      "Shows a stronger preference for predictability and proven methods.",
  },


  INDEPENDENT_SELF_DIRECTED: {
    label:
      "Independent & Self-Directed Style",

    displayLabels: {
      VERY_LOW:
        "Structure & Support Seeking",

      LOW:
        "Guidance-Oriented",

      BALANCED:
        "Flexible Ownership Style",

      STRONG:
        "Independent Decision Maker",

      VERY_HIGH:
        "Highly Self-Directed",
    },

    highInterpretation:
      "Shows comfort with autonomy, incomplete information and independent responsibility.",

    lowInterpretation:
      "Shows a stronger preference for guidance, structure and clearer support.",
  },


  EMOTIONAL_COMPOSURE_SENSITIVITY: {
    label:
      "Emotional Composure & Interpersonal Sensitivity",

    displayLabels: {
      VERY_LOW:
        "Highly Sensitive Responder",

      LOW:
        "Emotionally Responsive",

      BALANCED:
        "Balanced Responder",

      STRONG:
        "Diplomatic & Steady",

      VERY_HIGH:
        "Composed & Perceptive",
    },

    highInterpretation:
      "Shows diplomacy, attentiveness and comparative resilience to distraction or criticism.",

    lowInterpretation:
      "Shows greater emotional responsiveness to environmental or evaluative pressure.",
  },
};


/* ======================================================
   MOTIVATION & VALUES
   ====================================================== */

const MOTIVATION_RULES:
  Record<
    string,
    DimensionRule
  > = {
  GROWTH_ACHIEVEMENT: {
    label:
      "Achievement & Growth",

    displayLabels: {
      VERY_LOW:
        "Alternative-Motivation Focused",

      LOW:
        "Moderately Achievement Focused",

      BALANCED:
        "Progress Oriented",

      STRONG:
        "Achievement Driven",

      VERY_HIGH:
        "Highly Achievement Driven",
    },

    highInterpretation:
      "Motivated by progress, challenging goals, feedback, advancement and recognition.",

    lowInterpretation:
      "Achievement and recognition appear to be less dominant motivators compared with other priorities.",
  },


  AUTONOMY_LEADERSHIP: {
    label:
      "Autonomy & Influence",

    displayLabels: {
      VERY_LOW:
        "Structure-Oriented Contributor",

      LOW:
        "Supported Contributor",

      BALANCED:
        "Independent Collaborator",

      STRONG:
        "Independent Influencer",

      VERY_HIGH:
        "Autonomous Leader",
    },

    highInterpretation:
      "Values freedom, ownership, leadership opportunities and influence over important decisions.",

    lowInterpretation:
      "Shows a stronger preference for structure, support and shared responsibility.",
  },


  COLLABORATION_RELATIONSHIPS: {
    label:
      "Connection & Contribution",

    displayLabels: {
      VERY_LOW:
        "Task-Centred Contributor",

      LOW:
        "Independent Contributor",

      BALANCED:
        "Flexible Team Contributor",

      STRONG:
        "Collaborative Contributor",

      VERY_HIGH:
        "People-Centred Collaborator",
    },

    highInterpretation:
      "Places strong value on relationships, support, mentoring and shared team goals.",

    lowInterpretation:
      "Shows a stronger task or independently focused orientation.",
  },


  STABILITY_WELLBEING: {
    label:
      "Stability & Well-Being",

    displayLabels: {
      VERY_LOW:
        "High Change Tolerance",

      LOW:
        "Opportunity Oriented",

      BALANCED:
        "Balanced Stability Preference",

      STRONG:
        "Stability Focused",

      VERY_HIGH:
        "Security & Balance Oriented",
    },

    highInterpretation:
      "Values security, balance, clear expectations and organizational support for wellbeing.",

    lowInterpretation:
      "Shows greater tolerance for uncertainty, change and less structured working conditions.",
  },


  PURPOSE_ETHICS: {
    label:
      "Purpose & Values",

    displayLabels: {
      VERY_LOW:
        "Practical Outcome Focus",

      LOW:
        "Outcome-Focused Professional",

      BALANCED:
        "Pragmatic Purpose Seeker",

      STRONG:
        "Values-Led Contributor",

      VERY_HIGH:
        "Purpose-Driven Contributor",
    },

    highInterpretation:
      "Places strong value on ethical alignment, meaningful work and positive social or environmental impact.",

    lowInterpretation:
      "Shows a more practical, outcome-focused approach to work motivation.",
  },
};


function getRules(
  testType:
    PsychometricTestType
) {
  switch (
    testType
  ) {
    case PsychometricTestType.BIG_FIVE:
      return BIG_FIVE_RULES;

    case PsychometricTestType.PERSONALITY_16PF:
      return BEHAVIOURAL_RULES;

    case PsychometricTestType.MOTIVATION_VALUES:
      return MOTIVATION_RULES;

    default:
      return {};
  }
}


export function getLikertDimensionLabel(
  testType:
    PsychometricTestType,
  key: string
) {
  return (
    getRules(
      testType
    )[key]?.label ||
    key
      .replace(
        /_/g,
        " "
      )
      .toLowerCase()
      .replace(
        /\b\w/g,
        (
          character
        ) =>
          character.toUpperCase()
      )
  );
}


export function getLikertDimensionResult(
  testType:
    PsychometricTestType,
  key: string,
  rawScore: number
) {
  const safeRaw =
    clamp(
      rawScore,
      4,
      20
    );


  const percentage =
    (
      (
        safeRaw -
        4
      ) /
      16
    ) *
    100;


  const range =
    rangeFromRawScore(
      safeRaw
    );


  const rule =
    getRules(
      testType
    )[key];


  const band =
    getLikertBand(
      safeRaw
    );


  let description =
    "This result reflects a self-reported preference shown in your responses.";


  if (rule) {
    if (
      range ===
        "VERY_LOW" ||
      range ===
        "LOW"
    ) {
      description =
        rule.lowInterpretation;
    } else if (
      range ===
      "BALANCED"
    ) {
      description =
        "Your responses show a balanced preference in this area; behaviour may vary with situation, role and context.";
    } else {
      description =
        rule.highInterpretation;
    }
  }


  return {
    key,

    label:
      rule?.label ||
      getLikertDimensionLabel(
        testType,
        key
      ),

    rawScore:
      safeRaw,

    maxRawScore:
      20,

    percentage:
      Math.round(
        percentage *
        100
      ) /
      100,

    level:
      band,

    band,

    profileTitle:
      rule
        ?.displayLabels[
          range
        ] ||
      getLikertDimensionLabel(
        testType,
        key
      ),

    description,
  };
}


/* ======================================================
   MARITIME
   ====================================================== */

type MaritimeCode =
  | "PJS"
  | "PLA"
  | "SHF";


const MARITIME_CAPABILITIES = {
  PJS: {
    key:
      "judgementProblemSolving",

    label:
      "Judgement & Problem-Solving",

    results: {
      "0-1": {
        title:
          "Needs Stronger Decision Foundations",

        text:
          "Your responses suggest that practical reasoning and judgement need substantial strengthening. Focus on checking information carefully, following controlled procedures and seeking clarification before acting.",
      },

      "2": {
        title:
          "Developing Practical Judgement",

        text:
          "You show some sound reasoning, but consistency varies. More practice with calculations, detail checking, procedural decisions and risk-based choices would strengthen performance.",
      },

      "3": {
        title:
          "Mixed Decision Pattern",

        text:
          "You can identify several appropriate actions, but the response pattern is inconsistent. Applying the same standard of checking, verification and escalation across situations would improve reliability.",
      },

      "4": {
        title:
          "Competent Practical Judgement",

        text:
          "You generally interpret information correctly and make sensible decisions. Your profile shows a good base in structured problem-solving, procedural awareness and responsible action.",
      },

      "5": {
        title:
          "Strong Practical Judgement",

        text:
          "You demonstrate strong reasoning, attention to detail and responsible decision-making across most sampled situations, including recognising discrepancies and avoiding unsafe shortcuts.",
      },

      "6": {
        title:
          "Highly Strong Practical Judgement",

        text:
          "You consistently selected the strongest response across the sampled scenarios, indicating excellent practical reasoning, procedural discipline and professional judgement.",
      },
    },
  },


  PLA: {
    key:
      "leadershipTeamDecisionMaking",

    label:
      "Leadership & Team Decision-Making",

    results: {
      "0-1": {
        title:
          "Leadership Capability Needs Development",

        text:
          "Your responses indicate that leadership decisions, role clarity and team coordination need significant strengthening, especially where safety, communication and accountability are involved.",
      },

      "2": {
        title:
          "Developing Leadership Judgement",

        text:
          "You demonstrate some effective leadership choices, but need more consistency in delegation, communication, risk ownership and team support.",
      },

      "3": {
        title:
          "Emerging Team Leadership",

        text:
          "Your leadership pattern is mixed. You recognise several good practices, while some situations suggest a need for clearer prioritisation, communication or follow-through.",
      },

      "4": {
        title:
          "Competent Team Leadership",

        text:
          "You generally demonstrate sound leadership judgement, including clear communication, structured decision-making and appropriate coordination of people and resources.",
      },

      "5": {
        title:
          "Strong Leadership & Coordination",

        text:
          "You show strong leadership across most situations, including risk ownership, effective delegation, communication, coaching and fair treatment.",
      },

      "6": {
        title:
          "Highly Strong Leadership & Coordination",

        text:
          "You consistently demonstrate excellent leadership judgement, team coordination and accountability across the sampled scenarios.",
      },
    },
  },


  SHF: {
    key:
      "safetyHumanFactors",

    label:
      "Safety Awareness & Human Factors",

    results: {
      "0-1": {
        title:
          "Safety Awareness Needs Immediate Development",

        text:
          "Your responses show important gaps in recognising hazards and selecting safe controls. Priority development should focus on stopping unsafe work, emergency actions, fatigue awareness and verified barriers.",
      },

      "2": {
        title:
          "Developing Safety Awareness",

        text:
          "You identify some safe responses but not consistently. More practice is recommended in hazard recognition, human-factor risks, emergency procedures and control verification.",
      },

      "3": {
        title:
          "Mixed Safety Response Pattern",

        text:
          "You demonstrate awareness in several situations, but the pattern is inconsistent. Strengthening systematic hazard checks and disciplined response to abnormal conditions would improve reliability.",
      },

      "4": {
        title:
          "Competent Safety Awareness",

        text:
          "You generally recognise hazards and select appropriate safety controls. Your responses suggest a solid understanding of safe work, vigilance and emergency priorities.",
      },

      "5": {
        title:
          "Strong Safety Awareness",

        text:
          "You consistently identify sound safety actions across most scenarios, including stopping work, verifying controls, managing fatigue or distraction and responding appropriately to emergencies.",
      },

      "6": {
        title:
          "Highly Strong Safety Awareness",

        text:
          "You demonstrate excellent safety judgement across the sampled set, with strong recognition of hazards, human-factor risks, emergency priorities and learning behaviours.",
      },
    },
  },
} as const;


function maritimeBand(
  rawScore: number
) {
  switch (
    rawScore
  ) {
    case 0:
      return "Critical Development Need";

    case 1:
      return "Major Development Need";

    case 2:
      return "Developing";

    case 3:
      return "Emerging / Mixed";

    case 4:
      return "Competent";

    case 5:
      return "Strong";

    default:
      return "Highly Strong";
  }
}


export function getMaritimeCapabilityResult(
  sectionCode: string,
  score: number
) {
  const code =
    sectionCode as
      MaritimeCode;


  const definition =
    MARITIME_CAPABILITIES[
      code
    ];


  const safeScore =
    clamp(
      score,
      0,
      6
    );


  const lookupKey =
    safeScore <=
    1
      ? "0-1"
      : String(
          safeScore
        );


  const result =
    definition
      ?.results[
        lookupKey as
          keyof typeof definition.results
      ];


  return {
    key:
      definition?.key ||
      "maritimeCapability",

    label:
      definition?.label ||
      "Maritime Capability",

    score:
      safeScore,

    maxScore:
      6,

    percentage:
      Math.round(
        (
          safeScore /
          6
        ) *
        100
      ),

    band:
      maritimeBand(
        safeScore
      ),

    level:
      maritimeBand(
        safeScore
      ),

    resultTitle:
      result?.title ||
      "Maritime Capability Result",

    resultText:
      result?.text ||
      "This result reflects your responses across the sampled maritime scenarios.",
  };
}


export function getMaritimeOverallResult(
  score: number
) {
  const safeScore =
    clamp(
      score,
      0,
      18
    );


  const percentage =
    Math.round(
      (
        safeScore /
        18
      ) *
      100
    );


  if (
    safeScore <=
    4
  ) {
    return {
      raw:
        safeScore,

      max:
        18,

      percentage,

      title:
        "Critical Development Priority",

      summary:
        "Your responses indicate that several of the sampled maritime judgement, leadership and safety situations would benefit from structured development and guided practice.",
    };
  }


  if (
    safeScore <=
    7
  ) {
    return {
      raw:
        safeScore,

      max:
        18,

      percentage,

      title:
        "Developing Foundation",

      summary:
        "Your responses show some effective choices alongside important areas where greater consistency and guided practice would strengthen performance.",
    };
  }


  if (
    safeScore <=
    10
  ) {
    return {
      raw:
        safeScore,

      max:
        18,

      percentage,

      title:
        "Emerging Capability",

      summary:
        "Your responses show an emerging maritime performance profile, with a mix of sound decisions and areas where greater consistency would help.",
    };
  }


  if (
    safeScore <=
    13
  ) {
    return {
      raw:
        safeScore,

      max:
        18,

      percentage,

      title:
        "Competent Maritime Performance",

      summary:
        "Your responses indicate a competent overall foundation across the sampled judgement, leadership and safety scenarios.",
    };
  }


  if (
    safeScore <=
    16
  ) {
    return {
      raw:
        safeScore,

      max:
        18,

      percentage,

      title:
        "Strong Maritime Performance",

      summary:
        "Your responses indicate strong practical judgement, reliable safety awareness and generally effective leadership decisions across the sampled scenarios.",
    };
  }


  return {
    raw:
      safeScore,

    max:
      18,

    percentage,

    title:
      "Highly Strong Maritime Performance",

    summary:
      "Your responses indicate highly strong performance across the sampled practical judgement, leadership and safety scenarios.",
  };
}


export function readableSubskill(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return null;
  }


  const cleaned =
    value.trim();


  /*
    Suppress internal short codes such as
    PJSD / PLSC / etc.
  */

  if (
    /^[A-Z0-9]{2,8}$/.test(
      cleaned
    )
  ) {
    return null;
  }


  return cleaned
    .replace(
      /_/g,
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        character
      ) =>
        character.toUpperCase()
    );
}