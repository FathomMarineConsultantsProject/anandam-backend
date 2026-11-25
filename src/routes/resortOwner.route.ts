import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  createProperty, listMyProperties, getMyProperty, getResortCatalog,
  updatePropertySection, createRoom, updateRoom, deleteRoom,
  reviewProperty, publishProperty, changePropertyVisibility,
} from "../controllers/resortOwner.controller";
import {
  presignResortImage, confirmResortImage, deleteResortImage,
} from "../controllers/resortImage.controller";
import { listRoomUnits, replaceRoomUnits } from "../controllers/resortRoomUnits.controller";
import {
  createEvent, listEvents, getEvent, updateEvent, publishEvent,
  unpublishEvent, deleteEvent,
} from "../controllers/resortEvents.controller";
import {
  presignEventImage, confirmEventImage, deleteEventImage,
} from "../controllers/resortEventImages.controller";
import {
  getRoomCalendar, blockRoomDates, unblockRoomDates,
} from "../controllers/resortCalendar.controller";
import {
  createGuestStay, listGuestStays, getGuestStay, updateGuestStay,
  checkInGuest, checkOutGuest, cancelGuestStay,
} from "../controllers/resortGuestStays.controller";

const router = Router();
router.use(authenticateToken);
router.use(requireRole(UserRole.RESORT_OWNER));

// Existing, FREE resort-onboarding and property-management endpoints.
router.get("/catalog", getResortCatalog);
router.get("/properties", listMyProperties);
router.post("/properties", createProperty);
router.get("/properties/:propertyId", getMyProperty);
router.patch("/properties/:propertyId/sections/:section", updatePropertySection);
router.post("/properties/:propertyId/rooms", createRoom);
router.patch("/properties/:propertyId/rooms/:roomId", updateRoom);
router.delete("/properties/:propertyId/rooms/:roomId", deleteRoom);
router.post("/properties/:propertyId/images/presign", presignResortImage);
router.post("/properties/:propertyId/images/confirm", confirmResortImage);
router.delete("/properties/:propertyId/images/:imageId", deleteResortImage);
router.get("/properties/:propertyId/review", reviewProperty);
router.post("/properties/:propertyId/publish", publishProperty);
router.patch("/properties/:propertyId/visibility", changePropertyVisibility);

// Physical room numbers used in calendars and arrival/departure operations.
router.get("/properties/:propertyId/rooms/:roomId/units", listRoomUnits);
router.put("/properties/:propertyId/rooms/:roomId/units", replaceRoomUnits);

// Owner Events & Retreats: step-by-step drafts, dates, prices and publishing.
router.get("/properties/:propertyId/events", listEvents);
router.post("/properties/:propertyId/events", createEvent);
router.get("/properties/:propertyId/events/:eventId", getEvent);
router.patch("/properties/:propertyId/events/:eventId", updateEvent);
router.post("/properties/:propertyId/events/:eventId/publish", publishEvent);
router.post("/properties/:propertyId/events/:eventId/unpublish", unpublishEvent);
router.delete("/properties/:propertyId/events/:eventId", deleteEvent);
router.post("/properties/:propertyId/events/:eventId/images/presign", presignEventImage);
router.post("/properties/:propertyId/events/:eventId/images/confirm", confirmEventImage);
router.delete("/properties/:propertyId/events/:eventId/images/:imageId", deleteEventImage);

// Calendar: 14-day grid by physical room, maintenance blocks and retreat holds.
router.get("/properties/:propertyId/calendar", getRoomCalendar);
router.post("/properties/:propertyId/calendar/blocks", blockRoomDates);
router.delete("/properties/:propertyId/calendar/blocks/:blockId", unblockRoomDates);

// Owner-managed reservations, arrivals, stays, check-ins and check-outs.
router.get("/properties/:propertyId/guest-stays", listGuestStays);
router.post("/properties/:propertyId/guest-stays", createGuestStay);
router.get("/properties/:propertyId/guest-stays/:reservationId", getGuestStay);
router.patch("/properties/:propertyId/guest-stays/:reservationId", updateGuestStay);
router.post("/properties/:propertyId/guest-stays/:reservationId/check-in", checkInGuest);
router.post("/properties/:propertyId/guest-stays/:reservationId/check-out", checkOutGuest);
router.post("/properties/:propertyId/guest-stays/:reservationId/cancel", cancelGuestStay);

export default router;
