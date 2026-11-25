"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const resortPublic_controller_1 = require("../controllers/resortPublic.controller");
const router = (0, express_1.Router)();
router.get("/", resortPublic_controller_1.listPublishedResorts);
router.get("/:slug", resortPublic_controller_1.getPublishedResort);
exports.default = router;
