import mongoose from 'mongoose';
const { MongoClient, ServerApiVersion } = require('mongodb');
import { config } from './env';

export const connectDatabase = async (): Promise<void> => {
  // try {
  //   await mongoose.connect(config.mongoUri);
  //   console.log('✅ MongoDB connected successfully');
  // } catch (error) {
  //   console.error('❌ MongoDB connection error:', error);
  //   process.exit(1);
  // }

  const client = new MongoClient(config.mongoUri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
      await client.close();
    }
  }
  run().catch(console.dir);
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});


mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});
