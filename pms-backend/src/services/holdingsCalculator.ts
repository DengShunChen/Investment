/**
 * @file This file contains the business logic for calculating portfolio holdings based on transactions.
 * @module services/holdingsCalculator
 */
import prisma from '../lib/prisma';
import { Transaction, TransactionType, AssetType } from '@prisma/client';

/**
 * @interface Holding
 * @description Represents a single non-cash asset holding within a portfolio.
 * @property {string} symbol - The ticker symbol of the asset.
 * @property {string} assetType - The type of the asset (e.g., STOCK, FOREX).
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
 * @interface PortfolioHoldings
 * @description Represents the complete holdings of a portfolio, including cash and other assets.
 * @property {Holding[]} assets - An array of the non-cash asset holdings.
 * @property {number} cashBalance - The final cash balance of the portfolio.
 */
interface PortfolioHoldings {
  assets: Holding[];
  cashBalance: number;
}


/**
 * Calculates the new average cost of a holding after a BUY transaction.
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
  return newTotalQuantity > 0 ? newTotalCost / newTotalQuantity : 0;
}

/**
 * Calculates the holdings for a portfolio at a specific point in time.
 * If no date is provided, it calculates the current holdings.
 * @param {number} portfolioId - The unique identifier for the portfolio.
 * @param {Date} [asOfDate] - Optional date to calculate historical holdings.
 * @returns {Promise<PortfolioHoldings>} A promise that resolves to a PortfolioHoldings object.
 * @throws {Error} Throws an error if the database query fails.
 */
export async function calculateHoldings(portfolioId: number, asOfDate?: Date): Promise<PortfolioHoldings> {
  const transactions = await prisma.transaction.findMany({
    where: {
        portfolioId,
        transactionDate: asOfDate ? { lte: asOfDate } : undefined,
     },
    orderBy: { transactionDate: 'asc' }, // Process transactions in chronological order
  });

  const holdings: { [symbol: string]: Holding } = {};
  let cashBalance = 0;

  for (const tx of transactions) {
    const { symbol, type, quantity, price, assetType, amount } = tx;

    switch (type) {
      case TransactionType.BUY:
        if (quantity != null && price != null) {
          cashBalance -= quantity * price;
        }
        break;
      case TransactionType.SELL:
        if (quantity != null && price != null) {
          cashBalance += quantity * price;
        }
        break;
      default:
        if (amount != null) {
          cashBalance += amount;
        }
        break;
    }

    switch (type) {
      case TransactionType.BUY:
        if (symbol && quantity != null && price != null) {
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
        }
        break;

      case TransactionType.SELL:
        if (symbol && quantity != null && holdings[symbol]) {
          const currentHolding = holdings[symbol];
          currentHolding.quantity -= quantity;
          currentHolding.totalCost = currentHolding.quantity * currentHolding.averageCost;
        } else if (symbol) {
          console.warn(`Attempted to sell symbol ${symbol} which was not held in portfolio ${portfolioId}.`);
        }
        break;

      case TransactionType.DIVIDEND:
      case TransactionType.INTEREST:
      case TransactionType.CASH_DEPOSIT:
      case TransactionType.CASH_WITHDRAWAL:
      case TransactionType.FEES:
        break;
    }
  }

  const finalAssets = Object.values(holdings).filter(h => h.quantity > 0.000001);

  return {
    assets: finalAssets,
    cashBalance,
  };
}
