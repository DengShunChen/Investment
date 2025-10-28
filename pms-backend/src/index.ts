/**
 * @file This file is the main entry point for the Portfolio Management System (PMS) API.
 * It sets up the Express server, configures middleware, and defines the API routes.
 * @module index
 */
import express, { Request, Response, NextFunction } from 'express';
import clientRoutes from './routes/clients';
import portfolioRoutes from './routes/portfolios';
import transactionRoutes from './routes/transactions';
import benchmarkRoutes from './routes/benchmarks';
import interactionRoutes from './routes/interactions';
import modelRoutes from './routes/models';
import authRoutes from './routes/auth'; // Import auth routes
import logger from './lib/logger'; // Import the structured logger

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware for structured request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      message: 'Request processed',
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});


// API Routes
app.use('/api/clients', clientRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/benchmarks', benchmarkRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/auth', authRoutes); // Add auth routes

/**
 * GET / - A simple health check endpoint.
 * @name GET/
 * @function
 * @memberof module:index
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
app.get('/', (req, res) => {
  res.send('Portfolio Management System API is running...');
});

try {
  app.listen(port, () => {
    logger.info(`Server is running on http://localhost:${port}`);
  });
} catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
}
