"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateWorkRestSummary = void 0;
const BLOCK_HOURS = 0.5;
const calculateWorkRestSummary = (statusBlocks) => {
    const workBlocks = statusBlocks.filter((status) => status === "WORK").length;
    const restBlocks = statusBlocks.filter((status) => status === "REST").length;
    const mealBlocks = statusBlocks.filter((status) => status === "MEAL").length;
    const unrecordedBlocks = statusBlocks.filter((status) => status === "UNRECORDED").length;
    const hoursWorked = workBlocks * BLOCK_HOURS;
    const restHours = restBlocks * BLOCK_HOURS;
    const mealHours = mealBlocks * BLOCK_HOURS;
    const unrecordedHours = unrecordedBlocks * BLOCK_HOURS;
    return {
        hoursWorked,
        restHours,
        mealHours,
        unrecordedHours,
        recordedHours: 24 - unrecordedHours,
        /*
          We will replace this section with the real
          MLC 2.3 rule engine when you send the rules.
        */
        compliance: {
            evaluated: false,
            complianceRate: null,
            violationCount: null,
            violations: [],
            requirements: [],
            remarks: [
                "MLC compliance rules have not yet been configured.",
            ],
        },
    };
};
exports.calculateWorkRestSummary = calculateWorkRestSummary;
