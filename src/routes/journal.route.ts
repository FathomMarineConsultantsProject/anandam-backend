import express
  from "express";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

import {
  createJournalEntry,
  deleteJournalEntry,
  getJournalTemplateBySlug,
  getJournalTemplates,
  getMyJournalEntries,
  getMyJournalEntryById,
  saveJournalEntry,
  updateJournalEntry,
} from "../controllers/journal.controller";


const router =
  express.Router();


/*
  Journal is available to authenticated
  Anandam accounts.

  We intentionally do not restrict this
  route to USER only because practitioner
  accounts also have access to the normal
  Anandam wellbeing application.
*/

router.use(
  authenticateToken
);


// ======================================================
// TEMPLATES
// ======================================================

router.get(
  "/templates",
  getJournalTemplates
);


router.get(
  "/templates/:slug",
  getJournalTemplateBySlug
);


// ======================================================
// ENTRIES
// ======================================================

router.get(
  "/entries",
  getMyJournalEntries
);


router.get(
  "/entries/:entryId",
  getMyJournalEntryById
);


router.post(
  "/entries",
  createJournalEntry
);


router.patch(
  "/entries/:entryId",
  updateJournalEntry
);


router.post(
  "/entries/:entryId/save",
  saveJournalEntry
);


router.delete(
  "/entries/:entryId",
  deleteJournalEntry
);


export default router;