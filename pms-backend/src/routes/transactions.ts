/**
 * @file This file defines the routes for managing transactions.
 * @module routes/transactions
 */
import { Router } from 'express';
import prisma from '../lib/prisma';
import multer from 'multer';
import { AssetType, TransactionType } from '@prisma/client';
import { processCsvImport } from '../services/batchImportService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/transactions/batch-import/:portfolioId - Batch import transactions from a CSV file.
 * @name POST/api/transactions/batch-import/:portfolioId
 * @param {string} req.params.portfolioId - The ID of the portfolio.
 * @param {object} req.file - The uploaded CSV file.
 */
router.post('/batch-import/:portfolioId', upload.single('file'), async (req, res) => {
    try {
        const { portfolioId } = req.params;
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const result = await processCsvImport(req.file.buffer, parseInt(portfolioId));
        res.status(201).json({ message: `${result.createdCount} transactions imported successfully.` });

    } catch (error) {
        console.error('Batch import failed:', error);
        if (error instanceof Error) {
            res.status(500).json({ error: `Batch import failed: ${error.message}` });
        } else {
            res.status(500).json({ error: 'An unknown error occurred during batch import.' });
        }
    }
});


// --- Existing Routes ---

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
    console.error(error);
    res.status(400).json({ error: 'Failed to create transaction' });
  }
});

export default router;
