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
- **Portfolio Accounting:** Supports a wide range of transaction types (Buys, Sells, Dividends, Cash Deposits) and provides real-time holdings and cash balance calculations.
- **Performance & Risk Analytics:** Calculates key metrics like Time-Weighted Return (TWR), Volatility, Sharpe Ratio, and Maximum Drawdown. Supports benchmark comparisons.
- **Modeling & Rebalancing:** Allows creation of standardized model portfolios, monitors client portfolios for drift, and generates rebalancing proposals.
- **Reporting Engine:** Generates comprehensive client reports in either JSON or PDF format.

## 4. Getting Started

### Prerequisites
- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Node.js](https://nodejs.org/) and npm

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd pms-backend
    ```

2.  **Get a Financial Data API Key:**
    This project uses [StockData.org](https://www.stockdata.org/) for financial market data.
    - Go to their website and sign up for a free account to get an API key.

3.  **Configure Environment Variables:**
    Create a `.env` file in the `pms-backend` root directory. Add your database connection string and the API key you just obtained.
    ```env
    # PostgreSQL connection string for Docker
    DATABASE_URL="postgresql://user:password@db:5432/pms_db?schema=public"

    # Your StockData.org API Key
    STOCKDATA_API_KEY="YOUR_API_KEY_HERE"
    ```

4.  **Install dependencies:**
    ```bash
    npm install
    ```

5.  **Start the services:**
    The entire development environment is managed via Docker.
    ```bash
    sudo docker compose up -d --build
    ```
    The API will be available at `http://localhost:3000`.

6.  **Database Migrations:**
    To apply schema changes, run the following command:
    ```bash
    sudo docker compose exec app npx prisma migrate dev --name your-migration-name
    ```

## 5. API Endpoints
The API is organized around key resources like clients, portfolios, transactions, benchmarks, and models. All major features are exposed through a comprehensive set of RESTful endpoints. For detailed information on available endpoints, please refer to the route definitions in the `src/routes/` directory.

## 6. Project Structure
- `src/lib/`: Shared library code (e.g., Prisma client).
- `src/routes/`: API endpoint definitions.
- `src/services/`: Core business logic for calculations and data processing.
- `prisma/`: Database schema and migration history.
- `docker-compose.yml`: Docker service definitions.
- `Dockerfile`: Application container build instructions.
