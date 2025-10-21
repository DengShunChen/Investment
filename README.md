# Professional Portfolio Management System (PMS) API

## 1. System Vision

This project is a professional-grade, backend API service for a Portfolio Management System (PMS). It is designed to provide investment advisors (IAs) with a powerful, one-stop platform for managing client assets efficiently. The system facilitates precise portfolio monitoring, performance attribution analysis, risk management, and the generation of professional client reports. The ultimate goal is to enhance the advisor's productivity and client satisfaction.

## 2. Technology Stack

- **Backend:** Node.js, Express.js, TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Containerization:** Docker

## 3. Core Features

The API is structured to support the following core modules of a comprehensive PMS:

- **Client Relationship Management (CRM):** Endpoints for creating and managing detailed client profiles, including financial status, investment goals, and risk tolerance.
- **Portfolio Accounting:**
  - Allows for a hierarchical account structure where a single client can have multiple portfolios.
  - Supports detailed transaction logging (Buys, Sells, Dividends, Fees, etc.).
  - Provides real-time holdings management, calculating positions, average cost basis, and unrealized gains/losses.
- **Performance & Risk Analytics:**
  - Business logic to calculate key performance metrics like Time-Weighted Return (TWR).
  - Endpoints to retrieve data for benchmark comparisons and risk analysis (e.g., Volatility, Sharpe Ratio).
- **Modeling & Rebalancing:** The foundation is in place to support model portfolios and monitor for deviations, with future work planned to generate rebalancing suggestions.
- **Reporting Engine:** The API provides the necessary data endpoints to feed a reporting engine, which can generate customized, white-labeled reports for clients.

## 4. Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Node.js](https://nodejs.org/) and npm (for local development outside of Docker)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd pms-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the `pms-backend` directory and configure your database connection string and any other required variables.
    ```env
    DATABASE_URL="postgresql://user:password@db:5432/pms_db?schema=public"
    ```

4.  **Start the services:**
    The entire development environment is managed via Docker. Use the following command to build and start the API server and the PostgreSQL database.
    ```bash
    sudo docker compose up -d
    ```
    The API will be available at `http://localhost:3000`.

5.  **Database Migrations:**
    The database schema is managed by Prisma Migrate. To apply migrations or create a new one after modifying the `schema.prisma` file, run the following command:
    ```bash
    sudo docker compose exec app npx prisma migrate dev --name your-migration-name
    ```

## 5. API Endpoints

The API is organized around three main resources:

- `GET /api/clients`: Retrieve all clients.
- `POST /api/clients`: Create a new client.
- `GET /api/clients/:id`: Retrieve a single client by their ID.

#### Portfolios

- `GET /api/portfolios`: Retrieve all portfolios.
- `POST /api/portfolios`: Create a new portfolio for a client.
- `GET /api/portfolios/:id`: Retrieve a single portfolio by its ID.
- `GET /api/clients/:clientId/portfolios`: Get all portfolios for a specific client.
- `GET /api/portfolios/:id/holdings`: Calculate and retrieve the detailed holdings for a specific portfolio.

#### Transactions

- `POST /api/transactions`: Create a new transaction for a portfolio.
- `GET /api/transactions/portfolio/:portfolioId`: Retrieve all transactions for a specific portfolio.

## 6. Project Structure

The source code is organized to separate concerns:

- `src/lib/`: Contains shared library code, such as the singleton Prisma client instance.
- `src/routes/`: Defines the API endpoints and handles incoming HTTP requests.
- `src/services/`: Contains the core business logic, such as the holding's calculation.
- `prisma/`: Contains the Prisma schema file (`schema.prisma`) and migration history.
- `docker-compose.yml`: Defines the services, networks, and volumes for the Docker environment.
- `Dockerfile`: Describes the steps to build the Docker image for the application.
