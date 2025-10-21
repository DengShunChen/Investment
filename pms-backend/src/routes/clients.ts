import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/clients - Get all clients
router.get('/', async (req, res) => {
  try {
    const clients = await prisma.client.findMany();
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// POST /api/clients - Create a new client
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

// GET /api/clients/:id - Get a single client by ID
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
