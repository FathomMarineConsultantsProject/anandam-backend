"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const journal_controller_1 = require("../controllers/journal.controller");
const router = express_1.default.Router();
/*
  Journal is available to authenticated
  Anandam accounts.

  We intentionally do not restrict this
  route to USER only because practitioner
  accounts also have access to the normal
  Anandam wellbeing application.
*/
router.use(auth_middleware_1.authenticateToken);
// ======================================================
// TEMPLATES
// ======================================================
router.get("/templates", journal_controller_1.getJournalTemplates);
router.get("/templates/:slug", journal_controller_1.getJournalTemplateBySlug);
// ======================================================
// ENTRIES
// ======================================================
router.get("/entries", journal_controller_1.getMyJournalEntries);
router.get("/entries/:entryId", journal_controller_1.getMyJournalEntryById);
router.post("/entries", journal_controller_1.createJournalEntry);
router.patch("/entries/:entryId", journal_controller_1.updateJournalEntry);
router.post("/entries/:entryId/save", journal_controller_1.saveJournalEntry);
router.delete("/entries/:entryId", journal_controller_1.deleteJournalEntry);
exports.default = router;
