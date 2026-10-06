import {
  Router,
} from "express";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

import {
  createBlog,
  getPublicBlogs,
  getMyBlogs,
  getBlogById,
  getPublicBlogByToken,
  updateBlog,
  updateBlogVisibility,
  deleteBlog,
} from "../controllers/blog.controller";


const router =
  Router();


// ======================================================
// PUBLIC SHARE ROUTE
//
// NO LOGIN REQUIRED.
//
// Must stay before /:blogId
// ======================================================

router.get(
  "/public/:shareToken",
  getPublicBlogByToken
);


// ======================================================
// ALL ROUTES BELOW REQUIRE LOGIN
// ======================================================

router.use(
  authenticateToken
);


// Public blogs shown inside Anandam
router.get(
  "/",
  getPublicBlogs
);


// Publish a new blog
router.post(
  "/",
  createBlog
);


// Logged-in user's own blogs
router.get(
  "/mine",
  getMyBlogs
);


// Change PUBLIC / PRIVATE
router.patch(
  "/:blogId/visibility",
  updateBlogVisibility
);


// Read blog inside Anandam
router.get(
  "/:blogId",
  getBlogById
);


// Edit blog
router.patch(
  "/:blogId",
  updateBlog
);


// Delete blog
router.delete(
  "/:blogId",
  deleteBlog
);


export default router;