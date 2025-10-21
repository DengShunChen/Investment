/**
 * @file This file contains the business logic for calculating portfolio performance metrics.
 * @module services/performanceCalculator
 */
import prisma from '../lib/prisma';
import { calculateHoldings } from './holdingsCalculator';
import { TransactionType } from '@prisma/client';

/**
 * --- MOCK MARKET DATA PROVIDER ---
 */
const mockMarketData = {
  /**
   * Fetches the price for a given symbol on a specific date.
   * @param {string} symbol - The asset symbol.
   * @param {Date} date - The date for which to fetch the price.
   * @returns {Promise<number>} A promise that resolves to the price.
   */
  getPrice: async (symbol: string, date: Date): Promise<number> => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return 100 + (symbol.charCodeAt(0) % 10) + (day * 0.1) - (month * 0.05);
  },
};
// --- END MOCK ---

interface SubPeriod {
  startDate: Date;
  endDate: Date;
  startValue: number;
  endValue: number;
  cashFlow: number;
}

/**
 * Calculates the market value of all assets in a portfolio on a given date.
 * @param {object[]} assets - The assets from the holdings calculation.
 * @param {Date} date - The date for which to calculate the market value.
 * @returns {Promise<number>} The total market value.
 */
async function calculateAssetsMarketValue(assets: { symbol: string; quantity: number }[], date: Date): Promise<number> {
  let totalValue = 0;
  for (const asset of assets) {
    const price = await mockMarketData.getPrice(asset.symbol, date);
    totalValue += asset.quantity * price;
  }
  return totalValue;
}

/**
 * Calculates the Time-Weighted Return (TWR) for a portfolio over a specified period.
 * @param {number} portfolioId - The ID of the portfolio.
 * @param {Date} startDate - The start date of the calculation period.
 * @param {Date} endDate - The end date of the calculation period.
 * @returns {Promise<number>} A promise that resolves to the TWR as a percentage. Returns 0 if no transactions.
 */
export async function calculateTWR(portfolioId: number, startDate: Date, endDate: Date): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: {
      portfolioId,
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
      type: {
        in: [TransactionType.CASH_DEPOSIT, TransactionType.CASH_WITHDRAWAL],
      },
    },
    orderBy: { transactionDate: 'asc' },
  });

  const cashFlowDates = [startDate, ...transactions.map(t => t.transactionDate), endDate];
  const uniqueDates = [...new Set(cashFlowDates.map(d => new Date(d.toISOString().split('T')[0])))];
  uniqueDates.sort((a, b) => a.getTime() - b.getTime());

  const subPeriods: SubPeriod[] = [];

  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const periodStart = uniqueDates[i];
    const periodEnd = uniqueDates[i+1];

    const holdingsAtStart = await calculateHoldings(portfolioId, periodStart);
    const assetsValueAtStart = await calculateAssetsMarketValue(holdingsAtStart.assets, periodStart);
    const startValue = assetsValueAtStart + holdingsAtStart.cashBalance;

    const cashFlowsInPeriod = transactions.filter(
      t => t.transactionDate > periodStart && t.transactionDate <= periodEnd
    );
    const periodCashFlow = cashFlowsInPeriod.reduce((acc, cf) => acc + (cf.amount || 0), 0);

    const holdingsAtEnd = await calculateHoldings(portfolioId, periodEnd);
    const assetsValueAtEnd = await calculateAssetsMarketValue(holdingsAtEnd.assets, periodEnd);
    const endValue = assetsValueAtEnd + holdingsAtEnd.cashBalance;

    subPeriods.push({
      startDate: periodStart,
      endDate: periodEnd,
      startValue: startValue,
      endValue: endValue - periodCashFlow,
      cashFlow: periodCashFlow,
    });
  }

  if (subPeriods.length === 0) {
    return 0;
  }

  const totalReturnFactor = subPeriods.reduce((acc, period) => {
    if (period.startValue === 0) return acc;
    const periodReturn = period.endValue / period.startValue;
    return acc * periodReturn;
  }, 1);

  const twr = (totalReturnFactor - 1) * 100;

  return twr;
}
