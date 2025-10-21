/**
 * @file This file defines the routes for managing clients.
 * @module routes/clients
 */
import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

/**
 * GET /api/clients - Get all clients.
 * @name GET/api/clients
 * @function
 * @memberof module:routes/clients
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.get('/', async (req, res) => {
  try {
    const clients = await prisma.client.findMany();
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

/**
 * POST /api/clients - Create a new client.
 * @name POST/api/clients
 * @function
 * @memberof module:routes/clients
 * @param {object} req - The Express request object.
 * @param {object} req.body - The request body.
 * @param {string} req.body.name - The name of the client.
 * @param {string} req.body.email - The email of the client.
 * @param {string} req.body.riskProfile - The risk profile of the client.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, riskProfile } = req.body;
    const newClient = await prisma.client.create({
      data: { name, email, riskProfile },
    });
    res.status(201).json(newClient);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create client' });
  }
});

/**
 * GET /api/clients/:id - Get a single client by ID.
 * @name GET/api/clients/:id
 * @function
 * @memberof module:routes/clients
 * @param {object} req - The Express request object.
 * @param {object} req.params - The route parameters.
 * @param {string} req.params.id - The ID of the client.
 * @param {object} res - The Express response object.
 * @returns {void}
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
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

export default router;
