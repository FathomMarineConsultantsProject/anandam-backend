"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const resortOwner_controller_1 = require("../controllers/resortOwner.controller");
const resortImage_controller_1 = require("../controllers/resortImage.controller");
const resortRoomUnits_controller_1 = require("../controllers/resortRoomUnits.controller");
const resortEvents_controller_1 = require("../controllers/resortEvents.controller");
const resortEventImages_controller_1 = require("../controllers/resortEventImages.controller");
const resortCalendar_controller_1 = require("../controllers/resortCalendar.controller");
const resortGuestStays_controller_1 = require("../controllers/resortGuestStays.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
router.use((0, role_middleware_1.requireRole)(client_1.UserRole.RESORT_OWNER));
// Existing, FREE resort-onboarding and property-management endpoints.
router.get("/catalog", resortOwner_controller_1.getResortCatalog);
router.get("/properties", resortOwner_controller_1.listMyProperties);
router.post("/properties", resortOwner_controller_1.createProperty);
router.get("/properties/:propertyId", resortOwner_controller_1.getMyProperty);
router.patch("/properties/:propertyId/sections/:section", resortOwner_controller_1.updatePropertySection);
router.post("/properties/:propertyId/rooms", resortOwner_controller_1.createRoom);
router.patch("/properties/:propertyId/rooms/:roomId", resortOwner_controller_1.updateRoom);
router.delete("/properties/:propertyId/rooms/:roomId", resortOwner_controller_1.deleteRoom);
router.post("/properties/:propertyId/images/presign", resortImage_controller_1.presignResortImage);
router.post("/properties/:propertyId/images/confirm", resortImage_controller_1.confirmResortImage);
router.delete("/properties/:propertyId/images/:imageId", resortImage_controller_1.deleteResortImage);
router.get("/properties/:propertyId/review", resortOwner_controller_1.reviewProperty);
router.post("/properties/:propertyId/publish", resortOwner_controller_1.publishProperty);
router.patch("/properties/:propertyId/visibility", resortOwner_controller_1.changePropertyVisibility);
// Physical room numbers used in calendars and arrival/departure operations.
router.get("/properties/:propertyId/rooms/:roomId/units", resortRoomUnits_controller_1.listRoomUnits);
router.put("/properties/:propertyId/rooms/:roomId/units", resortRoomUnits_controller_1.replaceRoomUnits);
// Owner Events & Retreats: step-by-step drafts, dates, prices and publishing.
router.get("/properties/:propertyId/events", resortEvents_controller_1.listEvents);
router.post("/properties/:propertyId/events", resortEvents_controller_1.createEvent);
router.get("/properties/:propertyId/events/:eventId", resortEvents_controller_1.getEvent);
router.patch("/properties/:propertyId/events/:eventId", resortEvents_controller_1.updateEvent);
router.post("/properties/:propertyId/events/:eventId/publish", resortEvents_controller_1.publishEvent);
router.post("/properties/:propertyId/events/:eventId/unpublish", resortEvents_controller_1.unpublishEvent);
router.delete("/properties/:propertyId/events/:eventId", resortEvents_controller_1.deleteEvent);
router.post("/properties/:propertyId/events/:eventId/images/presign", resortEventImages_controller_1.presignEventImage);
router.post("/properties/:propertyId/events/:eventId/images/confirm", resortEventImages_controller_1.confirmEventImage);
router.delete("/properties/:propertyId/events/:eventId/images/:imageId", resortEventImages_controller_1.deleteEventImage);
// Calendar: 14-day grid by physical room, maintenance blocks and retreat holds.
router.get("/properties/:propertyId/calendar", resortCalendar_controller_1.getRoomCalendar);
router.post("/properties/:propertyId/calendar/blocks", resortCalendar_controller_1.blockRoomDates);
router.delete("/properties/:propertyId/calendar/blocks/:blockId", resortCalendar_controller_1.unblockRoomDates);
// Owner-managed reservations, arrivals, stays, check-ins and check-outs.
router.get("/properties/:propertyId/guest-stays", resortGuestStays_controller_1.listGuestStays);
router.post("/properties/:propertyId/guest-stays", resortGuestStays_controller_1.createGuestStay);
router.get("/properties/:propertyId/guest-stays/:reservationId", resortGuestStays_controller_1.getGuestStay);
router.patch("/properties/:propertyId/guest-stays/:reservationId", resortGuestStays_controller_1.updateGuestStay);
router.post("/properties/:propertyId/guest-stays/:reservationId/check-in", resortGuestStays_controller_1.checkInGuest);
router.post("/properties/:propertyId/guest-stays/:reservationId/check-out", resortGuestStays_controller_1.checkOutGuest);
router.post("/properties/:propertyId/guest-stays/:reservationId/cancel", resortGuestStays_controller_1.cancelGuestStay);
exports.default = router;
