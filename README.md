# Professional Portfolio Management System (PMS) API

## 1. System Vision
This project is a professional-grade, backend API service for a Portfolio Management System (PMS). It is designed to provide investment advisors (IAs) with a powerful platform for managing client assets, monitoring performance, analyzing risk, and generating client reports.

## 2. Technology Stack
- **Backend:** Node.js, Express.js, TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Containerization:** Docker
- **Financial Data:** [StockData.org](https://www.stockdata.org/)

## 3. Core Features
- **Client Relationship Management (CRM):** Create and manage detailed client profiles and log all client interactions.
- **Portfolio Accounting:** Supports a wide range of transaction types (Buys, Sells, Dividends, Cash Deposits), batch import from CSV, and provides real-time holdings calculations.
- **Performance & Risk Analytics:** Calculates key metrics like Time-Weighted Return (TWR), Volatility, Sharpe Ratio, and Maximum Drawdown. Supports benchmark comparisons.
- **Modeling & Rebalancing:** Allows creation of standardized model portfolios, monitors client portfolios for drift, and generates rebalancing proposals.
- **Reporting Engine:** Generates comprehensive client reports in either JSON or PDF format.

## 4. Getting Started
(Sections on Prerequisites, Installation, and Setup remain the same)

### Installation & Setup

1.  **Clone the repository...**
2.  **Get a Financial Data API Key...**
3.  **Configure Environment Variables...**
    ```env
    DATABASE_URL="postgresql://user:password@db:5432/pms_db?schema=public"
    STOCKDATA_API_KEY="YOUR_API_KEY_HERE"
    ```
4.  **Install dependencies...**
5.  **Start the services...**
6.  **Database Migrations...**

## 5. API Endpoints
The API provides a comprehensive set of RESTful endpoints. Key features include:

### Transaction Batch Import
You can batch import transactions for a portfolio by uploading a CSV file.

**Endpoint:** `POST /api/transactions/batch-import/:portfolioId`

**Form Data:** The request must be `multipart/form-data` with a single file field named `file`.

**CSV Format:** The CSV file must contain the following headers:
`date,type,symbol,assetType,quantity,price,amount`

- **date:** ISO 8601 format (e.g., `2023-10-21`).
- **type:** Must match one of the valid `TransactionType` enum values (e.g., `BUY`, `SELL`, `DIVIDEND`, `CASH_DEPOSIT`).
- **symbol:** Required for `BUY`, `SELL`, `DIVIDEND`. Can be empty for cash transactions.
- **assetType:** Must match one of the valid `AssetType` enum values (e.g., `STOCK`, `CASH`).
- **quantity, price:** Required for `BUY` and `SELL` types.
- **amount:** The total cash impact of the transaction. **Important:** This should be a negative value for cash outflows (e.g., BUY, FEES) and positive for inflows (e.g., SELL, DIVIDEND, CASH_DEPOSIT).

For other endpoints, please refer to the route definitions in the `src/routes/` directory.

## 6. Project Structure
- `src/lib/`: Shared library code (e.g., Prisma client).
- `src/routes/`: API endpoint definitions.
- `src/services/`: Core business logic for calculations and data processing.
- `prisma/`: Database schema and migration history.
- `docker-compose.yml`: Docker service definitions.
- `Dockerfile`: Application container build instructions.
