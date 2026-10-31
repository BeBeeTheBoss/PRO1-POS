<?php

namespace App\Http\Controllers;

use App\Domain\Inventory\Enums\ProductStatus;
use App\Domain\Sales\Actions\FindAvailableCoupon;
use App\Http\Requests\Pos\PosIndexRequest;
use App\Models\Branch;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * @phpstan-type ProductData array{id: int, name: string, sku: string, barcode: string|null, selling_price: string, available_quantity: string, unit_name: string, unit_short_name: string, decimal_places: int}
 * @phpstan-type CouponData array{id: int, name: string, code: string, barcode: string, amount: string}
 */
class PosController extends Controller
{
    public function __construct(private readonly FindAvailableCoupon $findAvailableCoupon) {}

    public function __invoke(PosIndexRequest $request): Response
    {
        $filters = $request->validated();
        $branch = Branch::query()->where('is_active', true)->orderBy('id')->firstOrFail();

        return Inertia::render('pos/index', [
            'branch' => $branch->only(['id', 'name', 'code']),
            'cashCustomer' => fn () => $this->cashCustomer(),
            'customerResults' => fn () => $this->customers($filters['customer_search'] ?? null),
            'productResults' => fn () => $this->products($branch->id, $filters['product_search'] ?? null),
            'barcodeProduct' => fn () => $this->barcodeProduct($branch->id, $filters['barcode'] ?? null),
            'couponResult' => fn () => $this->coupon($filters['coupon_barcode'] ?? null),
            'filters' => [
                'customerSearch' => $filters['customer_search'] ?? '',
                'productSearch' => $filters['product_search'] ?? '',
            ],
        ]);
    }

    /** @return CouponData|null */
    private function coupon(?string $barcode): ?array
    {
        $coupon = ($this->findAvailableCoupon)($barcode);

        return $coupon ? $this->couponData($coupon) : null;
    }

    /** @return array{id: int, name: string, id_card: string|null, phone: string|null, is_cash_customer: bool} */
    private function cashCustomer(): array
    {
        $customer = Customer::query()
            ->where('is_cash_customer', true)
            ->where('is_active', true)
            ->firstOrFail();

        return $this->customerData($customer);
    }

    /** @return Collection<int, array{id: int, name: string, id_card: string|null, phone: string|null, is_cash_customer: bool}> */
    private function customers(?string $search): Collection
    {
        $search = trim((string) $search);

        if ($search === '') {
            return collect();
        }

        return Customer::query()
            ->where('is_active', true)
            ->where('is_cash_customer', false)
            ->where('id_card', 'like', "%{$search}%")
            ->orderByRaw('case when id_card = ? then 0 else 1 end', [$search])
            ->orderBy('name')
            ->limit(10)
            ->get()
            ->map(fn (Customer $customer): array => $this->customerData($customer));
    }

    /** @return Collection<int, ProductData> */
    private function products(int $branchId, ?string $search): Collection
    {
        $search = $this->normalizeProductSearch((string) $search);
        $query = $this->productQuery($branchId);

        if ($search !== '') {
            $query->where(function (Builder $query) use ($search): void {
                $query
                    ->whereRaw("LOWER(REPLACE(COALESCE(name, ''), ' ', '')) LIKE ?", ["%{$search}%"])
                    ->orWhereRaw("LOWER(REPLACE(COALESCE(sku, ''), ' ', '')) LIKE ?", ["%{$search}%"])
                    ->orWhereRaw("LOWER(REPLACE(COALESCE(barcode, ''), ' ', '')) LIKE ?", ["%{$search}%"]);
            });
        }

        return $query
            ->orderBy('name')
            ->limit(24)
            ->get()
            ->map(fn (Product $product): array => $this->productData($product));
    }

    private function normalizeProductSearch(string $search): string
    {
        $withoutWhitespace = preg_replace('/\s+/u', '', trim($search)) ?? '';

        return mb_strtolower($withoutWhitespace);
    }

    /** @return ProductData|null */
    private function barcodeProduct(int $branchId, ?string $barcode): ?array
    {
        $barcode = trim((string) $barcode);

        if ($barcode === '') {
            return null;
        }

        $product = $this->productQuery($branchId)
            ->where('barcode', $barcode)
            ->first();

        return $product ? $this->productData($product) : null;
    }

    /** @return Builder<Product> */
    private function productQuery(int $branchId): Builder
    {
        return Product::query()
            ->with('unit:id,name,short_name,decimal_places')
            ->withSum([
                'inventories as available_quantity' => fn (Builder $query) => $query->where('branch_id', $branchId),
            ], 'quantity')
            ->where('status', ProductStatus::Active);
    }

    /** @return array{id: int, name: string, id_card: string|null, phone: string|null, is_cash_customer: bool} */
    private function customerData(Customer $customer): array
    {
        return [
            'id' => $customer->id,
            'name' => $customer->name,
            'id_card' => $customer->id_card,
            'phone' => $customer->phone,
            'is_cash_customer' => $customer->is_cash_customer,
        ];
    }

    /** @return ProductData */
    private function productData(Product $product): array
    {
        $availableQuantity = (string) ($product->getAttribute('available_quantity') ?? '0.000');

        return [
            'id' => (int) $product->id,
            'name' => (string) $product->name,
            'sku' => (string) $product->sku,
            'barcode' => $product->barcode,
            'selling_price' => (string) $product->selling_price,
            'available_quantity' => $availableQuantity,
            'unit_name' => (string) $product->unit->name,
            'unit_short_name' => (string) $product->unit->short_name,
            'decimal_places' => (int) $product->unit->decimal_places,
        ];
    }

    /** @return CouponData */
    private function couponData(Coupon $coupon): array
    {
        return [
            'id' => (int) $coupon->id,
            'name' => (string) $coupon->name,
            'code' => (string) $coupon->code,
            'barcode' => (string) $coupon->barcode,
            'amount' => (string) $coupon->amount,
        ];
    }
}
