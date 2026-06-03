# RentFlex Ledger

Standalone full-stack MVP for a flexible rent reminder, invoice, statement, payment plan, and ledger system.

## Positioning

RentFlex Payment Ledger is a simple rent reminder and ledger system for landlords with tenants who pay in installments by Cash App, Chime, cash, money order, Zelle, or other flexible methods.

The app automatically creates rent invoices and balance statements from open ledger items. The landlord reviews and approves each draft before sending it by email and text to tenants.

## Core Workflows

- Create tenant profiles with contact, emergency contact, Start of Lease, property, account type, rent details, payment methods, memo, and notes.
- Build ongoing payment plans with monthly, semi-monthly, weekly, bi-weekly, or custom schedules.
- Track payment methods including Cash App, Chime, Zelle, Venmo, PayPal, ACH bank transfer, cash, money order, and other.
- Configure reminders for 7 days before, 3 days before, due today, 3 days late, and 7 days late.
- Track delivery channels for SMS, email, push notification, and in-app notification.
- Generate an automatic ledger showing `Date | Description | Charge | Payment | Balance`.
- Require `startOfLease` for active tenants, validate it as a real date, and prevent future lease start dates.

## Run

```bash
pnpm dev:all
```

This starts the frontend on `http://localhost:5184`, the backend API on `http://localhost:5185`, and connects the API to PostgreSQL via `DATABASE_URL`.

## Environment Variables

Copy `.env.example` to `.env` for local development.

```bash
RENTFLEX_WEB_PORT=5184
RENTFLEX_API_PORT=5185
VITE_API_PROXY_TARGET=http://127.0.0.1:5185
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/rentflex
DATABASE_SSL=false
```

`RENTFLEX_WEB_PORT` controls the Vite dev server, `RENTFLEX_API_PORT` controls the Node API, `VITE_API_PROXY_TARGET` controls the frontend `/api` proxy, `DATABASE_URL` points to PostgreSQL, and `DATABASE_SSL` toggles TLS for DB connections.

Railway / auth billing env split:

- Safe in browser: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `APP_NAME`
- Backend only: `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DATABASE_URL`, `OPENAI_API_KEY`
- Control flags: `BYPASS_AUTH`, `REQUIRE_CLERK_STRIPE_ENV`

## Verify Routes

With the dev server running:

```bash
pnpm verify:routes
```

This checks the configured frontend/API variables, all sidebar workflow targets, all internal app views, `GET /api/health`, `GET /api/state`, and the frontend root page.

## Build

```bash
pnpm build
```

## Backend

The backend uses PostgreSQL and stores app records in an `app_records` table (`collection`, `id`, `data`, `updated_at`). The frontend loads from `/api/state` and persists landlord actions through API calls.

API routes:

- `GET /api/health`
- `GET /api/state`
- `POST /api/tenants`
- `POST /api/payments`
- `POST /api/promises`
- `POST /api/reminders`
- `POST /api/documents`
- `POST /api/plan-acceptances`
- `PATCH /api/documents/:id/approve`
- `PATCH /api/documents/:id/send`
- `PATCH /api/tenants/:id/payday`

Core data entities:

- `Property`
- `Tenant`
- `PaymentPlan`
- `ExpectedPayment`
- `Payment`
- `Reminder`
- `PromiseToPay`
- `Invoice`
- `Statement`
- `DeliveryLog`

The backend preserves the manual Cash App and Chime workflow: tenants pay normally, then the landlord records payment status, amount, date, method, notes, and reminder history in the ledger. The invoice/statement workflow should use provider integrations such as SendGrid/Postmark for email and Twilio for SMS, with approval required before delivery.

Chime is intentionally modeled as payment instructions plus manual confirmation in Version 1, not as a direct Chime API integration. Store tenant `chimeSign`, `chimePhone`, `chimeEmail`, preferred payment method, and backup method so reminders and statements can include the correct instructions.
