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
- Treat a hardware barcode scanner as a keyboard wedge: capture its printable key sequence and trailing Enter at the POS page level so scanning survives focus changes to non-editable controls. Only the focused, visible POS window may accept a scan; clear partial scan buffers on window blur or tab visibility changes so two open windows cannot combine or duplicate a scan. The scanner status indicator must reflect this real focus/visibility state instead of always claiming to be active. Do not intercept typing inside text, number, select, or content-editable fields, and suspend global scanner capture while a customer or coupon modal owns keyboard input.
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

## Cloud database connection

The optional PostgreSQL cloud database is registered as the `cloud` connection and does not replace the application's default connection. Configure `CLOUD_DB_HOST`, `CLOUD_DB_PORT`, `CLOUD_DB_DATABASE`, `CLOUD_DB_USERNAME`, and `CLOUD_DB_PASSWORD` in `.env`. `CLOUD_DB_SSLMODE` defaults to `prefer`; use the mode required by the database provider, commonly `require` for a hosted production database.

Use the connection explicitly so local application data is not accidentally sent to the cloud database:

```php
use Illuminate\Support\Facades\DB;

$rows = DB::connection('cloud')->table('example_table')->get();
```

For a model that always belongs to the cloud database, declare `protected $connection = 'cloud';`. Artisan database commands can target it with `--database=cloud`, for example `php artisan db:show --database=cloud`. Do not run cloud migrations or destructive database commands unless that database is an intentional migration target and has a verified backup.

The POS customer selector uses a parameter-bound, exact mobile-number query against `cloud.gbh_customer`. The Customers directory uses its dedicated read-only action to search by exact `customer_barcode`, mobile number or `identification_card`. Keep both integrations read-only. Do not copy raw SQL into controllers, interpolate user input, expose connection errors to the browser, or treat the returned presentation key as a local model ID.

POS barcode/manual product lookup and the Products directory use the read-only `cloud.temp_master_product` source. Scanner lookup matches `barcode_code` exactly. Manual and directory lookup share `SearchCloudProducts`, search normalized `barcode_code` and `barcode_bill_name`, limit results, and keep every search value parameter-bound. The directory displays both price tiers; POS selects `product_price1` for Cash/Normal customers and `product_price2` for Member customers. Checkout must revalidate the customer's rank and price server-side.

## Demo data

`DemoDataSeeder` is development-only, idempotent and safe to rerun. It creates catalog and opening stock only when a branch/product inventory row is missing, and records an opening stock movement for every demo inventory balance. Do not run demo seeders in production.

Demo coupon scanner values are `CPN-WELCOME-5000`, `CPN-HOME-10000`, and `CPN-PRO1-25000`. Coupon lookup is an exact barcode match and is not redemption; sale completion remains responsible for authoritative revalidation and persistence.

## Branding

The application uses a light-only theme with blue as its primary interaction and focus color. The application canvas uses a soft gray-blue background to reduce glare, while cards and primary work surfaces remain white for readable contrast. Do not add dark/system appearance controls or depend on the operating-system color scheme. The shared PRO1 Global Home Center brand asset is stored at `public/images/pro1-global-home-center.png`; use `AppLogo` for application navigation branding instead of duplicating logo markup.

## Definition of done

A feature is complete only when authorization, validation, database constraints, audit behavior, empty/error UI states, tests and relevant documentation are included.
