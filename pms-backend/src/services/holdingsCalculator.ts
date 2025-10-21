import prisma from '../lib/prisma';
import { Transaction, TransactionType } from '@prisma/client';

interface Holding {
  symbol: string;
  assetType: string;
  quantity: number;
  averageCost: number;
  totalCost: number;
}

// Function to calculate the average cost of a holding after a BUY transaction
function calculateNewAverageCost(
  currentQuantity: number,
  currentAverageCost: number,
  buyQuantity: number,
  buyPrice: number
): number {
  const currentTotalCost = currentQuantity * currentAverageCost;
  const newTotalCost = currentTotalCost + buyQuantity * buyPrice;
  const newTotalQuantity = currentQuantity + buyQuantity;
  return newTotalCost / newTotalQuantity;
}

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
        currentHolding.quantity -= quantity;
        // The total cost is proportionally reduced based on the quantity sold
        currentHolding.totalCost = currentHolding.quantity * currentHolding.averageCost;
      } else {
        // This case should ideally not happen in a valid transaction history
        console.warn(`Attempted to sell symbol ${symbol} which was not held.`);
      }
    }
  }

  // Filter out holdings with zero or negative quantity and convert to array
  return Object.values(holdings).filter(h => h.quantity > 0.000001); // Use a small epsilon for float comparison
}
