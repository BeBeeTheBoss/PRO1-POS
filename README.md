# Hardware POS

A maintainable point-of-sale and inventory foundation for household goods and construction supplies.

## Stack

- Laravel 13 / PHP 8.3+
- React 19 + TypeScript
- Inertia.js 3
- Tailwind CSS 4 + shadcn/ui
- SQLite for local development; MySQL 8+ or PostgreSQL 16+ for production
- PHPUnit, Larastan, Pint, TypeScript and Vite Plus checks

## First-time setup

```bash
composer install
cp .env.example .env
touch database/database.sqlite
php artisan key:generate
php artisan migrate --seed
npm install
npm run build
```

Start the local app, queue worker, logs and frontend dev server together:

```bash
composer dev
```

Open `http://localhost:8000`. The development seed creates `admin@example.com` with password `password`. Never use these credentials in production.

To add or refresh the safe demo catalog without deleting existing sales, run:

```bash
php artisan db:seed --class=DemoDataSeeder
```

The demo seed includes Cash Customer, eight searchable customers, eighteen products, branch inventory and matching opening-stock ledger entries. It can be run more than once without creating duplicates. Use barcode `100000000001` through `100000000018` for scanner testing, or search a customer with ID card digits such as `123456`.

## Quality checks

```bash
composer test
npm run check
npm run types:check
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Domain model and invariants](docs/DOMAIN.md)
- [Development conventions](docs/DEVELOPMENT.md)
- [Delivery roadmap](docs/ROADMAP.md)

The current scope is the platform foundation: authentication, domain schema, core models, dashboard, navigation and module boundaries. Feature pages intentionally start as module placeholders and should be delivered in the order defined in the roadmap.
