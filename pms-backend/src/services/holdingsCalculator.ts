/**
 * @file This file contains the business logic for calculating portfolio holdings based on transactions.
 * @module services/holdingsCalculator
 */
import prisma from '../lib/prisma';
import { Transaction, TransactionType, AssetType } from '@prisma/client';

/**
 * @interface Holding
 * @description Represents a single holding within a portfolio.
 * @property {string} symbol - The ticker symbol of the asset.
 * @property {string} assetType - The type of the asset (e.g., STOCK, BOND).
 * @property {number} quantity - The total number of units held.
 * @property {number} averageCost - The weighted average cost per unit of the asset.
 * @property {number} totalCost - The total cost basis of the holding (quantity * averageCost).
 */
interface Holding {
  symbol: string;
  assetType: string;
  quantity: number;
  averageCost: number;
  totalCost: number;
}

/**
 * Calculates the new average cost of a holding after a BUY transaction.
 * This function is used internally to update the cost basis when more units of an asset are acquired.
 * @param {number} currentQuantity - The quantity of the asset held before the new purchase.
 * @param {number} currentAverageCost - The average cost per unit before the new purchase.
 * @param {number} buyQuantity - The quantity of the asset being purchased.
 * @param {number} buyPrice - The price per unit of the new purchase.
 * @returns {number} The new weighted average cost per unit.
 */
function calculateNewAverageCost(
  currentQuantity: number,
  currentAverageCost: number,
  buyQuantity: number,
  buyPrice: number
): number {
  const currentTotalCost = currentQuantity * currentAverageCost;
  const newTotalCost = currentTotalCost + buyQuantity * buyPrice;
  const newTotalQuantity = currentQuantity + buyQuantity;
  // Avoid division by zero if for some reason the new quantity is zero.
  return newTotalQuantity > 0 ? newTotalCost / newTotalQuantity : 0;
}

/**
 * Calculates the current holdings for a given portfolio based on its entire transaction history.
 * It processes transactions chronologically to determine the final state of each asset.
 * @param {number} portfolioId - The unique identifier for the portfolio.
 * @returns {Promise<Holding[]>} A promise that resolves to an array of Holding objects, representing the current assets in the portfolio.
 * @throws {Error} Throws an error if the database query fails.
 */
export async function calculateHoldings(portfolioId: number): Promise<Holding[]> {
  const transactions = await prisma.transaction.findMany({
    where: { portfolioId },
    orderBy: { transactionDate: 'asc' }, // Process transactions in chronological order
  });

  const holdings: { [symbol: string]: Holding } = {};

  for (const tx of transactions) {
    const { symbol, type, quantity, price, assetType } = tx;

    if (type === TransactionType.BUY) {
      if (holdings[symbol]) {
        const currentHolding = holdings[symbol];
        const newAverageCost = calculateNewAverageCost(
          currentHolding.quantity,
          currentHolding.averageCost,
          quantity,
          price
        );
        currentHolding.quantity += quantity;
        currentHolding.averageCost = newAverageCost;
        currentHolding.totalCost = currentHolding.quantity * newAverageCost;
      } else {
        holdings[symbol] = {
          symbol,
          assetType: assetType.toString(),
          quantity,
          averageCost: price,
          totalCost: quantity * price,
        };
      }
    } else if (type === TransactionType.SELL) {
      if (holdings[symbol]) {
        const currentHolding = holdings[symbol];
        // Ensure selling does not exceed quantity held, though this should be validated upstream.
        currentHolding.quantity -= quantity;
        // The total cost is proportionally reduced based on the quantity sold, average cost remains the same.
        currentHolding.totalCost = currentHolding.quantity * currentHolding.averageCost;
      } else {
        // This case indicates a data integrity issue, as a sell occurred without a prior buy.
        console.warn(`Attempted to sell symbol ${symbol} which was not held in portfolio ${portfolioId}.`);
      }
    }
    // Other transaction types like DIVIDEND, FEES could be handled here in the future.
  }

  // Filter out holdings with a quantity that is effectively zero and convert the map to an array.
  return Object.values(holdings).filter(h => h.quantity > 0.000001); // Use a small epsilon for floating-point comparisons.
}
