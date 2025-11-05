import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import { config } from '../config/env.js';

export async function runMigration(options?: { force?: boolean }) {
    const mongoUri = config.mongoUri;
    const force = options?.force === true;

    await mongoose.connect(mongoUri, { dbName: undefined });
    const db = mongoose.connection.db as any;
    if (!db) throw new Error('Failed to get DB handle from mongoose connection');

    async function ensureCollection(name: string) {
        const exists = await db.listCollections({ name }).toArray();
        if (exists.length === 0) {
            await db.createCollection(name);
        }
    }

    async function createIndexes() {
        // Helper that only creates the index when an identical key doesn't already exist.
        async function ensureIndex(collectionName: string, keySpec: any, options: any = {}) {
            const coll = db.collection(collectionName);
            try {
                const existing = await coll.indexes();
                const keyJson = JSON.stringify(keySpec);
                const found = existing.some((ix: any) => JSON.stringify(ix.key) === keyJson);
                if (found) {
                    // existing index with same key exists; skip creation
                    return;
                }
                await coll.createIndex(keySpec, options);
            } catch (err: any) {
                // If index creation fails due to an existing index/name clash, ignore and continue
                const msg = String(err && err.message || err);
                if (msg.includes('same name') || msg.includes('already exists') || msg.includes('IndexExists')) {
                    return;
                }
                throw err;
            }
        }

        // Users
        await ensureIndex('users', { email: 1 }, { unique: true, sparse: true });
        await ensureIndex('users', { role: 1 });

        // Listings
        await ensureIndex('listings', { ownerId: 1 });
        await ensureIndex('listings', { category: 1 });
        await ensureIndex('listings', { location: 1 });
        await ensureIndex('listings', { price: 1 });
        await ensureIndex('listings', { status: 1 });
        await ensureIndex('listings', { approvalStatus: 1 });
        await ensureIndex('listings', { condition: 1 });
        await ensureIndex('listings', { views: -1 });
        await ensureIndex('listings', { title: 'text', description: 'text' });
        await ensureIndex('listings', { createdAt: -1 });

        // Payments
        await ensureIndex('payments', { userId: 1 });
        await ensureIndex('payments', { status: 1 });
        await ensureIndex('payments', { createdAt: -1 });

        // Reports
        await ensureIndex('reports', { targetId: 1 });
        await ensureIndex('reports', { createdAt: -1 });

        // Categories
        await ensureIndex('categories', { slug: 1 }, { unique: true, sparse: true });

        // Messages
        await ensureIndex('messages', { fromId: 1 });
        await ensureIndex('messages', { toId: 1 });
        await ensureIndex('messages', { listingId: 1 });
        await ensureIndex('messages', { createdAt: -1 });

        // Favorites
        await ensureIndex('favorites', { userId: 1 });
        await ensureIndex('favorites', { listingId: 1 });
        await ensureIndex('favorites', { createdAt: -1 });
    }

    try {
        // Ensure collections
        const names = ['users', 'listings', 'payments', 'reports', 'categories', 'messages', 'favorites'];
        for (const n of names) await ensureCollection(n);

        await createIndexes();

        // Seed only when users empty unless force
        const usersCount = await db.collection('users').countDocuments();
        if (usersCount > 0 && !force) {
            return { skipped: true, reason: 'users_exist' };
        }

        if (force) {
            await Promise.all([
                db.collection('users').deleteMany({}),
                db.collection('listings').deleteMany({}),
                db.collection('payments').deleteMany({}),
                db.collection('reports').deleteMany({}),
                db.collection('categories').deleteMany({}),
                db.collection('messages').deleteMany({}),
                db.collection('favorites').deleteMany({}),
            ]);
        }

        const password = 'Password123!';
        const passwordHash = await bcrypt.hash(password, 10);

        const users: any[] = [];
        for (let i = 0; i < 5; i++) {
            users.push({
                name: faker.person.fullName(),
                email: `user${i + 1}@example.com`,
                passwordHash,
                role: i === 0 ? 'admin' : 'user',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                phone: faker.phone.number(),
                location: faker.location.city(),
                adCredits: Math.floor(Math.random() * 50),
                totalSpent: parseFloat((Math.random() * 500).toFixed(2)),
            });
        }

        const insertUsers = await db.collection('users').insertMany(users);
        const userIds = Object.values(insertUsers.insertedIds) as any[];

        const categoriesList = ['Electronics', 'Furniture', 'Vehicles', 'Fashion', 'Home', 'Books'];
        const categoryDocs = categoriesList.map((n) => ({ name: n, slug: n.toLowerCase().replace(/\s+/g, '-'), createdAt: new Date(), updatedAt: new Date() }));
        await db.collection('categories').insertMany(categoryDocs);

        const listings: any[] = [];
        for (let i = 0; i < 10; i++) {
            const owner = userIds[i % userIds.length];
            listings.push({
                title: faker.commerce.productName(),
                description: faker.commerce.productDescription(),
                price: Number((Math.random() * 1000 + 10).toFixed(2)),
                category: categoriesList[i % categoriesList.length],
                location: faker.location.city(),
                images: [],
                ownerId: owner,
                status: 'active',
                approvalStatus: 'approved',
                condition: 'good',
                views: Math.floor(Math.random() * 1000),
                isApproved: true,
                priority: 'standard',
                paidAmount: 0,
                paymentStatus: 'free',
                viewCount: Math.floor(Math.random() * 500),
                featuredViewCount: 0,
                impressions: Math.floor(Math.random() * 1000),
                favoriteCount: Math.floor(Math.random() * 100),
                messageCount: Math.floor(Math.random() * 20),
                clickThroughRate: parseFloat((Math.random() * 100).toFixed(2)),
                isPaid: false,
                isPromoted: false,
                autoRenew: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        const insertListings = await db.collection('listings').insertMany(listings);
        const listingIds = Object.values(insertListings.insertedIds) as any[];

        const messages: any[] = [];
        for (let i = 0; i < 15; i++) {
            const fromIndex = Math.floor(Math.random() * userIds.length);
            let toIndex = Math.floor(Math.random() * userIds.length);
            if (toIndex === fromIndex) toIndex = (toIndex + 1) % userIds.length;
            messages.push({
                fromId: userIds[fromIndex],
                toId: userIds[toIndex],
                listingId: listingIds[i % listingIds.length],
                content: faker.lorem.sentences(2),
                read: Math.random() > 0.5,
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24)),
                updatedAt: new Date(),
            });
        }
        await db.collection('messages').insertMany(messages);

        const favorites: any[] = [];
        for (let i = 0; i < 12; i++) {
            favorites.push({
                userId: userIds[i % userIds.length],
                listingId: listingIds[i % listingIds.length],
                createdAt: new Date(),
            });
        }
        await db.collection('favorites').insertMany(favorites);

        const payments: any[] = [];
        for (let i = 0; i < 5; i++) {
            payments.push({
                userId: userIds[i % userIds.length],
                amount: Number((Math.random() * 200 + 5).toFixed(2)),
                currency: 'INR',
                provider: 'razorpay',
                status: 'completed',
                metadata: {},
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        await db.collection('payments').insertMany(payments);

        const reports: any[] = [];
        for (let i = 0; i < 3; i++) {
            reports.push({
                reporterId: userIds[(i + 1) % userIds.length],
                targetId: listingIds[i % listingIds.length],
                reason: 'Inappropriate content',
                details: faker.lorem.sentence(),
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        await db.collection('reports').insertMany(reports);

        return { skipped: false, sampleUser: { email: 'user1@example.com', password } };
    } finally {
        await mongoose.disconnect();
    }
}
