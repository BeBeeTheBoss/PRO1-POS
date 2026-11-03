# Domain model

## Organization and catalog

- `branches`: physical shops or warehouses.
- `categories`: nested product grouping.
- `units`: quantity precision and display unit (`pcs`, `ft`, `m`, `bag`).
- `products`: SKU/barcode, cost, selling price, reorder level and lifecycle status.

SKU is the stable internal identifier. Barcode is optional and unique when present. Deactivating or soft-deleting a product must not alter previous sales.

The Products module currently provides a read-only cloud product directory backed by `temp_master_product`. It searches normalized product names and barcodes only after an explicit user search, returns at most 24 matches, and displays the barcode, unit, normal price and member price in a table. Each barcode cell provides an accessible clipboard-copy control. This directory does not replace the future local product/category/unit CRUD workflow or authorize cloud catalog mutations.

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

The system-owned `Cash Customer` record is the default for walk-in POS sales. It is marked by `is_cash_customer`, not by a hard-coded database ID. Registered customers are looked up from the read-only `cloud` PostgreSQL connection. POS selection uses an exact `gbh_customer.mobile` match, while the Customers directory accepts an exact `customer_barcode`, mobile or `identification_card` match. Cloud customer results retain their customer code, member card, NRC, tax ID, member type, address and phone details, and use a prefixed presentation key rather than pretending to be a local `customers.id`. Credit limit is a policy input; credit balance should be derived from ledger entries rather than stored as an editable number.

The Customers module is a read-only cloud directory. Its exact, parameter-bound search checks customer code, mobile and ID card and displays matches in a table with customer identity, membership, contact and address fields without copying or mutating cloud records. Customer code, mobile and ID card cells provide accessible clipboard-copy controls for cashier workflows. Empty searches must not query cloud, and connection failures must be reported as a recoverable generic UI error rather than exposing database details.

Cloud lookup is preparation only. Before a completed sale can reference a cloud customer, the server-side completion workflow must explicitly reconcile that external customer code to a local customer record or persist a designed external-customer snapshot. A client-provided cloud presentation key must never be written directly into the local `sales.customer_id` foreign key.

## POS preparation flow

The sidebar groups the `/pos` workspace beneath the `Sale` parent menu as `Cash Sale (CA)`. Keep future sale-entry modes as sibling submenus instead of adding unrelated top-level POS links.

1. Open the product-and-cart workspace immediately, with the system Cash Customer selected by default and without opening a modal. The customer card in the sale header opens the customer-selection modal on demand; the cashier can keep Cash Customer or find a registered cloud customer by exact mobile number. The separate Customers directory supports exact customer-code, mobile-number or ID-card lookup and presents matches in a table. A cloud outage must leave Cash Customer available and show a recoverable lookup error.
2. Scan an exact barcode as the primary product-entry workflow. Barcode lookup reads `cloud.temp_master_product` by an exact, parameter-bound `barcode_code`. Cash and Normal customers receive `product_price1`; a customer whose verified rank is Member receives `product_price2`. Both prices remain decimal strings, and the selected tier is an estimate until checkout revalidates the customer and price. An exact scan adds the product directly to the cart. Keep the keyboard-wedge scanner capture focused without displaying a barcode text box. The idle product workspace communicates scanner readiness with an icon, instructions and the latest scan status. Do not preload or display the product catalog when the POS opens. Manual search uses the same read-only cloud product source and searches `barcode_code` or `barcode_bill_name`; it returns at most 24 rows only after an explicit search. Search is parameter-bound and ignores letter case and whitespace. Manual results require an explicit add-to-cart action.
3. Build a local cart while respecting the selected branch's available quantity. Product rows and cart lines display the price tier selected from the customer chosen at the start of the sale: Normal/Cash uses `product_price1`, while Member uses `product_price2`. Manual search results keep the `Add to cart` action visible without requiring hover; an exact barcode scan adds directly. Quantity plus/minus controls move by one whole unit, while direct entry respects the unit's configured decimal precision.
4. Optionally scan an exact coupon barcode in the payment summary and explicitly apply the returned coupon. The estimated discount cannot exceed the current subtotal.
5. Show an estimated summary only. The future `CompleteSale` action must reload the cloud product price using the server-verified customer rank, reconcile product inventory, reload coupons and calculate authoritative totals inside the stock transaction. Never trust the client-provided customer type or selected price tier for a posted sale.

The in-progress customer, cart and selected coupon are persisted as a versioned browser draft scoped to the authenticated user and branch, so an accidental refresh or navigation does not discard the sale. Browser draft values are untrusted estimates and never replace server-side customer, price, coupon or stock validation. Clear the draft only after the server confirms successful payment/completion; a failed or interrupted payment must retain it for retry. The current roadmap has not implemented `CompleteSale` yet, so its eventual success callback must call the shared draft-clear helper.

## Planned purchasing

Purchasing is intentionally not migrated yet. Before implementing it, add `purchases`, `purchase_items`, and `supplier_payments`, mirroring the sales header/line/payment structure. Posting goods received must call the same inventory mutation service used by adjustments and sales.
