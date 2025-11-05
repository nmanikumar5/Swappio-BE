/**
 * Script to make a user an admin
 * Usage: node scripts/makeAdmin.js <email>
 * Example: node scripts/makeAdmin.js manikumar@example.com
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Simple User schema for this script
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String,
    isActive: Boolean,
    createdAt: Date,
});

const User = mongoose.model('User', userSchema);

async function makeAdmin(email) {
    try {
        // Connect to MongoDB
        const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/swappio';
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(dbUri);
        console.log('✅ Connected to MongoDB\n');

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            console.error(`❌ User with email "${email}" not found!`);
            console.log('\n💡 Available users:');
            const allUsers = await User.find({}, 'name email role').limit(10);
            allUsers.forEach(u => {
                console.log(`   - ${u.email} (${u.name}) - Role: ${u.role}`);
            });
            process.exit(1);
        }

        console.log(`👤 Found user: ${user.name} (${user.email})`);
        console.log(`📋 Current role: ${user.role}`);

        if (user.role === 'admin') {
            console.log('✅ User is already an admin!');
            process.exit(0);
        }

        // Update user role to admin
        console.log('\n🔄 Updating user role to admin...');
        await User.updateOne(
            { _id: user._id },
            { $set: { role: 'admin' } }
        );

        console.log('✅ Successfully updated user role to admin!');

        // Verify the update
        const updatedUser = await User.findById(user._id);
        console.log(`\n✅ Verified - New role: ${updatedUser.role}`);
        console.log(`\n🎉 ${user.name} is now an admin!`);
        console.log('\n💡 You can now login and access /admin page');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
    console.error('❌ Error: Email is required');
    console.log('\n📖 Usage: node scripts/makeAdmin.js <email>');
    console.log('📖 Example: node scripts/makeAdmin.js manikumar@example.com');
    process.exit(1);
}

makeAdmin(email);
