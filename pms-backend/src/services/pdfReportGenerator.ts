/**
 * @file This file contains the logic for generating PDF reports.
 * @module services/pdfReportGenerator
 */
import PDFDocument from 'pdfkit';
import { ReportData } from './reportingService'; // Assuming ReportData is exported

/**
 * Generates a PDF report from the given data and streams it.
 * @param {ReportData} data - The aggregated data for the report.
 * @param {NodeJS.WritableStream} stream - The stream to write the PDF to.
 */
export function generatePdfReport(data: ReportData, stream: NodeJS.WritableStream) {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(stream);

  // --- Report Header ---
  doc.fontSize(20).text(`Client Performance Report`, { align: 'center' });
  doc.fontSize(14).text(`${data.portfolio.client.name}`, { align: 'center' });
  doc.moveDown();

  // --- Portfolio & Period Summary ---
  doc.fontSize(16).text(`Portfolio: ${data.portfolio.name}`);
  doc.fontSize(12).text(`Reporting Period: ${new Date().toLocaleDateString()} - ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  // --- Performance Section ---
  doc.fontSize(16).text('Performance Summary', { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Time-Weighted Return (TWR): ${data.performance.portfolioTWR.toFixed(2)}%`);
  if (data.performance.benchmarkPerformance !== null) {
    doc.text(`Benchmark Return (${data.portfolio.benchmark.name}): ${data.performance.benchmarkPerformance.toFixed(2)}%`);
  }
  doc.moveDown(2);

  // --- Holdings Section ---
  doc.fontSize(16).text('Portfolio Holdings', { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Cash Balance: ${data.holdings.cashBalance.toFixed(2)}`);
  doc.moveDown();
  // Table Header
  doc.font('Helvetica-Bold');
  doc.text('Symbol', 50, doc.y);
  doc.text('Quantity', 200, doc.y, { width: 100, align: 'right' });
  doc.text('Average Cost', 300, doc.y, { width: 100, align: 'right' });
  doc.text('Total Cost', 400, doc.y, { width: 100, align: 'right' });
  doc.font('Helvetica');
  doc.moveDown();

  // Table Rows
  for (const asset of data.holdings.assets) {
    doc.text(asset.symbol, 50, doc.y);
    doc.text(asset.quantity.toFixed(4), 200, doc.y, { width: 100, align: 'right' });
    doc.text(asset.averageCost.toFixed(2), 300, doc.y, { width: 100, align: 'right' });
    doc.text(asset.totalCost.toFixed(2), 400, doc.y, { width: 100, align: 'right' });
    doc.moveDown(0.5);
  }
  doc.moveDown(2);

  // --- Transactions Section ---
  doc.fontSize(16).text('Transaction History', { underline: true });
  doc.moveDown();
  // Table Header
  doc.font('Helvetica-Bold');
  doc.text('Date', 50, doc.y);
  doc.text('Type', 150, doc.y);
  doc.text('Symbol', 250, doc.y);
  doc.text('Amount', 350, doc.y, { width: 100, align: 'right' });
  doc.font('Helvetica');
  doc.moveDown();

  // Table Rows
  for (const tx of data.transactions) {
    doc.text(new Date(tx.transactionDate).toLocaleDateString(), 50, doc.y);
    doc.text(tx.type, 150, doc.y);
    doc.text(tx.symbol || 'N/A', 250, doc.y);
    doc.text(tx.amount.toFixed(2), 350, doc.y, { width: 100, align: 'right' });
    doc.moveDown(0.5);
  }

  // Finalize the PDF and end the stream
  doc.end();
}
