/**
 * @file This file contains the business logic for aggregating data for client reports.
 * @module services/reportingService
 */
import prisma from '../lib/prisma';
import { calculateHoldings } from './holdingsCalculator';
import { calculateTWR, calculateRiskMetrics } from './performanceCalculator';

/**
 * @interface ReportData
 * @description Defines the structure of the data object returned for a client report.
 */
export interface ReportData {
  portfolio: any;
  holdings: any;
  performance: {
    portfolioTWR: number;
    benchmarkPerformance: number | null;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  transactions: any[];
}

/**
 * Aggregates all necessary data for a comprehensive client report.
 */
export async function generateReportData(portfolioId: number, startDate: Date, endDate: Date): Promise<ReportData> {
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: { client: true, benchmark: true },
  });

  if (!portfolio) {
    throw new Error('Portfolio not found');
  }

  const holdings = await calculateHoldings(portfolioId, endDate);
  const portfolioTWR = await calculateTWR(portfolioId, startDate, endDate);
  const riskMetrics = await calculateRiskMetrics(portfolioId, startDate, endDate);

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

  const transactions = await prisma.transaction.findMany({
    where: {
      portfolioId,
      transactionDate: { gte: startDate, lte: endDate },
    },
    orderBy: { transactionDate: 'desc' },
  });

  return {
    portfolio,
    holdings,
    performance: {
      portfolioTWR,
      benchmarkPerformance,
      ...riskMetrics,
    },
    transactions,
  };
}
