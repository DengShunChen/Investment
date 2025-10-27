/**
 * @file This file defines the routes for managing benchmarks.
 * @module routes/benchmarks
 */
import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

/**
 * GET /api/benchmarks - Get all benchmarks.
 * @name GET/api/benchmarks
 * @function
 * @memberof module:routes/benchmarks
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.get('/', async (req, res) => {
  try {
    const benchmarks = await prisma.benchmark.findMany();
    res.json(benchmarks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch benchmarks' });
  }
});

/**
 * POST /api/benchmarks - Create a new benchmark.
 * @name POST/api/benchmarks
 * @function
 * @memberof module:routes/benchmarks
 * @param {object} req - The Express request object.
 * @param {object} req.body - The request body.
 * @param {string} req.body.name - The name of the benchmark (e.g., "S&P 500").
 * @param {string} [req.body.description] - A description for the benchmark.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is a required field.' });
    }
    const newBenchmark = await prisma.benchmark.create({
      data: { name, description },
    });
    res.status(201).json(newBenchmark);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create benchmark. Name may already exist.' });
  }
});

/**
 * POST /api/benchmarks/:id/history - Add historical price data for a benchmark.
 * Expects an array of price history objects in the request body.
 * @name POST/api/benchmarks/:id/history
 * @function
 * @memberof module:routes/benchmarks
 * @param {object} req - The Express request object.
 * @param {object} req.params - The route parameters.
 * @param {string} req.params.id - The ID of the benchmark.
 * @param {object[]} req.body.history - Array of price history points.
 * @param {string} req.body.history[].date - The date of the price point (YYYY-MM-DD).
 * @param {number} req.body.history[].price - The closing price for that date.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.post('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { history } = req.body; // Expects an array of { date: 'YYYY-MM-DD', price: 123.45 }

    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ error: 'History must be a non-empty array.' });
    }

    const dataToCreate = history.map(item => ({
      benchmarkId: parseInt(id),
      date: new Date(item.date),
      price: item.price,
    }));

    // Use createMany to bulk insert the history
    const result = await prisma.benchmarkPriceHistory.createMany({
      data: dataToCreate,
      skipDuplicates: true, // Avoid errors if a date already exists
    });

    res.status(201).json({ message: `${result.count} history points added.` });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to add benchmark history.' });
  }
});

export default router;
