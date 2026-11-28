/**
 * Work/rest screening from recorded 30-minute IST slots.
 *
 * IMPORTANT: MLC 2006 A2.3 permits national implementation based on either
 * maximum work OR minimum rest. This dashboard screens BOTH families of limits
 * conservatively; individual flag-state rules, authorized exceptions, and
 * compensatory rest must be assessed separately by the responsible officer.
 *
 * Missing time is UNKNOWN, never assumed to be rest or work. MEAL is treated as
 * a short break, not qualifying REST. To count longer breaks as rest, users
 * must explicitly record them as REST.
 *
 * One violation per breached rule is reported, not one per overlapping window.
 */

const SLOTS_PER_DAY = 48;
const SLOTS_PER_WEEK = SLOTS_PER_DAY * 7;
const HALF_HOUR_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;

export type GridStatus = "WORK" | "REST" | "MEAL" | "UNRECORDED";
export type ComplianceStatus = "COMPLIANT" | "NON_COMPLIANT" | "INCOMPLETE";

export interface StoredWorkDay {
  date: Date | string;
  statusBlocks: string[];
}

export interface ComplianceViolation {
  code: string;
  label: string;
  message: string;
  windowStart: string;
  windowEnd: string;
  observedHours?: number;
  limitHours?: number;
}

export interface RollingComplianceSummary {
  hoursWorked: number;
  workHours: number;
  restRecorded: number;
  restHours: number;
  mealHours: number;
  unrecordedHours: number;
  violationCount: number;
  violations: ComplianceViolation[];
  complianceRate: number | null;
  complianceStatus: ComplianceStatus;
  isCompliant: boolean | null;
  incompleteRecord: boolean;
  missingElapsedSlots: number;
  fullyRecorded24hWindows: number;
  fullyRecorded7DayWindows: number;
  checked24hWindows: number;
  checked7DayWindows: number;
  passed24hWindows: number;
  passed7DayWindows: number;
  periodTimeZone: string;
}

function safeStatus(value: unknown): GridStatus {
  if (value === "WORK" || value === "REST" || value === "MEAL") return value;
  // MANUAL_UNRECORDED (internal DB marker) is explicitly NOT rest.
  return "UNRECORDED";
}

export function normalizeRecordedSlots(value: unknown): GridStatus[] {
  if (!Array.isArray(value) || value.length !== SLOTS_PER_DAY) {
    return Array<GridStatus>(SLOTS_PER_DAY).fill("UNRECORDED");
  }
  return value.map(safeStatus);
}

