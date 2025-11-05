import { Request, Response } from "express";
import FooterConfig from "../models/FooterConfig.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { NotFoundError, BadRequestError } from "../utils/errors.js";
import { sanitizeString } from "../utils/sanitize.js";

// @desc    Get footer configuration (Public)
// @route   GET /api/footer/config
// @access  Public
export const getFooterConfig = asyncHandler(async (req: Request, res: Response) => {
    let footerConfig = await FooterConfig.findOne({ isActive: true });

    if (!footerConfig) {
        // Create default if doesn't exist
        footerConfig = await FooterConfig.create({});
    }

    sendSuccess(res, 200, footerConfig);
});

// @desc    Get footer configuration (Admin)
// @route   GET /api/admin/footer/config
// @access  Private/Admin
export const getFooterConfigAdmin = asyncHandler(async (req: Request, res: Response) => {
    let footerConfig = await FooterConfig.findOne();

    if (!footerConfig) {
        // Create default if doesn't exist
        footerConfig = await FooterConfig.create({});
    }

    sendSuccess(res, 200, footerConfig);
});

// @desc    Update footer configuration (Admin)
// @route   PUT /api/admin/footer/config
// @access  Private/Admin
export const updateFooterConfig = asyncHandler(async (req: Request, res: Response) => {
    const { sections, brandName, brandDescription, contactEmail, contactPhone, socialLinks } = req.body;

    // Validate required fields
    if (!brandName || !brandDescription || !contactEmail || !contactPhone) {
        throw new BadRequestError("Brand name, description, email, and phone are required");
    }

    if (!Array.isArray(sections) || sections.length === 0) {
        throw new BadRequestError("At least one footer section is required");
    }

    // Validate each section
    for (const section of sections) {
        if (!section.title || !Array.isArray(section.links)) {
            throw new BadRequestError("Each section must have a title and links array");
        }
        if (section.links.length === 0) {
            throw new BadRequestError("Each section must have at least one link");
        }
        for (const link of section.links) {
            if (!link.label || !link.href) {
                throw new BadRequestError("Each link must have both label and href");
            }
        }
    }

    let footerConfig = await FooterConfig.findOne();

    if (!footerConfig) {
        footerConfig = await FooterConfig.create({
            sections,
            brandName: sanitizeString(brandName),
            brandDescription: sanitizeString(brandDescription),
            contactEmail: sanitizeString(contactEmail),
            contactPhone: sanitizeString(contactPhone),
            socialLinks: socialLinks || {},
            updatedBy: (req as any).user?._id,
        });
    } else {
        footerConfig.sections = sections;
        footerConfig.brandName = sanitizeString(brandName);
        footerConfig.brandDescription = sanitizeString(brandDescription);
        footerConfig.contactEmail = sanitizeString(contactEmail);
        footerConfig.contactPhone = sanitizeString(contactPhone);
        if (socialLinks) {
            footerConfig.socialLinks = socialLinks;
        }
        footerConfig.updatedBy = (req as any).user?._id;
        await footerConfig.save();
    }

    sendSuccess(res, 200, footerConfig, "Footer configuration updated successfully");
});

// @desc    Add a new footer section (Admin)
// @route   POST /api/admin/footer/sections
// @access  Private/Admin
export const addFooterSection = asyncHandler(async (req: Request, res: Response) => {
    const { title, links } = req.body;

    if (!title || !Array.isArray(links) || links.length === 0) {
        throw new BadRequestError("Section title and at least one link are required");
    }

    // Validate links
    for (const link of links) {
        if (!link.label || !link.href) {
            throw new BadRequestError("Each link must have both label and href");
        }
    }

    let footerConfig = await FooterConfig.findOne();

    if (!footerConfig) {
        footerConfig = await FooterConfig.create({});
    }

    // Check if section with same title exists
    const sectionExists = footerConfig.sections.some(
        (s: any) => s.title.toLowerCase() === title.toLowerCase()
    );

    if (sectionExists) {
        throw new BadRequestError("Section with this title already exists");
    }

    footerConfig.sections.push({
        title: sanitizeString(title),
        links: links.map((link: any) => ({
            label: sanitizeString(link.label),
            href: link.href,
        })),
    } as any);

    footerConfig.updatedBy = (req as any).user?._id;
    await footerConfig.save();

    sendSuccess(res, 201, footerConfig, "Footer section added successfully");
});

// @desc    Update a footer section (Admin)
// @route   PUT /api/admin/footer/sections/:sectionTitle
// @access  Private/Admin
export const updateFooterSection = asyncHandler(async (req: Request, res: Response) => {
    const { sectionTitle } = req.params;
    const { title, links } = req.body;

    if (!title || !Array.isArray(links) || links.length === 0) {
        throw new BadRequestError("Section title and at least one link are required");
    }

    // Validate links
    for (const link of links) {
        if (!link.label || !link.href) {
            throw new BadRequestError("Each link must have both label and href");
        }
    }

    let footerConfig = await FooterConfig.findOne();

    if (!footerConfig) {
        throw new NotFoundError("Footer configuration not found");
    }

    const section = footerConfig.sections.find(
        (s: any) => s.title.toLowerCase() === sectionTitle.toLowerCase()
    );

    if (!section) {
        throw new NotFoundError("Section not found");
    }

    // Check if new title already exists (if title is being changed)
    if (title.toLowerCase() !== sectionTitle.toLowerCase()) {
        const titleExists = footerConfig.sections.some(
            (s: any) => s.title.toLowerCase() === title.toLowerCase()
        );
        if (titleExists) {
            throw new BadRequestError("Section with this title already exists");
        }
    }

    section.title = sanitizeString(title);
    section.links = links.map((link: any) => ({
        label: sanitizeString(link.label),
        href: link.href,
    }));

    footerConfig.updatedBy = (req as any).user?._id;
    await footerConfig.save();

    sendSuccess(res, 200, footerConfig, "Footer section updated successfully");
});

