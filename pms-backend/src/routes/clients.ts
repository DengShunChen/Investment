/**
 * @file This file defines the routes for managing clients.
 * @module routes/clients
 */
import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

/**
 * GET /api/clients - Get all clients, including their interaction logs.
 */
router.get('/', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      include: { interactionLogs: true },
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

/**
 * POST /api/clients - Create a new client.
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, riskProfile, investmentObjectives, notes } = req.body;
    if (!name || !email || !riskProfile) {
        return res.status(400).json({ error: 'Missing required fields: name, email, riskProfile' });
    }
    const newClient = await prisma.client.create({
      data: { name, email, riskProfile, investmentObjectives, notes },
    });
    res.status(201).json(newClient);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create client. Email may already exist.' });
  }
});

/**
 * GET /api/clients/:id - Get a single client by ID, including their interaction logs.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      include: { interactionLogs: true, portfolios: true },
    });
    if (client) {
      res.json(client);
    } else {
      res.status(404).json({ error: 'Client not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

/**
 * PUT /api/clients/:id - Update a client's profile.
 * @name PUT/api/clients/:id
 * @function
 * @memberof module:routes/clients
 * @param {object} req - The Express request object.
 * @param {object} req.params - The route parameters.
 * @param {string} req.params.id - The ID of the client.
 * @param {object} req.body - The request body containing the fields to update.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, riskProfile, investmentObjectives, notes } = req.body;

        const updatedClient = await prisma.client.update({
            where: { id: parseInt(id) },
            data: {
                name,
                email,
                riskProfile,
                investmentObjectives,
                notes,
            },
        });
        res.json(updatedClient);
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Failed to update client.' });
    }
});


export default router;
