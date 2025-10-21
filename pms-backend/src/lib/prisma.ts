/**
 * @file This file initializes and exports a singleton instance of the Prisma client.
 * @module lib/prisma
 */
import { PrismaClient } from '@prisma/client';

/**
 * The singleton Prisma client instance.
 * This instance is used to interact with the database.
 */
const prisma = new PrismaClient();

export default prisma;
