import express from 'express';
import clientRoutes from './routes/clients';
import portfolioRoutes from './routes/portfolios';
import transactionRoutes from './routes/transactions';

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// API Routes
app.use('/api/clients', clientRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/transactions', transactionRoutes);

app.get('/', (req, res) => {
  res.send('Portfolio Management System API is running...');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
