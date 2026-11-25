"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCompletedPsychometricResultEmail = sendCompletedPsychometricResultEmail;
exports.sendCompletedPsychometricResultEmailSafely = sendCompletedPsychometricResultEmailSafely;
const client_1 = require("@prisma/client");
const psychometricReport_service_1 = require("./psychometricReport.service");
const mailer_1 = require("../utils/mailer");
const prisma = new client_1.PrismaClient();
const RESULTS_EMAIL = process.env.PSYCHOMETRIC_RESULTS_EMAIL ||
    "contact@fathommarineconsultants.com";
const CURRENT_EMAIL_DISCLOSURE_VERSION = "1.1";
async function sendCompletedPsychometricResultEmail(userId, attemptId) {
    const attempt = await prisma.psychometricAttempt.findFirst({
        where: {
            id: attemptId,
            userId,
            status: client_1.PsychometricAttemptStatus.COMPLETED,
        },
        select: {
            id: true,
            attemptNumber: true,
            completedAt: true,
            test: {
                select: {
                    title: true,
                },
            },
            disclaimerAcknowledgement: {
                select: {
                    accepted: true,
                    disclaimerVersion: true,
                },
            },
            user: {
                select: {
                    fullName: true,
                    email: true,
                },
            },
        },
    });
    if (!attempt) {
        throw new Error("Completed psychometric attempt not found for result email.");
    }
    /*
      Do not silently email an old assessment whose participant
      accepted a disclaimer that did not yet disclose automatic
      sharing of the completed report.
    */
    if (!attempt.disclaimerAcknowledgement?.accepted ||
        attempt.disclaimerAcknowledgement
            .disclaimerVersion !==
            CURRENT_EMAIL_DISCLOSURE_VERSION) {
        console.warn("Psychometric result email skipped because the current sharing disclosure was not acknowledged:", {
            attemptId,
            disclaimerVersion: attempt.disclaimerAcknowledgement
                ?.disclaimerVersion ||
                null,
        });
        return {
            sent: false,
            skipped: true,
            reason: "EMAIL_DISCLOSURE_NOT_ACKNOWLEDGED",
        };
    }
    const report = await (0, psychometricReport_service_1.generatePsychometricReport)(userId, attemptId);
    const participantName = attempt.user.fullName?.trim() ||
        "Anandam Participant";
    const participantEmail = attempt.user.email;
    const assessmentTitle = attempt.test.title ||
        report.analysis?.test?.title ||
        "Psychometric Assessment";
    const completedAt = attempt.completedAt ||
        report.analysis?.completedAt ||
        new Date();
    const info = await (0, mailer_1.sendPsychometricResultEmail)({
        to: RESULTS_EMAIL,
        participantName,
        participantEmail,
        assessmentTitle,
        attemptNumber: attempt.attemptNumber,
        completedAt,
        pdfFilename: report.filename,
        pdfBuffer: report.buffer,
    });
    return {
        sent: true,
        skipped: false,
        messageId: info.messageId,
    };
}
async function sendCompletedPsychometricResultEmailSafely(userId, attemptId) {
    try {
        return await sendCompletedPsychometricResultEmail(userId, attemptId);
    }
    catch (error) {
        /*
          Important: email failure must never undo or hide a
          successfully completed assessment from the participant.
        */
        console.error("Psychometric result email failed:", {
            userId,
            attemptId,
            error,
        });
        return {
            sent: false,
            skipped: false,
            reason: "EMAIL_SEND_FAILED",
        };
    }
}
