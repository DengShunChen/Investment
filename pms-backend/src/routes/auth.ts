// pms-backend/src/routes/auth.ts
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole } from '@prisma/client';
import logger from '../lib/logger';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key'; // It's crucial to set this in your environment variables

// Temporary endpoint to register a user for testing
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash: hashedPassword,
        role: role === 'ADVISOR' ? UserRole.ADVISOR : UserRole.CLIENT,
      },
    });

    logger.info(`User registered successfully: ${username}`);
    res.status(201).json({ message: 'User created successfully', userId: newUser.id });
  } catch (error: any) {
    if (error.code === 'P2002') { // Unique constraint failed
      logger.warn(`Registration failed for username ${username}: already exists.`);
      return res.status(409).json({ message: 'Username already exists' });
    }
    logger.error('Error during user registration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      logger.warn(`Login attempt failed for non-existent user: ${username}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      logger.warn(`Login attempt failed for user: ${username} (invalid password)`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    logger.info(`User logged in successfully: ${username}`);
    // Return user info without the password hash
    const { passwordHash, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });

  } catch (error) {
    logger.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
