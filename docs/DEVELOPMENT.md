# Development guide

## Required workflow

1. Start from a documented use case and its invariants.
2. Add or update a migration; never edit a migration already deployed to shared environments.
3. Write a Form Request and policy for mutations.
4. Put multi-model business logic in a single-purpose Action class.
5. Cover the happy path, authorization, validation and transaction rollback with feature tests.
6. Build the Inertia page with typed props and accessible UI states.
7. Run all quality checks before review.

## PHP conventions

- Use strict, descriptive types and backed enums for finite states.
- Controllers remain thin and return `Response`, `RedirectResponse`, or JSON resources explicitly.
- Never call `request()` inside domain actions; pass validated data and authenticated context in.
- Avoid hidden model observers for money or stock mutations. Critical side effects must be visible in the action transaction.
- Eager-load relationships used by an Inertia response.
- Use database constraints as the final integrity boundary.

## React and Inertia conventions

- Type every page prop; do not use `any`.
- Use Inertia forms for server-owned data and server validation.
- Keep currency values from the server as decimal strings until display; never post client-calculated authoritative totals.
- Provide loading, empty, error and disabled states.
- Support keyboard-first POS interactions and keep barcode input focused where appropriate.
- Keep POS search on Inertia partial reloads; do not turn the application into a parallel client-side API SPA.
- Use semantic HTML and visible focus styles.

## Naming

- Actions are verbs: `CompleteSale`, `AdjustStock`, `ReceivePurchase`.
- Requests describe operations: `StoreProductRequest`, `CompleteSaleRequest`.
- Routes use resource names and action endpoints: `products.store`, `sales.complete`.
- React components and pages use PascalCase exports; filenames remain kebab-case.

## Transactions and concurrency

All stock and payment posting runs inside `DB::transaction()`. Lock inventory rows in deterministic product-id order to reduce deadlocks. Generate invoice numbers inside the transaction with a database-backed sequence or unique retry strategy. External work such as email and receipt integrations is dispatched after commit.

## Testing

- Unit tests: pure calculations and value objects.
- Feature tests: HTTP contract, policies, validation and persisted side effects.
- Transaction tests: concurrent/duplicate sale attempts, insufficient stock and rollback.
- Frontend checks: TypeScript and Vite Plus lint/format checks.

Commands:

```bash
composer test
npm run check
npm run types:check
npm run build
```

## Network development

`composer dev` binds Laravel to `0.0.0.0:8000` and Vite to all interfaces so the POS can be tested from another device on the same network. Open `http://<LAN-IP>:8000` from that device; do not open Vite's development port directly. Vite accepts browser origins from private IPv4 networks and detects the first non-internal IPv4 address for HMR. When a VPN, Docker, or multiple adapters cause it to select the wrong address, start with `VITE_HMR_HOST=<LAN-IP> composer dev`.

Local HTTP development uses a host-only, non-secure, `SameSite=Lax` session cookie. Keep `SESSION_DOMAIN=null`, `SESSION_SECURE_COOKIE=false`, and `SESSION_SAME_SITE=lax` for LAN testing. After switching from `localhost` to a LAN IP, clear the old site data for both hosts or open a fresh private browser window before the first login. Never reuse these HTTP cookie settings for an HTTPS production deployment.

If login returns `419 Page Expired`, verify that both the login page and its submission use the same `http://<LAN-IP>:8000` origin, then run `php artisan optimize:clear` and reload the page. The application includes the current session CSRF token in the login form as a fallback while retaining Laravel's CSRF verification.

Only expose this development server on a trusted local network. It is not a production server and must not be forwarded directly to the public internet.

## Demo data

`DemoDataSeeder` is development-only, idempotent and safe to rerun. It creates catalog and opening stock only when a branch/product inventory row is missing, and records an opening stock movement for every demo inventory balance. Do not run demo seeders in production.

Demo coupon scanner values are `CPN-WELCOME-5000`, `CPN-HOME-10000`, and `CPN-PRO1-25000`. Coupon lookup is an exact barcode match and is not redemption; sale completion remains responsible for authoritative revalidation and persistence.

## Branding

The application uses blue as its primary interaction and focus color. The shared PRO1 Global Home Center brand asset is stored at `public/images/pro1-global-home-center.png`; use `AppLogo` for application navigation branding instead of duplicating logo markup.

## Definition of done

A feature is complete only when authorization, validation, database constraints, audit behavior, empty/error UI states, tests and relevant documentation are included.
