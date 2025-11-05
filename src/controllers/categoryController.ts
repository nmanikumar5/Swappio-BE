import { Request, Response } from 'express';
import Category from '../models/Category';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { NotFoundError, BadRequestError } from '../utils/errors';

// @desc    Get all categories (with optional filtering)
// @route   GET /api/categories
// @access  Public
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
    const { parentOnly, includeSubcategories } = req.query;

    let query: any = { isActive: true };

    // If parentOnly is true, get only top-level categories
    if (parentOnly === 'true') {
        query.parentCategory = null;
    }

    const categories = await Category.find(query)
        .populate(includeSubcategories === 'true' ? 'subcategories' : '')
        .sort('order name');

    sendSuccess(res, 200, { categories }, 'Categories retrieved successfully');
});

// @desc    Get category by slug
// @route   GET /api/categories/:slug
// @access  Public
export const getCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true })
        .populate('subcategories')
        .populate('parentCategory');

    if (!category) {
        throw new NotFoundError('Category not found');
    }

    sendSuccess(res, 200, { category }, 'Category retrieved successfully');
});

// @desc    Create category (Admin)
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
    const { name, slug, icon, description, parentCategory, order, image } = req.body;

    // Check if slug already exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
        throw new BadRequestError('Category with this slug already exists');
    }

    const category = await Category.create({
        name,
        slug,
        icon,
        description,
        parentCategory: parentCategory || null,
        order: order || 0,
        image,
        isActive: true,
    });

    // If this is a subcategory, add it to parent's subcategories array
    if (parentCategory) {
        await Category.findByIdAndUpdate(
            parentCategory,
            { $push: { subcategories: category._id } }
        );
    }

    sendSuccess(res, 201, { category }, 'Category created successfully');
});

// @desc    Update category (Admin)
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
        throw new NotFoundError('Category not found');
    }

    const { name, slug, icon, description, parentCategory, order, image, isActive } = req.body;

    // If slug is being updated, check if it's unique
    if (slug && slug !== category.slug) {
        const existingCategory = await Category.findOne({ slug });
        if (existingCategory) {
            throw new BadRequestError('Category with this slug already exists');
        }
    }

    // Update fields
    if (name) category.name = name;
    if (slug) category.slug = slug;
    if (icon) category.icon = icon;
    if (description !== undefined) category.description = description;
    if (order !== undefined) category.order = order;
    if (image !== undefined) category.image = image;
    if (isActive !== undefined) category.isActive = isActive;

    // Handle parent category change
    if (parentCategory !== undefined) {
        // Remove from old parent if exists
        if (category.parentCategory) {
            await Category.findByIdAndUpdate(
                category.parentCategory,
                { $pull: { subcategories: category._id } }
            );
        }

        // Add to new parent if provided
        if (parentCategory) {
            await Category.findByIdAndUpdate(
                parentCategory,
                { $push: { subcategories: category._id } }
            );
            category.parentCategory = parentCategory;
        } else {
            category.parentCategory = undefined;
        }
    }

    await category.save();

    sendSuccess(res, 200, { category }, 'Category updated successfully');
});

// @desc    Delete category (Admin)
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
        throw new NotFoundError('Category not found');
    }

    // Check if category has subcategories
    if (category.subcategories && category.subcategories.length > 0) {
        throw new BadRequestError('Cannot delete category with subcategories. Delete subcategories first.');
    }

    // Remove from parent's subcategories array if exists
    if (category.parentCategory) {
        await Category.findByIdAndUpdate(
            category.parentCategory,
            { $pull: { subcategories: category._id } }
        );
    }

    await category.deleteOne();

    sendSuccess(res, 200, null, 'Category deleted successfully');
});

// @desc    Get category tree (hierarchical structure)
// @route   GET /api/categories/tree
// @access  Public
export const getCategoryTree = asyncHandler(async (req: Request, res: Response) => {
    // Get all active categories
    const categories = await Category.find({ isActive: true }).sort('order name');

    // Build tree structure
    const tree = categories
        .filter(cat => !cat.parentCategory)
        .map(parent => ({
            ...parent.toObject(),
            subcategories: categories
                .filter(sub => String(sub.parentCategory) === String(parent._id))
                .map(sub => sub.toObject()),
        }));

    sendSuccess(res, 200, { categories: tree }, 'Category tree retrieved successfully');
});
