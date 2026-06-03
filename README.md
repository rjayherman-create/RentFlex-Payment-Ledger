# RentFlex Ledger

Standalone Vite React MVP for a flexible rent reminder, invoice, statement, and ledger system connected conceptually to `rjayherman-create/RentFlex-Payment-Ledger`.

## Positioning

RentFlex Payment Ledger is a simple rent reminder and ledger system for landlords with tenants who pay in installments by Cash App, Chime, cash, money order, Zelle, or other flexible methods.

The app automatically creates rent invoices and balance statements from open ledger items. The landlord reviews and approves each draft before sending it by email and text to tenants.

## Core Workflows

- Create tenant profiles with contact, emergency contact, lease, property, account type, rent details, payment methods, memo, and notes.
- Build ongoing payment plans with monthly, semi-monthly, weekly, bi-weekly, or custom schedules.
- Track payment methods including Cash App, Chime, Zelle, Venmo, PayPal, ACH bank transfer, cash, money order, and other.
- Configure reminders for 7 days before, 3 days before, due today, 3 days late, and 7 days late.
- Track delivery channels for SMS, email, push notification, and in-app notification.
- Generate an automatic ledger showing `Date | Description | Charge | Payment | Balance`.

## Run

```bash
pnpm --filter @rentflex/payment-ledger dev
```

## Build

```bash
pnpm --filter @rentflex/payment-ledger build
```

## Connection Notes

This app is designed to be moved into or pushed to `https://github.com/rjayherman-create/RentFlex-Payment-Ledger` as the frontend package. It uses in-browser demo state now, and its data types map directly to the requested backend entities:

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

The first backend connection should preserve the manual Cash App and Chime workflow: tenants pay normally, then the landlord records payment status, amount, date, method, notes, and reminder history in the ledger. The invoice/statement workflow should use provider integrations such as SendGrid/Postmark for email and Twilio for SMS, with approval required before delivery.

Chime is intentionally modeled as payment instructions plus manual confirmation in Version 1, not as a direct Chime API integration. Store tenant `chimeSign`, `chimePhone`, `chimeEmail`, preferred payment method, and backup method so reminders and statements can include the correct instructions.
