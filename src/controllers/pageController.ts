import { Request, Response } from "express";
import PageContent from "../models/PageContent.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { NotFoundError, BadRequestError } from "../utils/errors.js";
import { sanitizeString } from "../utils/sanitize.js";

// @desc    Get page content by slug (Public)
// @route   GET /api/pages/:slug
// @access  Public
export const getPageBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;

    const page = await PageContent.findOne({
        slug: slug.toLowerCase(),
        isPublished: true,
    });

    if (!page) {
        throw new NotFoundError("Page not found");
    }

    sendSuccess(res, 200, page);
});

// @desc    Get all published pages (Public)
// @route   GET /api/pages
// @access  Public
export const getAllPages = asyncHandler(async (req: Request, res: Response) => {
    const pages = await PageContent.find({ isPublished: true }).select(
        "slug title description sectionTitle createdAt updatedAt"
    );

    sendSuccess(res, 200, pages);
});

// @desc    Get all pages (Admin)
// @route   GET /api/admin/pages
// @access  Private/Admin
export const getAllPagesAdmin = asyncHandler(
    async (req: Request, res: Response) => {
        const pages = await PageContent.find().sort({ createdAt: -1 });

        sendSuccess(res, 200, pages);
    }
);

// @desc    Get page by slug (Admin)
// @route   GET /api/admin/pages/:slug
// @access  Private/Admin
export const getPageBySlugAdmin = asyncHandler(
    async (req: Request, res: Response) => {
        const { slug } = req.params;

        const page = await PageContent.findOne({
            slug: slug.toLowerCase(),
        });

        if (!page) {
            throw new NotFoundError("Page not found");
        }

        sendSuccess(res, 200, page);
    }
);

// @desc    Create a new page (Admin)
// @route   POST /api/admin/pages
// @access  Private/Admin
export const createPage = asyncHandler(async (req: Request, res: Response) => {
    const { slug, title, description, content, sectionTitle, isPublished } =
        req.body;

    // Validation
    if (!slug || !title || !description || !content) {
        throw new BadRequestError(
            "Slug, title, description, and content are required"
        );
    }

    // Check if page already exists
    const existingPage = await PageContent.findOne({
        slug: slug.toLowerCase(),
    });

    if (existingPage) {
        throw new BadRequestError("Page with this slug already exists");
    }

    const page = await PageContent.create({
        slug: slug.toLowerCase(),
        title: sanitizeString(title),
        description: sanitizeString(description),
        content, // Keep HTML content as is for rich editor
        sectionTitle: sectionTitle || null,
        isPublished: isPublished !== false,
        updatedBy: (req as any).user?._id,
    });

    sendSuccess(
        res,
        201,
        page,
        "Page created successfully"
    );
});

// @desc    Update a page (Admin)
// @route   PUT /api/admin/pages/:slug
// @access  Private/Admin
export const updatePage = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { title, description, content, sectionTitle, isPublished } = req.body;

    // Validation
    if (title && !title.trim()) {
        throw new BadRequestError("Title cannot be empty");
    }

    if (description && !description.trim()) {
        throw new BadRequestError("Description cannot be empty");
    }

    const page = await PageContent.findOne({
        slug: slug.toLowerCase(),
    });

    if (!page) {
        throw new NotFoundError("Page not found");
    }

    // Update fields
    if (title) page.title = sanitizeString(title);
    if (description) page.description = sanitizeString(description);
    if (content !== undefined) page.content = content;
    if (sectionTitle !== undefined) page.sectionTitle = sectionTitle || null;
    if (isPublished !== undefined) page.isPublished = isPublished;

    page.updatedBy = (req as any).user?._id;
    await page.save();

    sendSuccess(
        res,
        200,
        page,
        "Page updated successfully"
    );
});

// @desc    Publish/Unpublish a page (Admin)
// @route   PATCH /api/admin/pages/:slug/publish
// @access  Private/Admin
export const publishPage = asyncHandler(
    async (req: Request, res: Response) => {
        const { slug } = req.params;
        const { isPublished } = req.body;

        if (isPublished === undefined) {
            throw new BadRequestError("isPublished flag is required");
        }

        const page = await PageContent.findOne({
            slug: slug.toLowerCase(),
        });

        if (!page) {
            throw new NotFoundError("Page not found");
        }

        page.isPublished = isPublished;
        page.updatedBy = (req as any).user?._id;
        await page.save();

        sendSuccess(
            res,
            200,
            page,
            `Page ${isPublished ? "published" : "unpublished"} successfully`
        );
    }
);

// @desc    Delete a page (Admin)
// @route   DELETE /api/admin/pages/:slug
// @access  Private/Admin
export const deletePage = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;

    const page = await PageContent.findOne({
        slug: slug.toLowerCase(),
    });

    if (!page) {
        throw new NotFoundError("Page not found");
    }

    await PageContent.deleteOne({ _id: page._id });

    sendSuccess(
        res,
        200,
        {},
        "Page deleted successfully"
    );
});

// @desc    Get page stats (Admin)
// @route   GET /api/admin/pages/stats
// @access  Private/Admin
export const getPageStats = asyncHandler(
    async (req: Request, res: Response) => {
        const totalPages = await PageContent.countDocuments();
        const publishedPages = await PageContent.countDocuments({
            isPublished: true,
        });
        const draftPages = await PageContent.countDocuments({
            isPublished: false,
        });

        const stats = {
            total: totalPages,
            published: publishedPages,
            draft: draftPages,
        };

        sendSuccess(res, 200, stats);
    }
);
