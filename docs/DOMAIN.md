# Domain model

## Organization and catalog

- `branches`: physical shops or warehouses.
- `categories`: nested product grouping.
- `units`: quantity precision and display unit (`pcs`, `ft`, `m`, `bag`).
- `products`: SKU/barcode, cost, selling price, reorder level and lifecycle status.

SKU is the stable internal identifier. Barcode is optional and unique when present. Deactivating or soft-deleting a product must not alter previous sales.

## Inventory

- `inventories`: one current balance per branch and product.
- `stock_movements`: append-only changes with type, signed quantity, resulting balance, actor and polymorphic source record.

Invariants:

1. One inventory row exists for each stocked branch/product pair.
2. A completed sale cannot leave stock below zero unless an explicit future setting allows negative stock.
3. Every balance change creates exactly one movement per affected product.
4. `balance_after` equals the locked inventory balance after applying that movement.
5. Posted movements are never edited; corrections use a reversing movement.

## Sales

- `sales`: invoice header, customer/cashier, status and server-calculated totals.
- `sale_items`: immutable commercial snapshot for each product line.
- `payments`: one or more payment allocations, supporting split tender.
- `coupons`: fixed-value discount definitions identified by unique code and barcode, with active and validity windows.

Status flow:

```text
draft -> completed -> refunded
   \-> voided
```

Completing a sale is an atomic action: validate stock, calculate lines, store payment, decrement inventory and append movements. Use an idempotency key when offline/retry support is introduced.

Coupon barcode lookup only makes an active, currently valid coupon available to the POS estimate. Applying it locally does not redeem it. The future `CompleteSale` action must reload and lock the coupon as needed, revalidate its status and validity, cap its discount at the authoritative subtotal, and persist a coupon/discount snapshot with the sale.

The following equation must hold for a completed sale:

```text
grand_total = subtotal - discount_total + tax_total
paid_total >= grand_total
change_total = paid_total - grand_total
```

## Contacts

- `customers`: optional sale owner and future credit account.
- `suppliers`: source for future purchase orders and payable tracking.

The system-owned `Cash Customer` record is the default for walk-in POS sales. It is marked by `is_cash_customer`, not by a hard-coded database ID. Registered customers may be selected by their unique `id_card`. Credit limit is a policy input; credit balance should be derived from ledger entries rather than stored as an editable number.

## POS preparation flow

1. Select the system Cash Customer or find an active registered customer by ID card.
2. Scan an exact barcode or manually search active products by name, SKU or barcode. Manual search ignores letter case and whitespace on both the search term and catalog value.
3. Build a local cart while respecting the selected branch's available quantity. Manual search results require an explicit `Add to cart` action; an exact barcode scan adds directly. Quantity plus/minus controls move by one whole unit, while direct entry respects the unit's configured decimal precision.
4. Optionally scan an exact coupon barcode in the payment summary and explicitly apply the returned coupon. The estimated discount cannot exceed the current subtotal.
5. Show an estimated summary only. The future `CompleteSale` action must reload products and coupons and calculate authoritative totals inside the stock transaction.

## Planned purchasing

Purchasing is intentionally not migrated yet. Before implementing it, add `purchases`, `purchase_items`, and `supplier_payments`, mirroring the sales header/line/payment structure. Posting goods received must call the same inventory mutation service used by adjustments and sales.
