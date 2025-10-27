import { Portfolio, Transaction, TransactionType, AssetType } from '@prisma/client';
import { calculateTWR } from './performanceCalculator';
import { marketDataService } from './marketDataService';
import prisma from '../lib/prisma';

jest.mock('yahoo-finance2');
jest.mock('./marketDataService');
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    transaction: {
      findMany: jest.fn(),
    },
  },
}));

const mockMarketDataService = marketDataService as jest.Mocked<typeof marketDataService>;

describe('calculateTWR', () => {
  let portfolio: Portfolio;

  beforeEach(() => {
    portfolio = {
      id: 1,
      name: 'Test Portfolio',
      description: 'Test Description',
      clientId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      modelPortfolioId: null,
      benchmarkId: null,
    };

    // Reset mocks before each test
    mockMarketDataService.getPrice.mockReset();
    (prisma.transaction.findMany as jest.Mock).mockReset();
  });

  it('should calculate TWR correctly for a series of transactions', async () => {
    const transactions: Transaction[] = [
      { id: 1, portfolioId: 1, type: 'CASH_DEPOSIT', assetType: 'CASH', amount: 15500, transactionDate: new Date('2023-01-01'), createdAt: new Date(), updatedAt: new Date(), symbol: 'USD', quantity: null, price: null },
      { id: 2, portfolioId: 1, type: 'BUY', assetType: 'STOCK', amount: -10000, transactionDate: new Date('2023-01-01'), createdAt: new Date(), updatedAt: new Date(), symbol: '2330.TW', quantity: 100, price: 100 },
      { id: 4, portfolioId: 1, type: 'BUY', assetType: 'STOCK', amount: -5500, transactionDate: new Date('2023-01-15'), createdAt: new Date(), updatedAt: new Date(), symbol: '2330.TW', quantity: 50, price: 110 },
      { id: 5, portfolioId: 1, type: 'SELL', assetType: 'STOCK', amount: 3600, transactionDate: new Date('2023-02-01'), createdAt: new Date(), updatedAt: new Date(), symbol: '2330.TW', quantity: -30, price: 120 },
    ];

    // Mock Prisma calls
    (prisma.transaction.findMany as jest.Mock).mockImplementation(async (args: any) => {
        const where = args.where;
        // For calculateTWR's call to get cash flows
        if (where.type && where.type.in) {
            return transactions.filter(t =>
                where.type.in.includes(t.type) &&
                t.transactionDate >= where.transactionDate.gte &&
                t.transactionDate <= where.transactionDate.lte
            );
        }
        // For calculateHoldings's call to get all transactions
        if (where.transactionDate && where.transactionDate.lte) {
            return transactions.filter(t => t.transactionDate <= where.transactionDate.lte);
        }
        return [];
    });

    // Mock getPrice to simulate market changes
    mockMarketDataService.getPrice.mockImplementation(async (symbol, assetType, date) => {
      if (symbol === '2330.TW') {
        const dateStr = date.toISOString().split('T')[0];
        if (dateStr <= '2023-01-14') return 115;
        if (dateStr <= '2023-01-31') return 125;
        if (dateStr <= '2023-03-01') return 130;
      }
      return 1; // for cash
    });

    const twr = await calculateTWR(portfolio.id, new Date('2023-01-01'), new Date('2023-03-01'));

    expect(twr).toBeCloseTo(27.74, 2);
  });
});