function logicalDateKey(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function dayKeyByOffset(key: string, amount: number): string {
  const timestamp = new Date(`${key}T00:00:00.000Z`).getTime();
  return new Date(timestamp + amount * DAY_MS).toISOString().slice(0, 10);
}

function longestRun(slots: GridStatus[], accepts: (status: GridStatus) => boolean): number {
  let longest = 0;
  let current = 0;
  for (const slot of slots) {
    if (accepts(slot)) {
      current += 1;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }
  return longest;
}

function countConfirmedRestPeriodStarts(slots: GridStatus[], from: number, until: number): number {
  let starts = 0;
  for (let index = from; index < until; index += 1) {
    if (slots[index] !== "REST") continue;
    // The first visible slot might be mid-rest; if prior state is unknown,
    // do not claim we observed a new separate rest period.
    if (index > 0 && slots[index - 1] !== "REST" && slots[index - 1] !== "UNRECORDED") starts += 1;
  }
  return starts;
}

function count(slots: GridStatus[], status: GridStatus): number {
  let total = 0;
  for (const slot of slots) if (slot === status) total += 1;
  return total;
}

/**
 * Evaluates every elapsed half-hour end point WITHIN selectedDate, using
 * earlier records for rolling windows. Also catches definite overwork while
 * some earlier time is unrecorded. Never treats missing data as compliance.
 */
export function calculateRollingWorkRestSummary(
  selectedDate: Date | string,
  records: StoredWorkDay[],
  now: Date = new Date(),
  selectedDayOverride?: string[],
): RollingComplianceSummary {
  const selectedKey = logicalDateKey(selectedDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedKey)) {
    throw new Error("Invalid selected work/rest date");
  }

  const recordMap = new Map<string, GridStatus[]>();
  for (const record of records) {
    recordMap.set(logicalDateKey(record.date), normalizeRecordedSlots(record.statusBlocks));
  }
  if (selectedDayOverride) {
    recordMap.set(selectedKey, normalizeRecordedSlots(selectedDayOverride));
  }

  const selectedBlocks = recordMap.get(selectedKey) ?? normalizeRecordedSlots(null);
  const timeline: GridStatus[] = [];
  // Day indexes: 0..6 are the seven preceding calendar days; 7 is the selected day.
  for (let offset = -7; offset <= 0; offset += 1) {
    timeline.push(...(recordMap.get(dayKeyByOffset(selectedKey, offset)) ?? normalizeRecordedSlots(null)));
  }

  // Each calendar day uses 00:00-24:00 IST, represented in DB as UTC-midnight keys.
  const selectedDayUtc = new Date(`${selectedKey}T00:00:00.000Z`).getTime();
  const selectedActualStart = selectedDayUtc - IST_OFFSET_MS;
  const elapsedSlots = Math.max(
    0,
    Math.min(SLOTS_PER_DAY, Math.floor((now.getTime() - selectedActualStart) / HALF_HOUR_MS)),
  );
  const selectedStartIndex = SLOTS_PER_WEEK;

  const violatedRules = new Map<string, ComplianceViolation>();
  let fullyRecorded24hWindows = 0;
  let fullyRecorded7DayWindows = 0;
  let checked24hWindows = 0;
  let checked7DayWindows = 0;
  let passed24hWindows = 0;
  let passed7DayWindows = 0;

  function flag(
    code: string,
    label: string,
    message: string,
    startTick: number,
    endTick: number,
    observedHours?: number,
    limitHours?: number,
  ): void {
    if (violatedRules.has(code)) return;
    // Timeline index 0 begins 7 days before 00:00 of selected day (IST).
    const timelineStart = selectedActualStart - 7 * DAY_MS;
    violatedRules.set(code, {
      code,
      label,
      message,
      windowStart: new Date(timelineStart + startTick * HALF_HOUR_MS).toISOString(),
      windowEnd: new Date(timelineStart + endTick * HALF_HOUR_MS).toISOString(),
      ...(observedHours === undefined ? {} : { observedHours }),
      ...(limitHours === undefined ? {} : { limitHours }),
    });
  }

  for (let i = 1; i <= elapsedSlots; i += 1) {
    const endTick = selectedStartIndex + i;
    const dayWindow = timeline.slice(endTick - SLOTS_PER_DAY, endTick);
    const sevenDayWindow = timeline.slice(endTick - SLOTS_PER_WEEK, endTick);
    checked24hWindows += 1;
    checked7DayWindows += 1;

    const work24Slots = count(dayWindow, "WORK");
    const rest24Slots = count(dayWindow, "REST");
    const unknown24Slots = count(dayWindow, "UNRECORDED");
    const complete24 = unknown24Slots === 0;
    if (complete24) {
      fullyRecorded24hWindows += 1;
      if (work24Slots <= 28 && rest24Slots >= 20 &&
          longestRun(dayWindow, status => status === "WORK" || status === "MEAL") <= 28) {
        passed24hWindows += 1;
      }
    }

    if (work24Slots > 28) {
      flag("WORK_24H", "Over 14 hours work in 24 hours",
        `Recorded ${work24Slots / 2} hours work in a rolling 24-hour period (limit: 14 hours).`,
        endTick - SLOTS_PER_DAY, endTick, work24Slots / 2, 14);
    }
    // Even treating every unknown slot as possible rest, this window cannot meet 10h.
    if (rest24Slots + unknown24Slots < 20) {
      flag("REST_24H", "Less than 10 hours rest in 24 hours",
        `The recorded and still-possible rest totals less than 10 hours in a rolling 24-hour period.`,
        endTick - SLOTS_PER_DAY, endTick, rest24Slots / 2, 10);
    }

    // Period-structure checks need care at sliding-window boundaries.
    // A genuine 6-hour rest may straddle midnight; checking ONLY the
    // clipped portion of every rolling window would incorrectly flag a
    // compliant long rest as multiple short rests. Evaluate the completed
    // selected calendar day conservatively and allow an unknown extension
    // at the next midnight (we have not loaded the following day).
    if (i === SLOTS_PER_DAY && complete24) {
      const preceding12 = timeline.slice(endTick - SLOTS_PER_DAY - 12, endTick - SLOTS_PER_DAY);
      const following12 = (recordMap.get(dayKeyByOffset(selectedKey, 1)) ??
        Array<GridStatus>(SLOTS_PER_DAY).fill("UNRECORDED")).slice(0, 12);
      const longestConfirmed = longestRun(dayWindow, s => s === "REST");
      // Boundary extensions are possible only when a REST period actually
      // touches that boundary. Unknown time alone must NOT invent six hours.
      const possibleFromBefore = dayWindow[0] === "REST" &&
        longestRun([...preceding12, ...dayWindow.slice(0, 12)], s =>
          s === "REST" || s === "UNRECORDED") >= 12;
      const possibleAfter = dayWindow[47] === "REST" &&
        longestRun([...dayWindow.slice(-12), ...following12], s =>
          s === "REST" || s === "UNRECORDED") >= 12;
      if (longestConfirmed < 12 && !possibleFromBefore && !possibleAfter) {
        flag("REST_CONTINUOUS_6H", "No continuous six-hour rest period",
          "No qualifying continuous six-hour rest period is possible from the recorded daily pattern.",
          endTick - SLOTS_PER_DAY, endTick, longestConfirmed / 2, 6);
      }
      if (countConfirmedRestPeriodStarts(timeline, endTick - SLOTS_PER_DAY, endTick) > 2) {
        flag("REST_TOO_MANY_PERIODS", "Rest divided into more than two periods",
          "The recorded day contains more than two separate rest-period starts.",
          endTick - SLOTS_PER_DAY, endTick);
      }
    }

    if (longestRun(dayWindow, s => s === "WORK" || s === "MEAL") > 28) {
      flag("REST_GAP_14H", "More than 14 hours between rest periods",
        "A recorded interval without qualifying rest exceeds 14 continuous hours.",
        endTick - SLOTS_PER_DAY, endTick);
    }

    const work7Slots = count(sevenDayWindow, "WORK");
    const rest7Slots = count(sevenDayWindow, "REST");
    const unknown7Slots = count(sevenDayWindow, "UNRECORDED");
    if (unknown7Slots === 0) {
      fullyRecorded7DayWindows += 1;
      if (work7Slots <= 144 && rest7Slots >= 154) passed7DayWindows += 1;
    }

    if (work7Slots > 144) {
      flag("WORK_7D", "Over 72 hours work in seven days",
        `Recorded ${work7Slots / 2} hours work within a rolling seven-day period (limit: 72 hours).`,
        endTick - SLOTS_PER_WEEK, endTick, work7Slots / 2, 72);
    }
    if (rest7Slots + unknown7Slots < 154) {
      flag("REST_7D", "Less than 77 hours rest in seven days",
        "Even with all unrecorded time treated as possible rest, the seven-day period cannot reach 77 hours.",
        endTick - SLOTS_PER_WEEK, endTick, rest7Slots / 2, 77);
    }
  }

  const violations = [...violatedRules.values()];
  const incompleteRecord =
    elapsedSlots < SLOTS_PER_DAY ||
    fullyRecorded24hWindows !== checked24hWindows ||
    fullyRecorded7DayWindows !== checked7DayWindows ||
    checked24hWindows === 0;
  const complianceStatus: ComplianceStatus = violations.length
    ? "NON_COMPLIANT"
    : incompleteRecord
      ? "INCOMPLETE"
      : "COMPLIANT";

  // Percentage of evaluable rolling windows passing quantitative limits.
  // This is a SCREENING metric, not a certificate of flag-State compliance.
  // An unresolved window is never included as a pass.
  const evaluatedWindows = fullyRecorded24hWindows + fullyRecorded7DayWindows;
  const passedWindows = passed24hWindows + passed7DayWindows;
  const screenedRate = evaluatedWindows > 0
    ? Math.round((passedWindows / evaluatedWindows) * 100)
    : violations.length > 0 ? 0 : null;

  return {
    hoursWorked: count(selectedBlocks, "WORK") / 2,
    workHours: count(selectedBlocks, "WORK") / 2,
    restRecorded: count(selectedBlocks, "REST") / 2,
    restHours: count(selectedBlocks, "REST") / 2,
    mealHours: count(selectedBlocks, "MEAL") / 2,
    unrecordedHours: count(selectedBlocks, "UNRECORDED") / 2,
    violationCount: violations.length,
    violations,
    complianceRate: screenedRate,
    complianceStatus,
    isCompliant: complianceStatus === "COMPLIANT" ? true : complianceStatus === "NON_COMPLIANT" ? false : null,
    incompleteRecord,
    missingElapsedSlots: count(selectedBlocks.slice(0, elapsedSlots), "UNRECORDED"),
    fullyRecorded24hWindows,
    fullyRecorded7DayWindows,
    checked24hWindows,
    checked7DayWindows,
    passed24hWindows,
    passed7DayWindows,
    periodTimeZone: "Asia/Kolkata",
  };
}
