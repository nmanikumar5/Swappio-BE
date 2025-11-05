/**
 * Seed script for Footer Configuration
 * Run: ts-node scripts/seedFooter.ts
 */

import mongoose from "mongoose";
import FooterConfig from "../src/models/FooterConfig";
import dotenv from "dotenv";

dotenv.config();

const sampleFooterData = {
    sections: [
        {
            title: "Platform",
            links: [
                { label: "Browse Listings", href: "/" },
                { label: "Post an Ad", href: "/post-ad" },
                { label: "My Dashboard", href: "/dashboard" },
                { label: "Pricing Plans", href: "/plans" },
            ],
        },
        {
            title: "User",
            links: [
                { label: "My Favorites", href: "/favorites" },
                { label: "Messages", href: "/chat" },
                { label: "Profile Settings", href: "/dashboard/profile" },
                { label: "My Listings", href: "/dashboard/listings" },
            ],
        },
        {
            title: "Support",
            links: [
                { label: "Help Center", href: "/help" },
                { label: "Contact Us", href: "/contact" },
                { label: "Safety Tips", href: "/safety" },
                { label: "FAQs", href: "/faqs" },
                { label: "Report Problem", href: "/contact?subject=report" },
            ],
        },
        {
            title: "Legal",
            links: [
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Security", href: "/security" },
                { label: "Cookie Policy", href: "/cookies" },
            ],
        },
        {
            title: "Company",
            links: [
                { label: "About Us", href: "/about" },
                { label: "Blog", href: "/blog" },
                { label: "Careers", href: "/careers" },
                { label: "Press Kit", href: "/press" },
            ],
        },
    ],
    brandName: "Swappio",
    brandDescription: "Your trusted platform for secure item exchanges and swaps. Connect, trade, and build community.",
    contactEmail: "support@swappio.com",
    contactPhone: "+1 (555) 123-4567",
    socialLinks: {
        facebook: "https://facebook.com/swappio",
        twitter: "https://twitter.com/swappio",
        instagram: "https://instagram.com/swappio",
        linkedin: "https://linkedin.com/company/swappio",
    },
    isActive: true,
};

async function seedFooter() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/swappio";
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        // Check if footer config already exists
        const existingFooter = await FooterConfig.findOne();

        if (existingFooter) {
            console.log("⚠️  Footer configuration already exists. Updating...");

            // Update existing footer
            Object.assign(existingFooter, sampleFooterData);
            await existingFooter.save();
            console.log("✅ Footer configuration updated successfully!");
            console.log("\nFooter Data:");
            console.log(JSON.stringify(existingFooter, null, 2));
        } else {
            console.log("📝 Creating new footer configuration...");

            // Create new footer
            const newFooter = await FooterConfig.create(sampleFooterData);
            console.log("✅ Footer configuration created successfully!");
            console.log("\nFooter Data:");
            console.log(JSON.stringify(newFooter, null, 2));
        }

        console.log("\n✅ Seeding completed successfully!");
    } catch (error) {
        console.error("❌ Error seeding footer:", error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log("🔌 Database connection closed");
    }
}

// Run the seed function
seedFooter();
