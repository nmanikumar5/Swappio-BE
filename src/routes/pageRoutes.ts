import { Router } from "express";
import {
    getPageBySlug,
    getAllPages,
    getAllPagesAdmin,
    getPageBySlugAdmin,
    createPage,
    updatePage,
    publishPage,
    deletePage,
    getPageStats,
} from "../controllers/pageController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Public routes
router.get("/", getAllPages);
router.get("/:slug", getPageBySlug);

// Admin routes (require authentication and admin role)
router.get("/admin/stats", authenticate, authorize("admin"), getPageStats);
router.get("/admin/all", authenticate, authorize("admin"), getAllPagesAdmin);
router.get("/admin/:slug", authenticate, authorize("admin"), getPageBySlugAdmin);
router.post("/admin", authenticate, authorize("admin"), createPage);
router.put("/admin/:slug", authenticate, authorize("admin"), updatePage);
router.patch(
    "/admin/:slug/publish",
    authenticate,
    authorize("admin"),
    publishPage
);
router.delete("/admin/:slug", authenticate, authorize("admin"), deletePage);

export default router;
