# RentFlex Ledger

Standalone Vite React MVP for a flexible rent reminder, invoice, statement, and ledger system.

## Positioning

RentFlex Payment Ledger is a simple rent reminder and ledger system for landlords with tenants who pay in installments by Cash App, Chime, cash, money order, Zelle, or other flexible methods.

The app automatically creates rent invoices and balance statements from open ledger items. The landlord reviews and approves each draft before sending it by email and text to tenants.

## Run

```bash
pnpm dev
```

## Build

```bash
pnpm build
```

## Data Model

The app uses in-browser demo state now, and its data types map directly to the requested backend entities:

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

The first backend implementation should preserve the manual Cash App and Chime workflow: tenants pay normally, then the landlord records payment status, amount, date, method, notes, and reminder history in the ledger. The invoice/statement workflow should use provider integrations such as SendGrid/Postmark for email and Twilio for SMS, with approval required before delivery.

Chime is intentionally modeled as payment instructions plus manual confirmation in Version 1, not as a direct Chime API integration. Store tenant `chimeSign`, `chimePhone`, `chimeEmail`, preferred payment method, and backup method so reminders and statements can include the correct instructions.
