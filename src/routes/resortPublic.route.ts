import { Router } from "express";
import { listPublishedResorts, getPublishedResort } from "../controllers/resortPublic.controller";
import { listPublishedResortEvents, getPublishedResortEvent } from "../controllers/resortPublicEvents.controller";

const router = Router();

router.get("/", listPublishedResorts);

// Define these BEFORE /:slug so "events" isn't mistaken for a resort slug.
router.get("/events", listPublishedResortEvents);
router.get("/events/:eventId", getPublishedResortEvent);

router.get("/:slug", getPublishedResort);

export default router;
