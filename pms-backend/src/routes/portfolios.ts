/**
 * @file This file defines the routes for managing portfolios.
 * @module routes/portfolios
 */
import { Router } from 'express';
import prisma from '../lib/prisma';
import { calculateHoldings } from '../services/holdingsCalculator';

const router = Router();

/**
 * GET /api/portfolios - Get all portfolios.
 * @name GET/api/portfolios
 * @function
 * @memberof module:routes/portfolios
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.get('/', async (req, res) => {
  try {
    const portfolios = await prisma.portfolio.findMany();
    res.json(portfolios);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch portfolios' });
  }
});

/**
 * POST /api/portfolios - Create a new portfolio for a client.
 * @name POST/api/portfolios
 * @function
 * @memberof module:routes/portfolios
 * @param {object} req - The Express request object.
 * @param {object} req.body - The request body.
 * @param {string} req.body.name - The name of the portfolio.
 * @param {string} req.body.description - The description of the portfolio.
 * @param {number} req.body.clientId - The ID of the client.
 * @param {object} res - The Express response object.
 * @returns {void}
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
 * @name GET/api/clients/:clientId/portfolios
 * @function
 * @memberof module:routes/portfolios
 * @param {object} req - The Express request object.
 * @param {object} req.params - The route parameters.
 * @param {string} req.params.clientId - The ID of the client.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.get('/client/:clientId', async (req, res) => {
    try {
      const { clientId } = req.params;
      const portfolios = await prisma.portfolio.findMany({
        where: { clientId: parseInt(clientId) },
      });
      res.json(portfolios);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch portfolios for the client' });
    }
});

/**
 * GET /api/portfolios/:id/holdings - Calculate and get holdings for a specific portfolio.
 * @name GET/api/portfolios/:id/holdings
 * @function
 * @memberof module:routes/portfolios
 * @param {object} req - The Express request object.
 * @param {object} req.params - The route parameters.
 * @param {string} req.params.id - The ID of the portfolio.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.get('/:id/holdings', async (req, res) => {
    try {
      const { id } = req.params;
      const holdings = await calculateHoldings(parseInt(id));
      res.json(holdings);
    } catch (error) {
      console.error(error); // Log error for debugging
      res.status(500).json({ error: 'Failed to calculate holdings' });
    }
});

/**
 * GET /api/portfolios/:id - Get a single portfolio by ID.
 * @name GET/api/portfolios/:id
 * @function
 * @memberof module:routes/portfolios
 * @param {object} req - The Express request object.
 * @param {object} req.params - The route parameters.
 * @param {string} req.params.id - The ID of the portfolio.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: parseInt(id) },
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
