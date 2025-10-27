/**
 * @file This file contains the service for fetching market data from an external provider.
 * @module services/marketDataService
 */
import { AssetType } from '@prisma/client';

const priceCache = new Map<string, number>();
const API_KEY = process.env.STOCKDATA_API_KEY; // Use environment variable

const BASE_URL = 'https://api.stockdata.org/v1/data/eod';

// --- MOCK DATA FOR TESTING ---
const mockPriceData: { [symbol: string]: { [date: string]: number } } = {
  "2330": {
    "2023-01-03": 450,
    "2023-08-01": 568,
  }
};
// --- END MOCK DATA ---

async function fetchEodPrice(symbol: string, date: Date): Promise<number> {
  const dateString = date.toISOString().split('T')[0];

  if (!API_KEY) {
    // Use mock data if available, otherwise use a simple fallback
    if (mockPriceData[symbol] && mockPriceData[symbol][dateString]) {
      return mockPriceData[symbol][dateString];
    }
    // If no specific mock price, try to find the closest previous date
    const sortedDates = mockPriceData[symbol] ? Object.keys(mockPriceData[symbol]).sort() : [];
    let closestPrice = 0; // Default fallback
    for (const mockDate of sortedDates) {
        if (new Date(mockDate + 'T00:00:00Z') <= date) {
            closestPrice = mockPriceData[symbol][mockDate];
        } else {
            break;
        }
    }
    return closestPrice;
  }

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
      console.warn(`No data for ${symbol} on ${dateString}. Using fallback.`);
      return 0;
    }

    const price = data.data[0].close;
    priceCache.set(cacheKey, price);
    return price;

  } catch (error) {
    console.error('Error fetching from StockData API:', error);
    return 0;
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
        console.warn(`FOREX price lookup not implemented. Returning 1.0 for ${symbol}.`);
        return 1.0;
      default:
        console.warn(`Unsupported asset type: ${assetType}. Returning 0.`);
        return 0.0;
    }
  },
};
