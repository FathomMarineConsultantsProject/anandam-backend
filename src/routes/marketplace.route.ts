import express from "express";

import {
  getPractitioners,
  getPractitionerBySlug,
  getSpecialties,
} from "../controllers/marketplace.controller";

const router =
  express.Router();

router.get(
  "/practitioners",
  getPractitioners
);

router.get(
  "/practitioners/:slug",
  getPractitionerBySlug
);

router.get(
  "/specialties",
  getSpecialties
);

export default router;