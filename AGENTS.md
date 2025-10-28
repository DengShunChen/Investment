# AGENTS.md - System Analysis for PMS

This document outlines the architecture and core functionalities of the Portfolio Management System (PMS). It is intended to be a reference for developers and agents working on this project.

## 1. System Architecture

The project is a full-stack application composed of two main services:

-   **`pms-backend`**: A Node.js API service built with Express.js and TypeScript. It handles business logic, data processing, and database interactions.
    -   **ORM**: Prisma is used for database access and schema management, connecting to a PostgreSQL database.
    -   **Structure**: The source code in `src/` is organized into `routes` for API endpoint definitions, `services` for business logic, and `lib` for shared utilities like the Prisma client.
    -   **Containerization**: The backend is containerized using a `Dockerfile` for production builds.

-   **`pms-frontend`**: A modern web application built with Next.js 14, React, and TypeScript. It provides the user interface for both advisors and clients.
    -   **Routing**: It uses the App Router paradigm, with routes defined by the directory structure inside `app/`.
    -   **UI**: The UI is built with Ant Design components, with data visualizations handled by Recharts.
    -   **State Management**: Zustand is used for global state management.
    -   **Containerization**: The frontend is also containerized, with its `Dockerfile` configured for development hot-reloading.

-   **Orchestration**: The entire stack is managed by a root `docker-compose.yml` file, which simplifies starting and managing the `pms-backend` (app), `pms-frontend` (frontend), and the PostgreSQL database services.

## 2. Core Feature Analysis

This section details the primary user workflows that have been prioritized for testing and verification.

### 2.1. User Login & Authentication

-   **Objective**: To securely authenticate a user and establish a session.
-   **Frontend Flow**:
    1.  The user navigates to the login page, likely rendered by `pms-frontend/app/(auth)/login/page.tsx`.
    2.  The user enters their credentials into a form.
    3.  Upon submission, the form triggers an API call to the backend's authentication endpoint (e.g., `/api/auth/login`).
-   **Backend Flow**:
    1.  The login request is received by the corresponding route in `pms-backend/src/routes/auth.ts`.
    2.  The route handler calls an `authService` from `pms-backend/src/services/`.
    3.  The service validates the credentials against user data stored in the database via Prisma.
    4.  If successful, the backend generates a session token (e.g., JWT) and returns it to the frontend.
-   **Session Management**: The frontend stores the token and includes it in the header of subsequent API requests to access protected routes.

### 2.2. Client & Portfolio Creation

-   **Objective**: To allow an advisor to create a new client and associate a new investment portfolio with that client.
-   **Frontend Flow**:
    1.  After logging in, the advisor navigates to the client management section, likely starting from `pms-frontend/app/clients/page.tsx`.
    2.  The advisor initiates a "Create Client" action, which opens a form.
    3.  The advisor fills in the client's details and submits the form, triggering an API call to a backend endpoint (e.g., `POST /api/clients`).
    4.  Upon successful client creation, the UI may redirect to a page where a portfolio can be created for that client, triggering another API call (e.g., `POST /api/portfolios`).
-   **Backend Flow**:
    1.  The creation requests are handled by routes defined in `pms-backend/src/routes/`, likely `clients.ts` and `portfolios.ts`.
    2.  These routes call their respective services (`clientService`, `portfolioService`) from `pms-backend/src/services/`.
    3.  The services validate the incoming data (e.g., ensuring required fields are present).
    4.  Using Prisma, the services create new records in the `Client` and `Portfolio` tables in the database.
    5.  The backend returns the newly created objects to the frontend.
