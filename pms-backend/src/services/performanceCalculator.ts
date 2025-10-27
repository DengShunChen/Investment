/**
 * @file This file contains the business logic for calculating portfolio performance and risk metrics.
 * @module services/performanceCalculator
 */
import prisma from '../lib/prisma';
import { calculateHoldings } from './holdingsCalculator';
import { marketDataService } from './marketDataService';
import { TransactionType, AssetType } from '@prisma/client';

const RISK_FREE_RATE = 0.02; // Assume a 2% risk-free rate for Sharpe Ratio calculation

async function getPortfolioValueOnDate(portfolioId: number, date: Date): Promise<number> {
    const holdings = await calculateHoldings(portfolioId, date);
    let totalValue = holdings.cashBalance;
    for (const asset of holdings.assets) {
        const price = await marketDataService.getPrice(asset.symbol, asset.assetType as AssetType, date);
        totalValue += asset.quantity * price;
    }
    return totalValue;
}

async function getPeriodicReturns(portfolioId: number, startDate: Date, endDate: Date): Promise<number[]> {
    const dailyReturns: number[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dayBefore = new Date(currentDate);
        dayBefore.setDate(dayBefore.getDate() - 1);

        const valueToday = await getPortfolioValueOnDate(portfolioId, currentDate);
        const valueYesterday = await getPortfolioValueOnDate(portfolioId, dayBefore);

        if (valueYesterday !== 0) {
            const dailyReturn = (valueToday - valueYesterday) / valueYesterday;
            dailyReturns.push(dailyReturn);
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dailyReturns;
}

export async function calculateRiskMetrics(portfolioId: number, startDate: Date, endDate: Date) {
    const dailyReturns = await getPeriodicReturns(portfolioId, startDate, endDate);
    if (dailyReturns.length === 0) {
        return { volatility: 0, sharpeRatio: 0, maxDrawdown: 0 };
    }

    const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((acc, ret) => acc + Math.pow(ret - meanReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    const volatility = stdDev * Math.sqrt(252);

    const totalReturn = (await calculateTWR(portfolioId, startDate, endDate)) / 100;
    const annualizedReturn = Math.pow(1 + totalReturn, 252 / dailyReturns.length) - 1;
    const sharpeRatio = volatility > 0 ? (annualizedReturn - RISK_FREE_RATE) / volatility : 0;

    let peak = 1;
    let maxDrawdown = 0;
    const cumulativeReturns = dailyReturns.map(r => peak *= (1 + r));
    for (const cumulativeReturn of cumulativeReturns) {
        const drawdown = (cumulativeReturn - peak) / peak;
        if (drawdown < maxDrawdown) {
            maxDrawdown = drawdown;
        }
        if (cumulativeReturn > peak) {
            peak = cumulativeReturn;
        }
    }

    return {
        volatility: volatility * 100,
        sharpeRatio,
        maxDrawdown: maxDrawdown * 100,
    };
}

/**
 * Calculates the true Time-Weighted Return (TWR) for a portfolio.
 * This method neutralizes the impact of cash flows by calculating and chain-linking
 * the returns for each sub-period between cash flows.
 */
export async function calculateTWR(portfolioId: number, startDate: Date, endDate: Date): Promise<number> {
    // 1. Get all external cash flow transactions
    const externalCashFlows = await prisma.transaction.findMany({
        where: {
            portfolioId,
            transactionDate: { gte: startDate, lte: endDate },
            type: { in: [
                TransactionType.CASH_DEPOSIT,
                TransactionType.CASH_WITHDRAWAL,
                TransactionType.DIVIDEND,
                TransactionType.INTEREST,
                TransactionType.FEES
            ]}
        },
        orderBy: {
            transactionDate: 'asc',
        }
    });

    // 2. Create boundary dates for all sub-periods
    const boundaryDates = new Set<string>();
    boundaryDates.add(startDate.toISOString());
    externalCashFlows.forEach(cf => {
        boundaryDates.add(cf.transactionDate.toISOString());
    });
    boundaryDates.add(endDate.toISOString());

    const sortedDates = Array.from(boundaryDates)
                             .map(d => new Date(d))
                             .sort((a, b) => a.getTime() - b.getTime());

    if (sortedDates.length < 2) {
        return 0;
    }

    let cumulativeReturnFactor = 1.0;

    // 3. Iterate through each sub-period and calculate its return
    for (let i = 0; i < sortedDates.length - 1; i++) {
        const periodStart = sortedDates[i];
        const periodEnd = sortedDates[i+1];

        // Get market value at the END of the day BEFORE the period starts
        const dayBefore = new Date(periodStart);
        dayBefore.setDate(dayBefore.getDate() - 1);
        const mvBefore = await getPortfolioValueOnDate(portfolioId, dayBefore);

        // Find all cash flows that occurred on the period's start date
        const cashFlowsOnStartDate = externalCashFlows
            .filter(cf => cf.transactionDate.getTime() === periodStart.getTime())
            .reduce((sum, cf) => sum + cf.amount, 0);

        // The starting value is the previous day's value plus any new cash flows
        const mvStartAdjusted = mvBefore + cashFlowsOnStartDate;

        if (mvStartAdjusted === 0) {
            continue;
        }

        // Get market value at the END of the period
        const mvEnd = await getPortfolioValueOnDate(portfolioId, periodEnd);

        const subPeriodReturnFactor = mvEnd / mvStartAdjusted;

        cumulativeReturnFactor *= subPeriodReturnFactor;
    }

    // 4. Calculate final TWR
    const twr = (cumulativeReturnFactor - 1) * 100;

    return isFinite(twr) ? twr : 0;
}
