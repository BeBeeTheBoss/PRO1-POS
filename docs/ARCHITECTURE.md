# Architecture

## Goals

The application is a modular monolith. It keeps deployment simple while preserving explicit business boundaries so modules can grow without controllers and models becoming a single coupled layer.

## Request flow

```text
React page -> Inertia request -> Form Request -> Controller
                                            -> Application Action
                                            -> Domain models / transaction
                                            -> Inertia response
```

- Routes and controllers handle HTTP concerns only.
- Form Requests own authorization and input validation.
- Application Actions coordinate a use case such as `CompleteSale` or `ReceivePurchase`.
- Domain enums and small value objects express business states.
- Eloquent models own relationships and persistence casts, not multi-step workflows.
- React pages compose feature components; reusable primitives stay under `resources/js/components/ui`.

## Backend layout

```text
app/
  Domain/
    Inventory/Enums/
    Sales/Enums/
  Actions/                 # one class per business use case
  Http/
    Controllers/
    Requests/
  Models/
```

When a module grows, create `app/Domain/<Module>/Actions`, `Data`, `Enums`, and `Exceptions`. Do not introduce repositories that only proxy Eloquent. Add a repository only when there are multiple storage implementations or a query boundary with real value.

## Frontend layout

```text
resources/js/
  pages/                   # route-level Inertia screens
  components/              # shared application components
  components/ui/           # design-system primitives
  hooks/                   # reusable client behavior
  types/                   # global/shared types
```

For a completed feature, colocate non-shared UI in `resources/js/features/<module>`. Pages should mainly wire props, layout, and feature components.

## Database and consistency

- Money uses `decimal(18,2)` and must never use float arithmetic for writes.
- Quantities use `decimal(18,3)` to support feet, metres, weight and partial units.
- `inventories` stores the current branch/product balance for fast reads.
- `stock_movements` is the immutable audit ledger explaining every balance change.
- Completed sale line items snapshot product name, SKU, unit price and cost so historical invoices do not change when catalog data changes.
- Operational records are voided or reversed, not hard-deleted.

Stock-changing actions must use one database transaction and lock the inventory row with `lockForUpdate()`. Write the business record, inventory balance and stock movement in that same transaction.

## Security boundaries

- Every application route requires authentication and verified email.
- Add policies before exposing catalog, inventory, sales and reports to non-admin roles.
- Public registration is convenient for local setup but must be disabled before production rollout.
- Never trust totals sent by React. The server reloads product price, calculates totals and validates available stock.
- Rate-limit login and sensitive mutations; retain Fortify's password, 2FA and passkey support.

## Production baseline

Use MySQL or PostgreSQL, Redis for cache/queues, a supervised queue worker, scheduled backups, HTTPS and centralized logs. Run migrations as a release step and `php artisan optimize` after deployment. Configure `APP_DEBUG=false`, a unique app key, real mail, trusted proxy settings and error monitoring.
