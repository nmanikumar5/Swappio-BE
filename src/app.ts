import express, { Application } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { initializeSocket } from './config/socket.js';
import { errorHandler } from './middleware/error.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import olaRoutes from './routes/olaRoutes.js';
import mapboxRoutes from './routes/mapboxRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import configRoutes from './routes/configRoutes.js';
import configPublicRoutes from './routes/configPublicRoutes.js';
import footerRoutes from './routes/footerRoutes.js';
import pageRoutes from './routes/pageRoutes.js';
import contactRoutes from './routes/contactRoutes.js';

// Initialize express app
const app: Application = express();

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(httpServer);

// Make io accessible to routes
app.set('io', io);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  // windowMs: config.rateLimit.windowMs,
  // max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
// app.use('/api');

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files for local testing
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Compression middleware
app.use(compression());

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ola', olaRoutes);
app.use('/api/mapbox', mapboxRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/config', configPublicRoutes);
app.use('/api/admin/config', configRoutes);
app.use('/api/footer', footerRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/contact', contactRoutes);

// 404 handler
// Use app.use with no path so Express doesn't parse the route string with path-to-regexp
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    httpServer.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════╗
║                                        ║
║   🚀 Swappio Backend Server Started   ║
║                                        ║
║   Environment: ${config.nodeEnv.padEnd(24)} ║
║   Port: ${String(config.port).padEnd(31)} ║
║   Database: Connected ✅               ║
║   Socket.io: Enabled ✅                ║
║                                        ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Promise Rejection:', err);
  httpServer.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Start the server
startServer();

export default app;
