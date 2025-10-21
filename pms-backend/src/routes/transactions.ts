import { Router } from 'express';
import prisma from '../lib/prisma';
import { AssetType, TransactionType } from '@prisma/client';

const router = Router();

// GET /api/transactions/portfolio/:portfolioId - Get all transactions for a portfolio
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

// POST /api/transactions - Create a new transaction
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
