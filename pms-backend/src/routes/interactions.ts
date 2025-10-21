/**
 * @file This file defines the routes for managing client interaction logs.
 * @module routes/interactions
 */
import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

/**
 * GET /api/interactions/client/:clientId - Get all interaction logs for a specific client.
 * @name GET/api/interactions/client/:clientId
 * @function
 * @memberof module:routes/interactions
 * @param {object} req - The Express request object.
 * @param {object} req.params - The route parameters.
 * @param {string} req.params.clientId - The ID of the client.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const logs = await prisma.interactionLog.findMany({
      where: { clientId: parseInt(clientId) },
      orderBy: { date: 'desc' },
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch interaction logs' });
  }
});

/**
 * POST /api/interactions - Create a new interaction log for a client.
 * @name POST/api/interactions
 * @function
 * @memberof module:routes/interactions
 * @param {object} req - The Express request object.
 * @param {object} req.body - The request body.
 * @param {number} req.body.clientId - The ID of the client.
 * @param {string} req.body.date - The date of the interaction (YYYY-MM-DD).
 * @param {string} req.body.type - The type of interaction (e.g., "Meeting", "Call").
 * @param {string} req.body.summary - A summary of the interaction.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.post('/', async (req, res) => {
  try {
    const { clientId, date, type, summary } = req.body;
    if (!clientId || !date || !type || !summary) {
      return res.status(400).json({ error: 'Missing required fields: clientId, date, type, summary' });
    }

    const newLog = await prisma.interactionLog.create({
      data: {
        clientId,
        date: new Date(date),
        type,
        summary,
      },
    });
    res.status(201).json(newLog);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to create interaction log.' });
  }
});

export default router;
