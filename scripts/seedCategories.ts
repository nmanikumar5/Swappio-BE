import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../src/models/Category';

dotenv.config();

const categories = [
    // 1. Mobile Phones
    {
        name: "Mobile Phones",
        slug: "mobile-phones",
        icon: "Smartphone",
        description: "Smartphones, feature phones, and mobile accessories",
        order: 1,
        subcategories: [
            { name: "Android Phones", slug: "android-phones", icon: "Smartphone" },
            { name: "iPhones", slug: "iphones", icon: "Smartphone" },
            { name: "Feature Phones", slug: "feature-phones", icon: "Phone" },
            { name: "Phone Accessories", slug: "phone-accessories", icon: "Headphones" },
        ]
    },

    // 2. Electronics & Appliances
    {
        name: "Electronics & Appliances",
        slug: "electronics",
        icon: "Laptop",
        description: "Laptops, computers, TVs, cameras, and home appliances",
        order: 2,
        subcategories: [
            { name: "Laptops & Computers", slug: "laptops-computers", icon: "Laptop" },
            { name: "TVs & Video", slug: "tvs-video", icon: "Tv" },
            { name: "Cameras", slug: "cameras", icon: "Camera" },
            { name: "Audio & Music", slug: "audio-music", icon: "Music" },
            { name: "Gaming Consoles", slug: "gaming-consoles", icon: "Gamepad2" },
            { name: "Refrigerators", slug: "refrigerators", icon: "Snowflake" },
            { name: "Washing Machines", slug: "washing-machines", icon: "WashingMachine" },
            { name: "Air Conditioners", slug: "air-conditioners", icon: "Wind" },
            { name: "Kitchen Appliances", slug: "kitchen-appliances", icon: "CookingPot" },
        ]
    },

    // 3. Vehicles
    {
        name: "Vehicles",
        slug: "vehicles",
        icon: "Car",
        description: "Cars, bikes, scooters, and spare parts",
        order: 3,
        subcategories: [
            { name: "Cars", slug: "cars", icon: "Car" },
            { name: "Motorcycles", slug: "motorcycles", icon: "Bike" },
            { name: "Scooters", slug: "scooters", icon: "Bike" },
            { name: "Bicycles", slug: "bicycles", icon: "Bike" },
            { name: "Commercial Vehicles", slug: "commercial-vehicles", icon: "Truck" },
            { name: "Spare Parts", slug: "spare-parts", icon: "Wrench" },
        ]
    },

    // 4. Property
    {
        name: "Property",
        slug: "property",
        icon: "Home",
        description: "Houses, apartments, land, and commercial property",
        order: 4,
        subcategories: [
            { name: "Apartments for Sale", slug: "apartments-sale", icon: "Building2" },
            { name: "Apartments for Rent", slug: "apartments-rent", icon: "Building2" },
            { name: "Houses & Villas for Sale", slug: "houses-sale", icon: "Home" },
            { name: "Houses & Villas for Rent", slug: "houses-rent", icon: "Home" },
            { name: "Land & Plots", slug: "land-plots", icon: "Map" },
            { name: "Commercial Property", slug: "commercial-property", icon: "Building" },
            { name: "PG & Hostels", slug: "pg-hostels", icon: "Hotel" },
        ]
    },

    // 5. Furniture
    {
        name: "Furniture",
        slug: "furniture",
        icon: "Sofa",
        description: "Beds, sofas, tables, chairs, and home decor",
        order: 5,
        subcategories: [
            { name: "Sofa & Seating", slug: "sofa-seating", icon: "Armchair" },
            { name: "Beds & Wardrobes", slug: "beds-wardrobes", icon: "Bed" },
            { name: "Tables & Dining", slug: "tables-dining", icon: "Utensils" },
            { name: "Office Furniture", slug: "office-furniture", icon: "Briefcase" },
            { name: "Home Decor", slug: "home-decor", icon: "Lamp" },
            { name: "Garden & Outdoor", slug: "garden-outdoor", icon: "Trees" },
        ]
    },

    // 6. Fashion
    {
        name: "Fashion",
        slug: "fashion",
        icon: "Shirt",
        description: "Clothing, footwear, watches, and accessories for men, women, and kids",
        order: 6,
        subcategories: [
            { name: "Men's Clothing", slug: "mens-clothing", icon: "User" },
            { name: "Women's Clothing", slug: "womens-clothing", icon: "User" },
            { name: "Kids' Clothing", slug: "kids-clothing", icon: "Baby" },
            { name: "Men's Footwear", slug: "mens-footwear", icon: "Footprints" },
            { name: "Women's Footwear", slug: "womens-footwear", icon: "Footprints" },
            { name: "Watches", slug: "watches", icon: "Watch" },
            { name: "Bags & Luggage", slug: "bags-luggage", icon: "Backpack" },
            { name: "Jewelry", slug: "jewelry", icon: "Gem" },
        ]
    },

    // 7. Books, Sports & Hobbies
    {
        name: "Books, Sports & Hobbies",
        slug: "books-sports-hobbies",
        icon: "Book",
        description: "Books, sports equipment, musical instruments, and hobby items",
        order: 7,
        subcategories: [
            { name: "Books", slug: "books", icon: "BookOpen" },
            { name: "Gym & Fitness", slug: "gym-fitness", icon: "Dumbbell" },
            { name: "Sports Equipment", slug: "sports-equipment", icon: "Trophy" },
            { name: "Musical Instruments", slug: "musical-instruments", icon: "Music" },
            { name: "Art & Collectibles", slug: "art-collectibles", icon: "Palette" },
        ]
    },

    // 8. Pets
    {
        name: "Pets",
        slug: "pets",
        icon: "Dog",
        description: "Pets, pet accessories, and pet food",
        order: 8,
        subcategories: [
            { name: "Dogs", slug: "dogs", icon: "Dog" },
            { name: "Cats", slug: "cats", icon: "Cat" },
            { name: "Fish & Aquarium", slug: "fish-aquarium", icon: "Fish" },
            { name: "Birds", slug: "birds", icon: "Bird" },
            { name: "Pet Accessories", slug: "pet-accessories", icon: "PawPrint" },
            { name: "Pet Food", slug: "pet-food", icon: "Apple" },
        ]
    },

    // 9. Jobs
    {
        name: "Jobs",
        slug: "jobs",
        icon: "Briefcase",
        description: "Job listings and career opportunities",
        order: 9,
        subcategories: [
            { name: "IT & Software", slug: "it-software", icon: "Code" },
            { name: "Sales & Marketing", slug: "sales-marketing", icon: "TrendingUp" },
            { name: "Education & Training", slug: "education-training", icon: "GraduationCap" },
            { name: "Healthcare", slug: "healthcare", icon: "Heart" },
            { name: "Hospitality", slug: "hospitality", icon: "Hotel" },
            { name: "Part Time Jobs", slug: "part-time-jobs", icon: "Clock" },
            { name: "Work from Home", slug: "work-from-home", icon: "Home" },
        ]
    },

    // 10. Services
    {
        name: "Services",
        slug: "services",
        icon: "Wrench",
        description: "Professional and local services",
        order: 10,
        subcategories: [
            { name: "Home Repair", slug: "home-repair", icon: "Hammer" },
            { name: "Cleaning & Pest Control", slug: "cleaning-pest-control", icon: "Sparkles" },
            { name: "Packers & Movers", slug: "packers-movers", icon: "Truck" },
            { name: "Education & Classes", slug: "education-classes", icon: "BookOpen" },
            { name: "Web & Software", slug: "web-software", icon: "Code" },
            { name: "Event Services", slug: "event-services", icon: "PartyPopper" },
            { name: "Photography", slug: "photography", icon: "Camera" },
        ]
    },

    // 11. Kids
    {
        name: "Kids",
        slug: "kids",
        icon: "Baby",
        description: "Toys, baby care, kids furniture, and school supplies",
        order: 11,
        subcategories: [
            { name: "Toys & Games", slug: "toys-games", icon: "Puzzle" },
            { name: "Baby Care", slug: "baby-care", icon: "Baby" },
            { name: "Strollers & Prams", slug: "strollers-prams", icon: "Baby" },
            { name: "Kids Furniture", slug: "kids-furniture", icon: "Bed" },
            { name: "School Supplies", slug: "school-supplies", icon: "Backpack" },
        ]
    },

    // 12. Business & Industrial
    {
        name: "Business & Industrial",
        slug: "business-industrial",
        icon: "Factory",
        description: "Office equipment, industrial machinery, and business supplies",
        order: 12,
        subcategories: [
            { name: "Office Equipment", slug: "office-equipment", icon: "Printer" },
            { name: "Industrial Machinery", slug: "industrial-machinery", icon: "Cog" },
            { name: "Medical Equipment", slug: "medical-equipment", icon: "Stethoscope" },
            { name: "Restaurant Equipment", slug: "restaurant-equipment", icon: "UtensilsCrossed" },
        ]
    },

    // 13. Agriculture
    {
        name: "Agriculture",
        slug: "agriculture",
        icon: "Tractor",
        description: "Farm equipment, seeds, and agricultural supplies",
        order: 13,
        subcategories: [
            { name: "Tractors", slug: "tractors", icon: "Tractor" },
            { name: "Farm Equipment", slug: "farm-equipment", icon: "Wrench" },
            { name: "Seeds & Fertilizers", slug: "seeds-fertilizers", icon: "Sprout" },
            { name: "Livestock", slug: "livestock", icon: "Cow" },
        ]
    },
];

