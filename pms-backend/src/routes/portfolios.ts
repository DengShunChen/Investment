/**
 * @file This file defines the routes for managing portfolios.
 * @module routes/portfolios
 */
import { Router } from 'express';
import prisma from '../lib/prisma';
import { calculateHoldings } from '../services/holdingsCalculator';
import { calculateTWR } from '../services/performanceCalculator';
import { generateReportData } from '../services/reportingService';
import { generatePdfReport } from '../services/pdfReportGenerator';
import { calculateDrift, generateRebalancingProposal } from '../services/rebalancingService';

const router = Router();

// ... (other routes)

/**
 * GET /api/portfolios/:id/report - Generate data for a client report (JSON or PDF).
 * @name GET/api/portfolios/:id/report
 * @param {string} req.query.format - Optional. If 'pdf', streams a PDF report.
 */
router.get('/:id/report', async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate, format } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate query parameters are required.' });
        }

        const reportData = await generateReportData(parseInt(id), new Date(startDate as string), new Date(endDate as string));

        if (format === 'pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=report-${id}-${endDate}.pdf`);
            generatePdfReport(reportData, res);
        } else {
            res.json(reportData);
        }
    } catch (error) {
        res.status(500).json({ error: `Failed to generate report data: ${error.message}` });
    }
});


// --- Other Routes (unchanged) ---

router.get('/', async (req, res) => {
    try {
      const portfolios = await prisma.portfolio.findMany({ include: { benchmark: true, modelPortfolio: true } });
      res.json(portfolios);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch portfolios' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { name, description, clientId } = req.body;
      const newPortfolio = await prisma.portfolio.create({
        data: { name, description, clientId },
      });
      res.status(201).json(newPortfolio);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create portfolio' });
    }
  });

  router.get('/client/:clientId', async (req, res) => {
      try {
        const { clientId } = req.params;
        const portfolios = await prisma.portfolio.findMany({
          where: { clientId: parseInt(clientId) },
          include: { benchmark: true, modelPortfolio: true },
        });
        res.json(portfolios);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch portfolios for the client' });
      }
  });

  router.put('/:id/benchmark', async (req, res) => {
    try {
      const { id } = req.params;
      const { benchmarkId } = req.body;

      if (benchmarkId == null) {
        return res.status(400).json({ error: 'benchmarkId is a required field.' });
      }

      const updatedPortfolio = await prisma.portfolio.update({
        where: { id: parseInt(id) },
        data: { benchmarkId: parseInt(benchmarkId) },
      });

      res.json(updatedPortfolio);
    } catch (error) {
      res.status(400).json({ error: 'Failed to assign benchmark.' });
    }
  });

  router.put('/:id/model', async (req, res) => {
      try {
        const { id } = req.params;
        const { modelPortfolioId } = req.body;

        if (modelPortfolioId == null) {
          return res.status(400).json({ error: 'modelPortfolioId is a required field.' });
        }

        const updatedPortfolio = await prisma.portfolio.update({
          where: { id: parseInt(id) },
          data: { modelPortfolioId: parseInt(modelPortfolioId) },
        });

        res.json(updatedPortfolio);
      } catch (error) {
        res.status(400).json({ error: 'Failed to assign model portfolio.' });
      }
    });

  router.get('/:id/holdings', async (req, res) => {
      try {
        const { id } = req.params;
        const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : undefined;
        const holdings = await calculateHoldings(parseInt(id), asOfDate);
        res.json(holdings);
      } catch (error) {
        res.status(500).json({ error: 'Failed to calculate holdings' });
      }
  });

  router.get('/:id/performance', async (req, res) => {
      try {
          const { id } = req.params;
          const { startDate, endDate } = req.query;

          if (!startDate || !endDate) {
              return res.status(400).json({ error: 'startDate and endDate query parameters are required.' });
          }

          const portfolioTWR = await calculateTWR(parseInt(id), new Date(startDate as string), new Date(endDate as string));

          const portfolio = await prisma.portfolio.findUnique({ where: { id: parseInt(id) } });
          let benchmarkPerformance = null;
          if (portfolio?.benchmarkId) {
              const benchmarkHistory = await prisma.benchmarkPriceHistory.findMany({
                  where: {
                      benchmarkId: portfolio.benchmarkId,
                      date: { in: [new Date(startDate as string), new Date(endDate as string)] },
                  },
                  orderBy: { date: 'asc' },
              });

              if (benchmarkHistory.length === 2) {
                  const startPrice = benchmarkHistory[0].price;
                  const endPrice = benchmarkHistory[1].price;
                  benchmarkPerformance = ((endPrice - startPrice) / startPrice) * 100;
              }
          }

          res.json({
              portfolioTWR,
              benchmarkPerformance,
          });

      } catch (error) {
          res.status(500).json({ error: 'Failed to calculate performance.' });
      }
  });

  router.get('/:id/drift', async (req, res) => {
      try {
          const { id } = req.params;
          const driftData = await calculateDrift(parseInt(id));
          res.json(driftData);
      } catch (error) {
          res.status(500).json({ error: `Failed to calculate drift: ${error.message}` });
      }
  });

  router.post('/:id/rebalance-proposal', async (req, res) => {
      try {
          const { id } = req.params;
          const proposal = await generateRebalancingProposal(parseInt(id));
          res.json(proposal);
      } catch (error) {
          res.status(500).json({ error: `Failed to generate rebalancing proposal: ${error.message}` });
      }
  });

  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: parseInt(id) },
        include: { benchmark: true, modelPortfolio: true },
      });
      if (portfolio) {
        res.json(portfolio);
      } else {
        res.status(404).json({ error: 'Portfolio not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
  });

export default router;
