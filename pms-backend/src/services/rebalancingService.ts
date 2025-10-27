/**
 * @file This file contains the business logic for portfolio rebalancing.
 * @module services/rebalancingService
 */
import prisma from '../lib/prisma';
import { calculateHoldings } from './holdingsCalculator';
import { marketDataService } from './marketDataService';
import { AssetType } from '@prisma/client';

// ... (interfaces remain the same)
interface AssetAllocation {
    symbol: string;
    currentValue: number;
    currentWeight: number;
    targetWeight: number;
    drift: number;
  }

  interface RebalancingProposal {
    portfolioId: number;
    totalMarketValue: number;
    driftAnalysis: AssetAllocation[];
    rebalancingTrades: {
      symbol: string;
      action: 'BUY' | 'SELL';
      tradeValue: number;
    }[];
  }

async function calculatePortfolioMarketValue(portfolioId: number): Promise<{ totalMarketValue: number; assetValues: { [symbol: string]: number } }> {
    const holdings = await calculateHoldings(portfolioId);
    const today = new Date();

    let totalMarketValue = holdings.cashBalance;
    const assetValues: { [symbol: string]: number } = {};

    for (const asset of holdings.assets) {
        const price = await marketDataService.getPrice(asset.symbol, asset.assetType as AssetType, today);
        const value = asset.quantity * price;
        assetValues[asset.symbol] = value;
        totalMarketValue += value;
    }
    return { totalMarketValue, assetValues };
}


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

export async function generateRebalancingProposal(portfolioId: number): Promise<RebalancingProposal> {
  const driftAnalysis = await calculateDrift(portfolioId);
  const { totalMarketValue } = await calculatePortfolioMarketValue(portfolioId);

  const rebalancingTrades = driftAnalysis.map(asset => {
    const targetValue = totalMarketValue * asset.targetWeight;
    const tradeValue = targetValue - asset.currentValue;
    const action: 'BUY' | 'SELL' = tradeValue > 0 ? 'BUY' : 'SELL';

    return {
      symbol: asset.symbol,
      action: action,
      tradeValue: Math.abs(tradeValue),
    };
  }).filter(trade => trade.tradeValue > 0.01);

  return {
    portfolioId,
    totalMarketValue,
    driftAnalysis,
    rebalancingTrades,
  };
}
