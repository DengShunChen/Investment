/**
 * @file This file contains the business logic for portfolio rebalancing.
 * @module services/rebalancingService
 */
import prisma from '../lib/prisma';
import { calculateHoldings } from './holdingsCalculator';
import { mockMarketData } from './performanceCalculator';

/**
 * @interface AssetAllocation
 * @description Represents the allocation of a single asset in a portfolio.
 */
interface AssetAllocation {
  symbol: string;
  currentValue: number;
  currentWeight: number;
  targetWeight: number;
  drift: number; // The difference between current and target weight
}

/**
 * @interface RebalancingProposal
 * @description Represents a complete rebalancing plan.
 */
interface RebalancingProposal {
  portfolioId: number;
  totalMarketValue: number;
  driftAnalysis: AssetAllocation[];
  rebalancingTrades: {
    symbol: string;
    action: 'BUY' | 'SELL';
    tradeValue: number; // The cash amount to buy or sell
  }[];
}

async function calculatePortfolioMarketValue(portfolioId: number): Promise<{ totalMarketValue: number; assetValues: { [symbol: string]: number } }> {
    const holdings = await calculateHoldings(portfolioId);
    const today = new Date();

    let totalMarketValue = holdings.cashBalance;
    const assetValues: { [symbol: string]: number } = {};

    for (const asset of holdings.assets) {
        const price = await mockMarketData.getPrice(asset.symbol, today);
        const value = asset.quantity * price;
        assetValues[asset.symbol] = value;
        totalMarketValue += value;
    }
    return { totalMarketValue, assetValues };
}


/**
 * Calculates the current asset allocation (drift) of a portfolio compared to its model.
 * @param {number} portfolioId - The ID of the portfolio.
 * @returns {Promise<AssetAllocation[]>} A promise that resolves to an array of asset allocations.
 */
export async function calculateDrift(portfolioId: number): Promise<AssetAllocation[]> {
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: { modelPortfolio: { include: { assets: true } } },
  });

  if (!portfolio || !portfolio.modelPortfolio) {
    throw new Error('Portfolio or its assigned model not found.');
  }

  const { totalMarketValue, assetValues } = await calculatePortfolioMarketValue(portfolioId);

  const modelAssets = portfolio.modelPortfolio.assets;
  const driftAnalysis: AssetAllocation[] = [];

  for (const modelAsset of modelAssets) {
    const currentValue = assetValues[modelAsset.symbol] || 0;
    const currentWeight = totalMarketValue > 0 ? currentValue / totalMarketValue : 0;
    const targetWeight = modelAsset.targetPercentage;
    driftAnalysis.push({
      symbol: modelAsset.symbol,
      currentValue,
      currentWeight,
      targetWeight,
      drift: currentWeight - targetWeight,
    });
  }

  return driftAnalysis;
}

/**
 * Generates a rebalancing proposal for a portfolio.
 * @param {number} portfolioId - The ID of the portfolio.
 * @returns {Promise<RebalancingProposal>} A promise that resolves to a rebalancing proposal.
 */
export async function generateRebalancingProposal(portfolioId: number): Promise<RebalancingProposal> {
  const driftAnalysis = await calculateDrift(portfolioId);
  const { totalMarketValue } = await calculatePortfolioMarketValue(portfolioId);

  const rebalancingTrades = driftAnalysis.map(asset => {
    const targetValue = totalMarketValue * asset.targetWeight;
    const tradeValue = targetValue - asset.currentValue;

    return {
      symbol: asset.symbol,
      action: tradeValue > 0 ? 'BUY' : 'SELL',
      tradeValue: Math.abs(tradeValue),
    };
  }).filter(trade => trade.tradeValue > 0.01); // Filter out negligible trades

  return {
    portfolioId,
    totalMarketValue,
    driftAnalysis,
    rebalancingTrades,
  };
}
