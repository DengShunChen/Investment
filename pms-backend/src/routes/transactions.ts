/**
 * @file This file defines the routes for managing transactions.
 * @module routes/transactions
 */
import { Router } from 'express';
import prisma from '../lib/prisma';
import { AssetType, TransactionType } from '@prisma/client';

const router = Router();

/**
 * GET /api/transactions/portfolio/:portfolioId - Get all transactions for a portfolio.
 * @name GET/api/transactions/portfolio/:portfolioId
 * @function
 * @memberof module:routes/transactions
 * @param {object} req - The Express request object.
 * @param {object} req.params - The route parameters.
 * @param {string} req.params.portfolioId - The ID of the portfolio.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.get('/portfolio/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const transactions = await prisma.transaction.findMany({
      where: { portfolioId: parseInt(portfolioId) },
      orderBy: { transactionDate: 'desc' },
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * POST /api/transactions - Create a new transaction.
 * @name POST/api/transactions
 * @function
 * @memberof module:routes/transactions
 * @param {object} req - The Express request object.
 * @param {object} req.body - The request body.
 * @param {number} req.body.portfolioId - The ID of the portfolio.
 * @param {string} req.body.type - The type of the transaction (e.g., BUY, SELL).
 * @param {string} req.body.assetType - The type of the asset (e.g., STOCK, BOND).
 * @param {string} req.body.symbol - The symbol of the asset.
 * @param {number} req.body.quantity - The quantity of the asset.
 * @param {number} req.body.price - The price of the asset.
 * @param {string} req.body.transactionDate - The date of the transaction.
 * @param {number} req.body.fees - The fees for the transaction.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.post('/', async (req, res) => {
  try {
    const {
      portfolioId,
      type,
      assetType,
      symbol,
      quantity,
      price,
      transactionDate,
      fees,
    } = req.body;

    // Basic validation
    if (!Object.values(TransactionType).includes(type) || !Object.values(AssetType).includes(assetType)) {
      return res.status(400).json({ error: 'Invalid transaction type or asset type' });
    }

    const newTransaction = await prisma.transaction.create({
      data: {
        portfolioId,
        type,
        assetType,
        symbol,
        quantity,
        price,
        transactionDate: new Date(transactionDate),
        fees,
      },
    });
    res.status(201).json(newTransaction);
  } catch (error) {
    console.error(error); // Log the actual error for debugging
    res.status(400).json({ error: 'Failed to create transaction' });
  }
});

export default router;
