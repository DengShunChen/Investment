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

    const totalReturn = await calculateTWR(portfolioId, startDate, endDate) / 100;
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

export async function calculateTWR(portfolioId: number, startDate: Date, endDate: Date): Promise<number> {
    const startValue = await getPortfolioValueOnDate(portfolioId, startDate);
    const endValue = await getPortfolioValueOnDate(portfolioId, endDate);

    const transactions = await prisma.transaction.findMany({
        where: {
            portfolioId,
            transactionDate: { gt: startDate, lte: endDate },
            type: { in: [TransactionType.CASH_DEPOSIT, TransactionType.CASH_WITHDRAWAL] }
        }
    });
    const netCashFlow = transactions.reduce((acc, t) => acc + t.amount, 0);

    if (startValue === 0) return 0;

    const twr = (endValue - netCashFlow - startValue) / startValue;
    return twr * 100;
}
