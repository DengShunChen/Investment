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
    const cashFlowTransactions = await prisma.transaction.findMany({
        where: {
            portfolioId,
            transactionDate: { gt: startDate, lte: endDate },
            type: { in: [TransactionType.CASH_DEPOSIT, TransactionType.CASH_WITHDRAWAL] }
        },
        orderBy: { transactionDate: 'asc' }
    });

    const periodDates = [startDate, ...cashFlowTransactions.map(t => t.transactionDate), endDate];
    const uniqueDates = [...new Set(periodDates.map(d => d.toISOString()))].map(d => new Date(d));
    uniqueDates.sort((a, b) => a.getTime() - b.getTime());

    let cumulativeReturnFactor = 1.0;

    for (let i = 0; i < uniqueDates.length - 1; i++) {
        const periodStart = uniqueDates[i];
        const periodEnd = uniqueDates[i + 1];

        const startValue = await getPortfolioValueOnDate(portfolioId, periodStart);

        // Find cash flows that occurred AT the end of the previous period or start of this one
        const cashFlowsAtStart = cashFlowTransactions.filter(
            t => t.transactionDate.getTime() === periodStart.getTime()
        );
        const startCashFlow = cashFlowsAtStart.reduce((acc, t) => acc + t.amount, 0);

        const marketValueBeforeCashFlows = startValue - startCashFlow;

        if (marketValueBeforeCashFlows === 0) {
            continue; // Skip periods with zero starting value
        }

        const endValue = await getPortfolioValueOnDate(portfolioId, periodEnd);

        const periodReturn = (endValue / marketValueBeforeCashFlows) - 1;
        cumulativeReturnFactor *= (1 + periodReturn);
    }

    const twr = (cumulativeReturnFactor - 1) * 100;
    return twr;
}
