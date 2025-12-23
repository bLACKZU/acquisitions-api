# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands and workflows

### Install dependencies
- Use `npm ci` (preferred, uses the exact lockfile) or `npm install` from the repo root.

### Run the API locally
- Development server with file watching:
  - `npm run dev`
  - This runs `node --watch src/index.js` and starts the Express app on `PORT` (default `3000`).
- Production-style run (no watcher):
  - `npm start`

### Linting and formatting
- Lint the entire project: `npm run lint`
- Lint and auto-fix: `npm run lint:fix`
- Format all files with Prettier: `npm run format`
- Check formatting only: `npm run format:check`

### Database (Drizzle ORM + Neon)
These scripts assume `DATABASE_URL` is configured in the environment and Drizzle is set up via `drizzle.config` (see repo if present).
- Generate migrations from schema: `npm run db:generate`
- Apply migrations: `npm run db:migrate`
- Open Drizzle Studio (DB browser): `npm run db:studio`

### Docker
A multi-stage Dockerfile is provided.
- Build image: `docker build -t acquisitions-api .`
- Run in development mode (uses `npm run dev` stage): build with `development` target or use local Node for dev.
- Run production container:
  - `docker run -p 3000:3000 --env-file .env acquisitions-api`

### Testing
- There is currently **no test script** defined in `package.json` and no test runner configured. When tests are added (e.g. Jest/Vitest), update this section with the recommended commands (including how to run a single test/spec).

## High-level architecture

This is a Node.js (ES modules) Express API following an MVC-ish layering with explicit separation of config, routes, controllers, services, models, validations, middleware, and utilities.

### Entry point and server lifecycle
- `src/index.js`
  - Top-level entry that loads environment variables via `dotenv/config` and imports `src/server.js`.
- `src/server.js`
  - Creates the HTTP server by importing the configured Express app from `src/app.js`.
  - Reads `PORT` from `process.env.PORT` (default `3000`) and calls `app.listen`.
- This split keeps HTTP server concerns (`listen`, port binding) separate from application/middleware setup.

### Express app, middleware, and routing
- `src/app.js`
  - Creates the Express instance and wires common middleware:
    - `helmet` for security headers.
    - `cors` with default settings.
    - `express.json` / `express.urlencoded` for body parsing.
    - `cookie-parser` to populate `req.cookies`.
    - `morgan` HTTP logging, piped into the shared Winston logger.
  - Attaches `securityMiddleware` (Arcjet-based) globally **before** route registration.
  - Registers routes:
    - `app.use('/api/auth', authRoute)` — authentication endpoints.
    - `app.use('/api/users', usersRoute)` — user-related endpoints.
  - Exposes basic endpoints for monitoring:
    - `GET /` — simple hello message.
    - `GET /health` — JSON health check with status, timestamp, and uptime.
    - `GET /api` — simple API status payload.

### Routing and controllers
- `src/routes/*.routes.js`
  - `auth.routes.js` wires POST endpoints for `sign-up`, `sign-in`, and `sign-out` to the auth controller.
  - `users.routes.js` provides REST-style routes under `/api/users`, currently delegating list behavior to `fetchAllUsers` and stubbing ID-based handlers.
- `src/controllers/*.controller.js`
  - Controllers are thin HTTP-layer handlers that:
    - Validate input using Zod schemas from `src/validations`.
    - Call into service-layer functions for business logic and data access.
    - Use shared utilities for JWT creation and cookie handling.
    - Log meaningful events using the central logger.
  - Example flows:
    - **Signup**: validate body → `createUser` service → generate JWT → set auth cookie → return sanitized user payload.
    - **Signin**: validate body → `authenticateUser` service → generate JWT → set auth cookie → return sanitized user payload.
    - **Signout**: clear auth cookie and return confirmation.

