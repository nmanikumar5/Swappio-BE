const mongoose = require('mongoose');

// Sample data for seeding
const sampleListings = [
  {
    title: "iPhone 13 Pro Max 256GB",
    description: "Excellent condition iPhone 13 Pro Max. Sierra Blue color. Battery health 95%. Includes original box and charger. No scratches on screen. AppleCare+ valid till Dec 2025.",
    price: 65000,
    category: "electronics",
    location: "Bangalore, Karnataka",
    images: ["https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 145
  },
  {
    title: "MacBook Pro M2 14-inch 512GB",
    description: "Like new MacBook Pro M2. Space Gray. 16GB RAM, 512GB SSD. Barely used for 3 months. All accessories included. AppleCare+ till 2026.",
    price: 145000,
    category: "electronics",
    location: "Mumbai, Maharashtra",
    images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 289
  },
  {
    title: "Royal Enfield Classic 350 2021",
    description: "Well maintained Classic 350. Single owner. All service records available. New tires fitted. 15,000 km driven. Finance available.",
    price: 135000,
    category: "vehicles",
    location: "Pune, Maharashtra",
    images: ["https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 567
  },
  {
    title: "2BHK Furnished Apartment",
    description: "Spacious 2BHK in prime location. Fully furnished with modular kitchen. Gym, swimming pool, and parking included. Ready to move in.",
    price: 25000,
    category: "real-estate",
    location: "Gurgaon, Haryana",
    images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 423
  },
  {
    title: "Sony PlayStation 5 with 2 Controllers",
    description: "PS5 Disc Edition. 1 year old. Excellent condition. Comes with 2 DualSense controllers and 3 games (FIFA 23, God of War, Spider-Man).",
    price: 42000,
    category: "electronics",
    location: "Delhi, Delhi",
    images: ["https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 892
  },
  {
    title: "Gaming Laptop - ASUS ROG Strix",
    description: "RTX 3060, i7 11th Gen, 16GB RAM, 512GB SSD. Perfect for gaming and video editing. RGB keyboard. Cooling pad included.",
    price: 85000,
    category: "electronics",
    location: "Hyderabad, Telangana",
    images: ["https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 334
  },
  {
    title: "Vintage Wooden Dining Table Set",
    description: "Beautiful teak wood dining table with 6 chairs. Handcrafted. 20 years old but in excellent condition. Perfect for antique lovers.",
    price: 35000,
    category: "furniture",
    location: "Chennai, Tamil Nadu",
    images: ["https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 156
  },
  {
    title: "Canon EOS R6 Camera Body",
    description: "Professional mirrorless camera. 20MP full frame sensor. Barely used - only 5000 shutter count. Comes with 2 batteries and charger.",
    price: 165000,
    category: "electronics",
    location: "Bangalore, Karnataka",
    images: ["https://images.unsplash.com/photo-1606462940291-4c60ca686afe?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 234
  },
  {
    title: "Mountain Bike - Firefox 27.5\"",
    description: "21-speed mountain bike. Aluminum frame. Disc brakes. Recently serviced. Perfect for weekend rides. Helmet included free.",
    price: 15000,
    category: "sports",
    location: "Kolkata, West Bengal",
    images: ["https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 445
  },
  {
    title: "Acoustic Guitar - Yamaha F310",
    description: "Beginner-friendly acoustic guitar. Good condition. Includes soft case, extra strings, and picks. Great for learning.",
    price: 6500,
    category: "music",
    location: "Mumbai, Maharashtra",
    images: ["https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 178
  },
  {
    title: "4-Seater Sofa Set - L-Shape",
    description: "Modern L-shaped sofa in grey fabric. Very comfortable. 2 years old but looks new. Delivery available within city.",
    price: 28000,
    category: "furniture",
    location: "Pune, Maharashtra",
    images: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 267
  },
  {
    title: "Smart Watch - Apple Watch Series 7",
    description: "45mm Midnight Aluminum case. GPS + Cellular. All bands included (Sport, Leather, Milanese). Battery health 98%.",
    price: 28000,
    category: "electronics",
    location: "Bangalore, Karnataka",
    images: ["https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 512
  },
  {
    title: "Office Desk with Storage",
    description: "Spacious office desk with built-in drawers. Engineered wood. Dark walnut finish. Perfect for home office setup.",
    price: 8500,
    category: "furniture",
    location: "Noida, Uttar Pradesh",
    images: ["https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 189
  },
  {
    title: "Honda Activa 6G Scooter",
    description: "2022 model. Excellent mileage. Single owner. Regular servicing done. All papers clear. Insurance valid till 2025.",
    price: 58000,
    category: "vehicles",
    location: "Jaipur, Rajasthan",
    images: ["https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 678
  },
  {
    title: "Textbooks Bundle - Engineering 1st Year",
    description: "Complete set of engineering first year textbooks. All subjects covered. Minimal highlighting. Perfect condition.",
    price: 2500,
    category: "books",
    location: "Chennai, Tamil Nadu",
    images: ["https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 234
  },
  {
    title: "DSLR Camera - Nikon D5600",
    description: "18-55mm kit lens included. 24MP sensor. Touchscreen LCD. Perfect for beginners and enthusiasts. Camera bag included.",
    price: 38000,
    category: "electronics",
    location: "Ahmedabad, Gujarat",
    images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 345
  },
  {
    title: "Treadmill - Powermax Fitness",
    description: "Motorized treadmill with multiple speed settings. Foldable design. Barely used. Perfect for home gym. Free installation.",
    price: 22000,
    category: "sports",
    location: "Mumbai, Maharashtra",
    images: ["https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 456
  },
  {
    title: "Designer Kurta Set - Men's Wear",
    description: "Premium cotton kurta with churidar. Royal blue with golden embroidery. Size L. Worn only once for wedding. Dry cleaned.",
    price: 3500,
    category: "fashion",
    location: "Lucknow, Uttar Pradesh",
    images: ["https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 123
  },
  {
    title: "Kids Bicycle - 16 inch with Training Wheels",
    description: "Colorful kids bicycle for ages 5-8. Training wheels attached. Bell and basket included. Very good condition.",
    price: 4500,
    category: "sports",
    location: "Bangalore, Karnataka",
    images: ["https://images.unsplash.com/photo-1558085773-98bb3f42d314?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 267
  },
  {
    title: "Samsung 55\" 4K Smart TV",
    description: "Crystal UHD 4K TV. HDR support. Smart Hub with all apps. 1 year warranty remaining. Wall mount included.",
    price: 42000,
    category: "electronics",
    location: "Delhi, Delhi",
    images: ["https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800"],
    status: "active",
    approvalStatus: "approved",
    views: 789
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swappio';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get collections
    const db = mongoose.connection.db;
    const listingsCollection = db.collection('listings');
    const usersCollection = db.collection('users');

    // Check if we have any users
    const userCount = await usersCollection.countDocuments();
    if (userCount === 0) {
      console.log('⚠️  No users found. Creating a default user...');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const defaultUser = await usersCollection.insertOne({
        name: 'Demo User',
        email: 'demo@swappio.com',
        phone: '+919876543210',
        password: hashedPassword,
        role: 'user',
        location: 'Bangalore, Karnataka',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ Default user created:', defaultUser.insertedId);
    }

    // Get first user to use as owner
    const firstUser = await usersCollection.findOne({});
    if (!firstUser) {
      console.error('❌ No user found to assign listings to');
      process.exit(1);
    }

    console.log('👤 Using user:', firstUser.email);

    // Clear existing listings (optional)
    const existingCount = await listingsCollection.countDocuments();
    console.log(`�� Found ${existingCount} existing listings`);
    
    // Add ownerId and timestamps to sample listings
    const listingsWithOwner = sampleListings.map(listing => ({
      ...listing,
      ownerId: firstUser._id,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      updatedAt: new Date()
    }));

    // Insert sample listings
    const result = await listingsCollection.insertMany(listingsWithOwner);
    console.log(`✅ Successfully inserted ${result.insertedCount} sample listings`);

    // Summary
    const categoryCount = await listingsCollection.aggregate([
      { $match: { approvalStatus: 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('\n📊 Listings by category:');
    categoryCount.forEach(cat => {
      console.log(`   ${cat._id}: ${cat.count} listings`);
    });

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('You can now view these listings in your application.');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

seedDatabase();