// @desc    Delete a footer section (Admin)
// @route   DELETE /api/admin/footer/sections/:sectionTitle
// @access  Private/Admin
export const deleteFooterSection = asyncHandler(async (req: Request, res: Response) => {
    const { sectionTitle } = req.params;

    let footerConfig = await FooterConfig.findOne();

    if (!footerConfig) {
        throw new NotFoundError("Footer configuration not found");
    }

    if (footerConfig.sections.length <= 1) {
        throw new BadRequestError("Cannot delete the last section. Footer must have at least one section.");
    }

    const sectionIndex = footerConfig.sections.findIndex(
        (s: any) => s.title.toLowerCase() === sectionTitle.toLowerCase()
    );

    if (sectionIndex === -1) {
        throw new NotFoundError("Section not found");
    }

    footerConfig.sections.splice(sectionIndex, 1);
    footerConfig.updatedBy = (req as any).user?._id;
    await footerConfig.save();

    sendSuccess(res, 200, footerConfig, "Footer section deleted successfully");
});

// @desc    Add a link to a footer section (Admin)
// @route   POST /api/admin/footer/sections/:sectionTitle/links
// @access  Private/Admin
export const addLinkToSection = asyncHandler(async (req: Request, res: Response) => {
    const { sectionTitle } = req.params;
    const { label, href } = req.body;

    if (!label || !href) {
        throw new BadRequestError("Link label and href are required");
    }

    let footerConfig = await FooterConfig.findOne();

    if (!footerConfig) {
        throw new NotFoundError("Footer configuration not found");
    }

    const section = footerConfig.sections.find(
        (s: any) => s.title.toLowerCase() === sectionTitle.toLowerCase()
    );

    if (!section) {
        throw new NotFoundError("Section not found");
    }

    // Check if link already exists
    const linkExists = section.links.some(
        (l: any) => l.label.toLowerCase() === label.toLowerCase()
    );

    if (linkExists) {
        throw new BadRequestError("Link with this label already exists in this section");
    }

    section.links.push({
        label: sanitizeString(label),
        href: href,
    });

    footerConfig.updatedBy = (req as any).user?._id;
    await footerConfig.save();

    sendSuccess(res, 201, footerConfig, "Link added successfully");
});

// @desc    Update a link in a footer section (Admin)
// @route   PUT /api/admin/footer/sections/:sectionTitle/links/:linkLabel
// @access  Private/Admin
export const updateLinkInSection = asyncHandler(async (req: Request, res: Response) => {
    const { sectionTitle, linkLabel } = req.params;
    const { label, href } = req.body;

    if (!label || !href) {
        throw new BadRequestError("Link label and href are required");
    }

    let footerConfig = await FooterConfig.findOne();

    if (!footerConfig) {
        throw new NotFoundError("Footer configuration not found");
    }

    const section = footerConfig.sections.find(
        (s: any) => s.title.toLowerCase() === sectionTitle.toLowerCase()
    );

    if (!section) {
        throw new NotFoundError("Section not found");
    }

    const linkIndex = section.links.findIndex(
        (l: any) => l.label.toLowerCase() === linkLabel.toLowerCase()
    );

    if (linkIndex === -1) {
        throw new NotFoundError("Link not found");
    }

    section.links[linkIndex] = {
        label: sanitizeString(label),
        href: href,
    };

    footerConfig.updatedBy = (req as any).user?._id;
    await footerConfig.save();

    sendSuccess(res, 200, footerConfig, "Link updated successfully");
});

// @desc    Delete a link from a footer section (Admin)
// @route   DELETE /api/admin/footer/sections/:sectionTitle/links/:linkLabel
// @access  Private/Admin
export const deleteLinkFromSection = asyncHandler(async (req: Request, res: Response) => {
    const { sectionTitle, linkLabel } = req.params;

    let footerConfig = await FooterConfig.findOne();

    if (!footerConfig) {
        throw new NotFoundError("Footer configuration not found");
    }

    const section = footerConfig.sections.find(
        (s: any) => s.title.toLowerCase() === sectionTitle.toLowerCase()
    );

    if (!section) {
        throw new NotFoundError("Section not found");
    }

    if (section.links.length <= 1) {
        throw new BadRequestError(
            "Cannot delete the last link. Each section must have at least one link."
        );
    }

    const linkIndex = section.links.findIndex(
        (l: any) => l.label.toLowerCase() === linkLabel.toLowerCase()
    );

    if (linkIndex === -1) {
        throw new NotFoundError("Link not found");
    }

    section.links.splice(linkIndex, 1);
    footerConfig.updatedBy = (req as any).user?._id;
    await footerConfig.save();

    sendSuccess(res, 200, footerConfig, "Link deleted successfully");
});
