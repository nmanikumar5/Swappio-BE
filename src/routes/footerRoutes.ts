import { Router } from "express";
import {
    getFooterConfig,
    getFooterConfigAdmin,
    updateFooterConfig,
    addFooterSection,
    updateFooterSection,
    deleteFooterSection,
    addLinkToSection,
    updateLinkInSection,
    deleteLinkFromSection,
} from "../controllers/footerController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Public routes
router.get("/config", getFooterConfig);

// Admin routes (require authentication and admin role)
router.get("/admin/config", authenticate, authorize("admin"), getFooterConfigAdmin);
router.put("/admin/config", authenticate, authorize("admin"), updateFooterConfig);

// Section management
router.post("/admin/sections", authenticate, authorize("admin"), addFooterSection);
router.put("/admin/sections/:sectionTitle", authenticate, authorize("admin"), updateFooterSection);
router.delete(
    "/admin/sections/:sectionTitle",
    authenticate,
    authorize("admin"),
    deleteFooterSection
);

// Link management within sections
router.post(
    "/admin/sections/:sectionTitle/links",
    authenticate,
    authorize("admin"),
    addLinkToSection
);
router.put(
    "/admin/sections/:sectionTitle/links/:linkLabel",
    authenticate,
    authorize("admin"),
    updateLinkInSection
);
router.delete(
    "/admin/sections/:sectionTitle/links/:linkLabel",
    authenticate,
    authorize("admin"),
    deleteLinkFromSection
);

export default router;
