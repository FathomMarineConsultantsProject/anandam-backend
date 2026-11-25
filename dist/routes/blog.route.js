"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const blog_controller_1 = require("../controllers/blog.controller");
const router = (0, express_1.Router)();
// ======================================================
// PUBLIC SHARE ROUTE
//
// NO LOGIN REQUIRED.
//
// Must stay before /:blogId
// ======================================================
router.get("/public/:shareToken", blog_controller_1.getPublicBlogByToken);
// ======================================================
// ALL ROUTES BELOW REQUIRE LOGIN
// ======================================================
router.use(auth_middleware_1.authenticateToken);
// Public blogs shown inside Anandam
router.get("/", blog_controller_1.getPublicBlogs);
// Publish a new blog
router.post("/", blog_controller_1.createBlog);
// Logged-in user's own blogs
router.get("/mine", blog_controller_1.getMyBlogs);
// Change PUBLIC / PRIVATE
router.patch("/:blogId/visibility", blog_controller_1.updateBlogVisibility);
// Read blog inside Anandam
router.get("/:blogId", blog_controller_1.getBlogById);
// Edit blog
router.patch("/:blogId", blog_controller_1.updateBlog);
// Delete blog
router.delete("/:blogId", blog_controller_1.deleteBlog);
exports.default = router;
