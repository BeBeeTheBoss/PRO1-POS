# Delivery roadmap

## Phase 0 — Foundation (current)

- [x] Laravel, React, Inertia and TypeScript starter
- [x] Authentication, email verification, 2FA and passkeys
- [x] Branch, catalog, contact, inventory and sales schema
- [x] Core Eloquent relationships and enums
- [x] Operational dashboard shell and module navigation
- [x] Architecture, domain and development documentation

## Phase 1 — Sell safely

- [ ] Roles and permissions: owner, manager, cashier, stock clerk
- [ ] Branch assignment and active branch selection
- [ ] Product/category/unit CRUD with barcode search
- [ ] Opening stock and audited stock adjustments
- [x] POS customer selection, barcode/manual search and local cart summary
- [x] POS coupon barcode lookup and estimated fixed-value discount
- [ ] Server-side POS pricing, split payments and receipt
- [ ] Atomic `CompleteSale` action with row locks and idempotency
- [ ] Sales history, invoice view, void and return workflow

## Phase 2 — Replenish stock

- [ ] Supplier CRUD
- [ ] Purchase order and goods receiving
- [ ] Supplier payments and outstanding balances
- [ ] Inter-branch transfers with send/receive states
- [ ] Low-stock alerts and reorder suggestions

## Phase 3 — Operate and understand

- [ ] Customer credit ledger and collections
- [ ] Cash register open/close and cashier reconciliation
- [ ] Sales, gross profit, stock valuation and movement reports
- [ ] CSV/Excel import and export
- [ ] Thermal receipt configuration and Myanmar text verification
- [ ] Scheduled backups, monitoring and audit log review

## Phase 4 — Hardening

- [ ] Offline/retry strategy for unstable connections
- [ ] Load and concurrency testing for checkout
- [ ] Production MySQL/PostgreSQL and Redis deployment
- [ ] Backup restore drill and disaster-recovery runbook
- [ ] Security review and least-privilege policy audit

Complete phases in order. Do not add accounting, multi-currency or offline behavior until the core sale/inventory transaction is proven under concurrent tests.
