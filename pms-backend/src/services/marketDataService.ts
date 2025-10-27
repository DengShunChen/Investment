/**
 * @file This file contains the service for fetching market data from an external provider.
 * @module services/marketDataService
 */
import { AssetType } from '@prisma/client';
const yahooFinance = require('yahoo-finance2');

const priceCache = new Map<string, number>();

async function fetchEodPrice(symbol: string, date: Date): Promise<number> {
  const dateString = date.toISOString().split('T')[0];
  const cacheKey = `${symbol}:${dateString}`;

  if (priceCache.has(cacheKey)) {
    return priceCache.get(cacheKey)!;
  }

  try {
    const queryOptions = {
      period1: dateString,
      period2: dateString,
    };
    const result = await yahooFinance.historical(symbol, queryOptions);

    if (result.length === 0) {
      console.warn(`No data for ${symbol} on ${dateString}. Returning 0.`);
      return 0;
    }

    const price = result[0].close;
    priceCache.set(cacheKey, price);
    return price;

  } catch (error) {
    console.error(`Error fetching from Yahoo Finance for ${symbol} on ${dateString}:`, error);
    return 0;
  }
}

export const marketDataService = {
  getPrice: async (symbol: string, assetType: AssetType, date: Date): Promise<number> => {
    switch (assetType) {
      case AssetType.STOCK:
        // Yahoo Finance uses '.TW' for Taiwan stocks
        const yahooSymbol = symbol.endsWith('.TW') ? symbol : `${symbol}.TW`;
        return fetchEodPrice(yahooSymbol, date);
      case AssetType.CASH:
        return 1.0;
      case AssetType.FOREX:
        console.warn(`FOREX price lookup not implemented. Returning 1.0 for ${symbol}.`);
        return 1.0;
      default:
        console.warn(`Unsupported asset type: ${assetType}. Returning 0.`);
        return 0.0;
    }
  },
};
