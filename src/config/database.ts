import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDatabase = async (): Promise<void> => {
  try {
    // Wait until mongoose finishes connecting before returning. This ensures
    // the rest of the app (routes/controllers) will not attempt DB ops while
    // the connection is still pending which caused buffering timeouts.
    await mongoose.connect(config.mongoUri, {
      // Fail faster if the server is unreachable (ms)
      serverSelectionTimeoutMS: 10000,
      // Other recommended options can be provided here if needed
    });

    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Exit process so a supervisor (PM2/container orchestrator) can restart.
    process.exit(1);
  }
};

mongoose.connection.on('connected', () => {
  console.log('Mongoose connection open');
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose connection disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});
