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
 * This endpoint handles various transaction types, each with its own validation rules.
 * @name POST/api/transactions
 * @function
 * @memberof module:routes/transactions
 * @param {object} req - The Express request object.
 * @param {object} req.body - The request body.
 * @param {number} req.body.portfolioId - The ID of the portfolio.
 * @param {TransactionType} req.body.type - The type of transaction.
 * @param {AssetType} req.body.assetType - The type of asset.
 * @param {string} req.body.transactionDate - The date of the transaction (ISO 8601 format).
 * @param {number} [req.body.amount] - The total cash value of the transaction. Required for non-BUY/SELL types.
 * @param {string} [req.body.symbol] - The asset symbol. Required for BUY, SELL, DIVIDEND.
 * @param {number} [req.body.quantity] - The number of units. Required for BUY, SELL.
 * @param {number} [req.body.price] - The price per unit. Required for BUY, SELL.
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
      amount,
      transactionDate,
    } = req.body;

    // --- Basic Validation ---
    if (!portfolioId || !type || !assetType || !transactionDate) {
      return res.status(400).json({ error: 'Missing required fields: portfolioId, type, assetType, transactionDate' });
    }
    if (!Object.values(TransactionType).includes(type) || !Object.values(AssetType).includes(assetType)) {
      return res.status(400).json({ error: 'Invalid transaction type or asset type' });
    }

    let transactionData: any = {
      portfolioId,
      type,
      assetType,
      transactionDate: new Date(transactionDate),
    };

    // --- Type-specific Validation and Data Construction ---
    switch (type) {
      case TransactionType.BUY:
      case TransactionType.SELL:
        if (!symbol || quantity == null || price == null) {
          return res.status(400).json({ error: 'Missing required fields for BUY/SELL: symbol, quantity, price' });
        }
        transactionData.symbol = symbol;
        transactionData.quantity = quantity;
        transactionData.price = price;
        transactionData.amount = type === TransactionType.BUY ? -(quantity * price) : (quantity * price);
        break;

      case TransactionType.DIVIDEND:
        if (!symbol || amount == null) {
          return res.status(400).json({ error: 'Missing required fields for DIVIDEND: symbol, amount' });
        }
        transactionData.symbol = symbol;
        transactionData.amount = amount;
        break;

      case TransactionType.INTEREST:
      case TransactionType.CASH_DEPOSIT:
        if (amount == null) {
          return res.status(400).json({ error: 'Missing required field: amount' });
        }
        if (assetType !== AssetType.CASH) {
            return res.status(400).json({ error: 'AssetType must be CASH for this transaction type.' });
        }
        transactionData.amount = amount;
        break;

      case TransactionType.CASH_WITHDRAWAL:
      case TransactionType.FEES:
        if (amount == null) {
            return res.status(400).json({ error: 'Missing required field: amount' });
        }
        if (assetType !== AssetType.CASH) {
            return res.status(400).json({ error: 'AssetType must be CASH for this transaction type.' });
        }
        // Ensure amount is negative for withdrawals and fees
        transactionData.amount = -Math.abs(amount);
        break;

      default:
        return res.status(400).json({ error: 'Unsupported transaction type' });
    }

    const newTransaction = await prisma.transaction.create({
      data: transactionData,
    });
    res.status(201).json(newTransaction);
  } catch (error) {
    console.error(error); // Log the actual error for debugging
    res.status(400).json({ error: 'Failed to create transaction' });
  }
});

export default router;
