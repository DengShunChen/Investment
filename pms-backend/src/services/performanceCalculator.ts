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
    // 1. 取得所有外部現金流交易
    const externalCashFlows = await prisma.transaction.findMany({
        where: {
            portfolioId,
            transactionDate: { gte: startDate, lte: endDate },
            type: { in: [
                TransactionType.CASH_DEPOSIT,
                TransactionType.CASH_WITHDRAWAL,
                // DIVIDEND, INTEREST, FEES 也算是外部現金流
                TransactionType.DIVIDEND,
                TransactionType.INTEREST,
                TransactionType.FEES
            ]}
        },
        orderBy: {
            transactionDate: 'asc',
        }
    });

    // 2. 建立所有子期間的邊界日期
    // 我們需要計算每個現金流發生前後的 portfolio 價值
    const boundaryDates = new Set<string>();
    boundaryDates.add(startDate.toISOString());
    externalCashFlows.forEach(cf => {
        // 加入現金流發生的日期
        boundaryDates.add(cf.transactionDate.toISOString());
    });
    boundaryDates.add(endDate.toISOString());

    // 排序並轉換回 Date 物件
    const sortedDates = Array.from(boundaryDates)
                             .map(d => new Date(d))
                             .sort((a, b) => a.getTime() - b.getTime());

    // 如果只有一個日期（開始和結束是同一天且無現金流），則報酬率為 0
    if (sortedDates.length < 2) {
        return 0;
    }

    let cumulativeReturnFactor = 1.0;

    // 3. 遍歷每一個子期間並計算其報酬率
    for (let i = 0; i < sortedDates.length - 1; i++) {
        const periodStart = sortedDates[i];
        const periodEnd = sortedDates[i+1];

        // 取得子期間開始時的市場價值 (期初價值)
        const mvStart = await getPortfolioValueOnDate(portfolioId, periodStart);

        // 找出在 "periodStart" 當天發生的所有現金流
        const cashFlowsOnStartDate = externalCashFlows
            .filter(cf => cf.transactionDate.getTime() === periodStart.getTime())
            .reduce((sum, cf) => sum + cf.amount, 0);

        // 子期間的期初價值需要加上當天的現金流
        const mvStartAfterCashFlow = mvStart + cashFlowsOnStartDate;

        // 如果調整後的期初價值為 0，則無法計算報酬率，跳過此期間
        if (mvStartAfterCashFlow === 0) {
            continue;
        }

        // 取得子期間結束時的市場價值 (期末價值)
        const mvEnd = await getPortfolioValueOnDate(portfolioId, periodEnd);

        // 計算子期間的報酬率因子
        const subPeriodReturnFactor = mvEnd / mvStartAfterCashFlow;

        // 連乘起來
        cumulativeReturnFactor *= subPeriodReturnFactor;
    }

    // 4. 計算最終的 TWR
    const twr = (cumulativeReturnFactor - 1) * 100;

    // 處理 NaN 或 Infinity 的情況
    return isFinite(twr) ? twr : 0;
}
