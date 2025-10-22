/**
 * @file This file contains the service logic for batch importing transactions from a CSV.
 * @module services/batchImportService
 */
import prisma from '../lib/prisma';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { TransactionType, AssetType } from '@prisma/client';

interface CsvRow {
    date: string;
    type: string;
    symbol?: string;
    assetType: string;
    quantity?: string;
    price?: string;
    amount: string;
}

/**
 * Processes a CSV file buffer to batch import transactions.
 * @param {Buffer} buffer - The CSV file buffer.
 * @param {number} portfolioId - The ID of the portfolio to import transactions into.
 * @returns {Promise<{ createdCount: number }>} The number of transactions created.
 */
export async function processCsvImport(buffer: Buffer, portfolioId: number): Promise<{ createdCount: number }> {
    const transactionsToCreate: any[] = [];
    const stream = Readable.from(buffer);

    return new Promise((resolve, reject) => {
        stream
            .pipe(csvParser())
            .on('data', (row: CsvRow) => {
                const { date, type, symbol, assetType, quantity, price, amount } = row;

                // --- Data Validation and Transformation ---
                if (!date || !type || !assetType || !amount) {
                    // Skip invalid rows or throw an error
                    console.warn('Skipping invalid CSV row:', row);
                    return;
                }

                const transactionData: any = {
                    portfolioId,
                    transactionDate: new Date(date),
                    type: type as TransactionType,
                    assetType: assetType as AssetType,
                    amount: parseFloat(amount),
                    symbol: symbol || null,
                    quantity: quantity ? parseFloat(quantity) : null,
                    price: price ? parseFloat(price) : null,
                };

                // Add more specific validation logic as needed
                if (!Object.values(TransactionType).includes(transactionData.type) ||
                    !Object.values(AssetType).includes(transactionData.assetType)) {
                    console.warn('Skipping row with invalid type or assetType:', row);
                    return;
                }

                transactionsToCreate.push(transactionData);
            })
            .on('end', async () => {
                try {
                    if (transactionsToCreate.length > 0) {
                        const result = await prisma.transaction.createMany({
                            data: transactionsToCreate,
                            skipDuplicates: true, // Optional: useful if re-importing is a concern
                        });
                        resolve({ createdCount: result.count });
                    } else {
                        resolve({ createdCount: 0 });
                    }
                } catch (error) {
                    reject(error);
                }
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}