const seedCategories = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swappio');
        console.log('✅ Connected to MongoDB');

        // Clear existing categories
        await Category.deleteMany({});
        console.log('🗑️  Cleared existing categories');

        // Create categories with subcategories
        for (const categoryData of categories) {
            const { subcategories, ...mainCategoryData } = categoryData;

            // Create main category
            const mainCategory = await Category.create(mainCategoryData);
            console.log(`✅ Created main category: ${mainCategory.name}`);

            // Create subcategories if they exist
            if (subcategories && subcategories.length > 0) {
                const subcategoryIds: mongoose.Types.ObjectId[] = [];

                for (let i = 0; i < subcategories.length; i++) {
                    const subcat = subcategories[i];
                    const subcategory = await Category.create({
                        ...subcat,
                        parentCategory: mainCategory._id,
                        order: i,
                        description: `${subcat.name} in ${mainCategory.name}`,
                    });
                    subcategoryIds.push(subcategory._id as mongoose.Types.ObjectId);
                    console.log(`   ➕ Created subcategory: ${subcategory.name}`);
                }

                // Update main category with subcategories
                mainCategory.subcategories = subcategoryIds;
                await mainCategory.save();
            }
        }

        const totalCategories = await Category.countDocuments();
        const mainCategories = await Category.countDocuments({ parentCategory: null });
        const subcategoriesCount = await Category.countDocuments({ parentCategory: { $ne: null } });

        console.log('\n✅ Category seeding completed!');
        console.log(`📊 Total categories: ${totalCategories}`);
        console.log(`📁 Main categories: ${mainCategories}`);
        console.log(`📂 Subcategories: ${subcategoriesCount}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding categories:', error);
        process.exit(1);
    }
};

seedCategories();
