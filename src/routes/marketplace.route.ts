import express from "express";

import {
  getPractitioners,
  getPractitionerBySlug,
  getSpecialties,
} from "../controllers/marketplace.controller";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

import {
  requireRole,
} from "../middleware/role.middleware";

import {
  UserRole,
} from "@prisma/client";


const router =
  express.Router();


router.use(
  authenticateToken
);

router.use(
  requireRole(
    UserRole.USER
  )
);


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