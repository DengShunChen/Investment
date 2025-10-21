/**
 * @file This file defines the routes for managing portfolios.
 * @module routes/portfolios
 */
import { Router } from 'express';
import prisma from '../lib/prisma';
import { calculateHoldings } from '../services/holdingsCalculator';
import { calculateTWR } from '../services/performanceCalculator';
import { generateReportData } from '../services/reportingService';

const router = Router();

/**
 * GET /api/portfolios - Get all portfolios.
 */
router.get('/', async (req, res) => {
  try {
    const portfolios = await prisma.portfolio.findMany({ include: { benchmark: true } });
    res.json(portfolios);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch portfolios' });
  }
});

/**
 * POST /api/portfolios - Create a new portfolio for a client.
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, clientId } = req.body;
    const newPortfolio = await prisma.portfolio.create({
      data: { name, description, clientId },
    });
    res.status(201).json(newPortfolio);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create portfolio' });
  }
});

/**
 * GET /api/clients/:clientId/portfolios - Get all portfolios for a specific client.
 */
router.get('/client/:clientId', async (req, res) => {
    try {
      const { clientId } = req.params;
      const portfolios = await prisma.portfolio.findMany({
        where: { clientId: parseInt(clientId) },
        include: { benchmark: true },
      });
      res.json(portfolios);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch portfolios for the client' });
    }
});

/**
 * PUT /api/portfolios/:id/benchmark - Assign a benchmark to a portfolio.
 */
router.put('/:id/benchmark', async (req, res) => {
  try {
    const { id } = req.params;
    const { benchmarkId } = req.body;

    if (benchmarkId == null) {
      return res.status(400).json({ error: 'benchmarkId is a required field.' });
    }

    const updatedPortfolio = await prisma.portfolio.update({
      where: { id: parseInt(id) },
      data: { benchmarkId: parseInt(benchmarkId) },
      include: { benchmark: true },
    });

    res.json(updatedPortfolio);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to assign benchmark. Ensure both portfolio and benchmark exist.' });
  }
});

/**
 * GET /api/portfolios/:id/holdings - Calculate and get holdings for a specific portfolio.
 */
router.get('/:id/holdings', async (req, res) => {
    try {
      const { id } = req.params;
      const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : undefined;
      const holdings = await calculateHoldings(parseInt(id), asOfDate);
      res.json(holdings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to calculate holdings' });
    }
});

/**
 * GET /api/portfolios/:id/performance - Get performance metrics for a portfolio.
 */
router.get('/:id/performance', async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate query parameters are required.' });
        }

        const portfolioTWR = await calculateTWR(parseInt(id), new Date(startDate as string), new Date(endDate as string));

        const portfolio = await prisma.portfolio.findUnique({ where: { id: parseInt(id) } });
        let benchmarkPerformance = null;
        if (portfolio?.benchmarkId) {
            const benchmarkHistory = await prisma.benchmarkPriceHistory.findMany({
                where: {
                    benchmarkId: portfolio.benchmarkId,
                    date: { in: [new Date(startDate as string), new Date(endDate as string)] },
                },
                orderBy: { date: 'asc' },
            });

            if (benchmarkHistory.length === 2) {
                const startPrice = benchmarkHistory[0].price;
                const endPrice = benchmarkHistory[1].price;
                benchmarkPerformance = ((endPrice - startPrice) / startPrice) * 100;
            }
        }

        res.json({
            portfolioTWR,
            benchmarkPerformance,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to calculate performance.' });
    }
});

/**
 * GET /api/portfolios/:id/report - Generate data for a client report.
 * @name GET/api/portfolios/:id/report
 * @function
 * @memberof module:routes/portfolios
 * @param {object} req - The Express request object.
 * @param {object} req.params - The route parameters.
 * @param {string} req.params.id - The ID of the portfolio.
 * @param {object} req.query - The query parameters.
 * @param {string} req.query.startDate - The start date for the report (YYYY-MM-DD).
 * @param {string} req.query.endDate - The end date for the report (YYYY-MM-DD).
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.get('/:id/report', async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate query parameters are required.' });
        }

        const reportData = await generateReportData(parseInt(id), new Date(startDate as string), new Date(endDate as string));
        res.json(reportData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: `Failed to generate report data: ${error.message}` });
    }
});


/**
 * GET /api/portfolios/:id - Get a single portfolio by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: parseInt(id) },
      include: { benchmark: true },
    });
    if (portfolio) {
      res.json(portfolio);
    } else {
      res.status(404).json({ error: 'Portfolio not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

export default router;
