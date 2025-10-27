/**
 * @file This file defines the routes for managing Model Portfolios.
 * @module routes/models
 */
import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

/**
 * GET /api/models - Get all model portfolios and their asset allocations.
 */
router.get('/', async (req, res) => {
  try {
    const models = await prisma.modelPortfolio.findMany({
      include: { assets: true },
    });
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch model portfolios' });
  }
});

/**
 * POST /api/models - Create a new model portfolio.
 * @param {string} req.body.name - The name of the model (e.g., "Aggressive Growth").
 * @param {string} [req.body.description] - A description for the model.
 * @param {object[]} req.body.assets - An array of asset allocation objects.
 * @param {string} req.body.assets[].symbol - The asset's ticker symbol.
 * @param {AssetType} req.body.assets[].assetType - The type of the asset.
 * @param {number} req.body.assets[].targetPercentage - The target weight (e.g., 0.6 for 60%).
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, assets } = req.body;

    if (!name || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ error: 'Name and a non-empty assets array are required.' });
    }

    // Optional: Validate that percentages add up to 1.0 (or 100)
    const totalPercentage = assets.reduce((acc, asset) => acc + asset.targetPercentage, 0);
    if (Math.abs(totalPercentage - 1.0) > 0.001) { // Using epsilon for float comparison
        return res.status(400).json({ error: 'Asset target percentages must sum to 1.0.' });
    }

    const newModel = await prisma.modelPortfolio.create({
      data: {
        name,
        description,
        assets: {
          create: assets.map(asset => ({
            symbol: asset.symbol,
            assetType: asset.assetType,
            targetPercentage: asset.targetPercentage,
          })),
        },
      },
      include: { assets: true },
    });
    res.status(201).json(newModel);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to create model portfolio. Name may already exist.' });
  }
});

/**
 * GET /api/models/:id - Get a single model portfolio by ID.
 */
router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const model = await prisma.modelPortfolio.findUnique({
        where: { id: parseInt(id) },
        include: { assets: true },
      });
      if (model) {
        res.json(model);
      } else {
        res.status(404).json({ error: 'Model portfolio not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch model portfolio' });
    }
});

export default router;
