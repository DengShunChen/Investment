/**
 * @file This file contains the business logic for aggregating data for client reports.
 * @module services/reportingService
 */
import prisma from '../lib/prisma';
import { calculateHoldings } from './holdingsCalculator';
import { calculateTWR } from './performanceCalculator';

/**
 * @interface ReportData
 * @description Defines the structure of the data object returned for a client report.
 */
export interface ReportData {
  portfolio: any; // Basic portfolio details
  holdings: any; // Portfolio holdings (assets and cash)
  performance: {
    portfolioTWR: number;
    benchmarkPerformance: number | null;
  };
  transactions: any[]; // Transactions within the reporting period
}

/**
 * Aggregates all necessary data for a comprehensive client report.
 * @param {number} portfolioId - The ID of the portfolio to generate the report for.
 * @param {Date} startDate - The start date of the reporting period.
 * @param {Date} endDate - The end date of the reporting period.
 * @returns {Promise<ReportData>} A promise that resolves to the aggregated report data.
 * @throws {Error} Throws an error if any of the data fetching steps fail.
 */
export async function generateReportData(portfolioId: number, startDate: Date, endDate: Date): Promise<ReportData> {
  // 1. Get Portfolio Details (including benchmark)
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: { client: true, benchmark: true },
  });

  if (!portfolio) {
    throw new Error('Portfolio not found');
  }

  // 2. Get Holdings at the end of the period
  const holdings = await calculateHoldings(portfolioId, endDate);

  // 3. Calculate Performance (TWR and Benchmark)
  const portfolioTWR = await calculateTWR(portfolioId, startDate, endDate);
  let benchmarkPerformance = null;
  if (portfolio.benchmarkId) {
    const benchmarkHistory = await prisma.benchmarkPriceHistory.findMany({
      where: {
        benchmarkId: portfolio.benchmarkId,
        date: { in: [startDate, endDate] },
      },
      orderBy: { date: 'asc' },
    });
    if (benchmarkHistory.length === 2) {
      const startPrice = benchmarkHistory[0].price;
      const endPrice = benchmarkHistory[1].price;
      benchmarkPerformance = ((endPrice - startPrice) / startPrice) * 100;
    }
  }

  // 4. Get Transactions for the period
  const transactions = await prisma.transaction.findMany({
    where: {
      portfolioId,
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { transactionDate: 'desc' },
  });

  return {
    portfolio,
    holdings,
    performance: {
      portfolioTWR,
      benchmarkPerformance,
    },
    transactions,
  };
}
