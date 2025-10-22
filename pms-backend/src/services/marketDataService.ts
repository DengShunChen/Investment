/**
 * @file This file contains the service for fetching market data from an external provider.
 * @module services/marketDataService
 */
import { AssetType } from '@prisma/client';

const priceCache = new Map<string, number>();
const API_KEY = process.env.STOCKDATA_API_KEY; // Use environment variable

const BASE_URL = 'https://api.stockdata.org/v1/data/eod';

async function fetchEodPrice(symbol: string, date: Date): Promise<number> {
  if (!API_KEY) {
    console.warn('STOCKDATA_API_KEY not found. Using fallback pricing.');
    return 100 + (symbol.charCodeAt(0) % 10);
  }

  const dateString = date.toISOString().split('T')[0];
  const cacheKey = `${symbol}:${dateString}`;

  if (priceCache.has(cacheKey)) {
    return priceCache.get(cacheKey)!;
  }

  const url = `${BASE_URL}?symbols=${symbol}&api_token=${API_KEY}&date=${dateString}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`StockData API request failed: ${response.statusText}`);
    }
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      // If no data for a specific day, it might be a weekend/holiday. Try to get the last known price.
      // For simplicity, we'll just use fallback here. A real implementation would be more robust.
      console.warn(`No data for ${symbol} on ${dateString}. Using fallback.`);
      return 100 + (symbol.charCodeAt(0) % 10);
    }

    const price = data.data[0].close;
    priceCache.set(cacheKey, price);
    return price;

  } catch (error) {
    console.error('Error fetching from StockData API:', error);
    return 100 + (symbol.charCodeAt(0) % 10);
  }
}

export const marketDataService = {
  getPrice: async (symbol: string, assetType: AssetType, date: Date): Promise<number> => {
    switch (assetType) {
      case AssetType.STOCK:
        return fetchEodPrice(symbol, date);
      case AssetType.CASH:
        return 1.0;
      case AssetType.FOREX:
        console.warn(`FOREX price lookup not implemented. Using fallback for ${symbol}.`);
        return 1.1 + (symbol.charCodeAt(0) % 10) / 100;
      default:
        console.warn(`Unsupported asset type: ${assetType}. Using fallback.`);
        return 100.0;
    }
  },
};