### Services and data access (Drizzle + Neon)
- `src/config/database.js`
  - Configures the Neon client and Drizzle ORM using `process.env.DATABASE_URL`.
  - In non-production environments, it adjusts Neon config for a local HTTP endpoint.
  - Exports `db` (Drizzle instance) and `sql`.
- `src/models/user.model.js`
  - Defines the `users` table schema with fields such as `id`, `name`, `email`, `password`, `role`, `createdAt`, and `updatedAt` using `drizzle-orm/pg-core`.
- `src/services/auth.service.js`
  - Encapsulates user creation and authentication logic.
  - Uses `bcrypt` for password hashing and comparison.
  - Performs Drizzle queries against the `users` table to prevent duplicates and to fetch users for login.
  - Centralizes error handling and logging for auth-related DB operations.
- `src/services/users.service.js`
  - Provides higher-level operations for user listing and potentially other user-centric operations.
  - Returns shaped, sanitized user objects (no password hashes).

### Security and rate limiting (Arcjet)
- `src/config/arcjet.js`
  - Creates a base Arcjet client with rules for:
    - General shielding (`shield`) against common attacks.
    - Bot detection (`detectBot`) with a whitelist of allowed categories.
    - Baseline sliding-window rate limiting.
  - Uses `process.env.ARCJET_KEY` for configuration.
- `src/middleware/security.middleware.js`
  - Express middleware that derives a current `role` (defaults to `guest`) from the request.
  - Applies a per-role rate limit using Arcjet’s `slidingWindow` rule (different limits for `admin`, `user`, and `guest`).
  - Inspects Arcjet decisions and returns 403 responses for:
    - Bot traffic.
    - Shield-detected malicious traffic.
    - Requests exceeding rate limits.
  - Logs structured details about blocked/limited requests.

### Validation, utilities, and shared config
- `src/validations/auth.validation.js`
  - Defines Zod schemas for `signUp` and `signIn` payloads, including email normalization, password length constraints, and allowed roles.
- `src/utils/format.js`
  - Provides helpers to turn Zod validation errors into user-friendly strings.
- `src/utils/jwt.js`
  - Wraps `jsonwebtoken` with a small API (`jwttoken.sign` / `jwttoken.verify`).
  - Reads `JWT_SECRET` (with a non-production default) and sets a default expiration (`1d`).
- `src/utils/cookies.js`
  - Centralizes cookie options (httpOnly, secure in production, sameSite, maxAge).
  - Exposes helpers for setting, clearing, and reading cookies.
- `src/config/logger.js`
  - Configures a Winston logger with JSON logs and timestamping.
  - Writes to `logs/error.log` and `logs/combined.log`.
  - In non-production environments, adds a colorized console transport for easier local debugging.

### Module resolution and path aliases
- This project uses Node ESM `imports` to create path aliases (see `package.json`):
  - `#config/*` → `./src/config/*`
  - `#models/*` → `./src/models/*`
  - `#routes/*` → `./src/routes/*`
  - `#controllers/*` → `./src/controllers/*`
  - `#middleware/*` → `./src/middleware/*`
  - `#utils/*` → `./src/utils/*`
  - `#services/*` → `./src/services/*`
  - `#validations/*` → `./src/validations/*`
- When adding new modules in these folders, prefer using the same aliases for consistency and clearer import paths.

### Environment configuration
- The app expects configuration via environment variables, typically loaded by `dotenv`:
  - `DATABASE_URL` — connection string for Neon/Postgres.
  - `ARCJET_KEY` — Arcjet site key.
  - `JWT_SECRET` — secret used for signing JWTs (override the default in production).
  - `LOG_LEVEL` — log verbosity for the Winston logger.
  - `NODE_ENV` — used to toggle production vs non-production behavior in logger and DB config.
  - `PORT` — HTTP port for the Express server (defaults to `3000` if unset).

When updating project structure (e.g., adding new domains, routes, or services), keep the existing layering pattern (routes → controllers → services → models/DB) and reuse shared config, security middleware, and utilities where appropriate.