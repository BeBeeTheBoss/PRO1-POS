<?php

namespace App\Http\Controllers;

use App\Domain\Catalog\Actions\FindCloudProductByBarcode;
use App\Domain\Catalog\Actions\SearchCloudProducts;
use App\Domain\Catalog\Exceptions\CloudProductLookupUnavailable;
use App\Domain\Contacts\Actions\FindCloudCustomersByMobile;
use App\Domain\Contacts\Exceptions\CloudCustomerLookupUnavailable;
use App\Domain\Sales\Actions\FindAvailableCoupon;
use App\Http\Requests\Pos\PosIndexRequest;
use App\Models\Branch;
use App\Models\Coupon;
use App\Models\Customer;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * @phpstan-type CouponData array{id: int, name: string, code: string, barcode: string, amount: string}
 * @phpstan-type CustomerData array{id: int|string, name: string, id_card: string|null, phone: string|null, is_cash_customer: bool, source?: 'cloud', member_type?: string, tax_id?: string|null, nrc?: string|null, member_card_no?: string|null, customer_code?: string|null, address?: string|null, office_phone?: string|null}
 *
 * @phpstan-import-type CloudCustomerData from FindCloudCustomersByMobile
 * @phpstan-import-type CloudProductData from FindCloudProductByBarcode
 */
class PosController extends Controller
{
    public function __construct(
        private readonly FindAvailableCoupon $findAvailableCoupon,
        private readonly FindCloudCustomersByMobile $findCloudCustomersByMobile,
        private readonly FindCloudProductByBarcode $findCloudProductByBarcode,
        private readonly SearchCloudProducts $searchCloudProducts,
    ) {}

    public function __invoke(PosIndexRequest $request): Response
    {
        $filters = $request->validated();
        $branch = Branch::query()->where('is_active', true)->orderBy('id')->firstOrFail();
        $customerLookup = $this->customerLookup($filters['customer_search'] ?? null);
        $barcodeLookup = $this->barcodeLookup(
            $filters['barcode'] ?? null,
            $filters['customer_type'] ?? 'Normal',
        );
        $productLookup = $this->productLookup(
            $filters['product_search'] ?? null,
            $filters['customer_type'] ?? 'Normal',
        );

        return Inertia::render('pos/index', [
            'branch' => $branch->only(['id', 'name', 'code']),
            'cashCustomer' => fn () => $this->cashCustomer(),
            'customerResults' => $customerLookup['results'],
            'customerLookupError' => $customerLookup['error'],
            'productResults' => $productLookup['results'],
            'productLookupError' => $productLookup['error'],
            'barcodeProduct' => $barcodeLookup['product'],
            'barcodeLookupError' => $barcodeLookup['error'],
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

    /** @return CustomerData */
    private function cashCustomer(): array
    {
        $customer = Customer::query()
            ->where('is_cash_customer', true)
            ->where('is_active', true)
            ->firstOrFail();

        return $this->customerData($customer);
    }

    /** @return array{results: Collection<int, CloudCustomerData>, error: string|null} */
    private function customerLookup(?string $mobile): array
    {
        try {
            return [
                'results' => ($this->findCloudCustomersByMobile)($mobile),
                'error' => null,
            ];
        } catch (CloudCustomerLookupUnavailable $exception) {
            report($exception->getPrevious() ?? $exception);

            return [
                'results' => collect(),
                'error' => 'The customer directory is unavailable. Try again or continue with Cash Customer.',
            ];
        }
    }

    /** @return array{results: Collection<int, CloudProductData>, error: string|null} */
    private function productLookup(?string $search, string $customerType): array
    {
        try {
            return [
                'results' => ($this->searchCloudProducts)($search, $customerType),
                'error' => null,
            ];
        } catch (CloudProductLookupUnavailable $exception) {
            report($exception->getPrevious() ?? $exception);

            return [
                'results' => collect(),
                'error' => 'The product catalog is unavailable. Please try searching again.',
            ];
        }
    }

    /** @return array{product: CloudProductData|null, error: string|null} */
    private function barcodeLookup(?string $barcode, string $customerType): array
    {
        try {
            return [
                'product' => ($this->findCloudProductByBarcode)($barcode, $customerType),
                'error' => null,
            ];
        } catch (CloudProductLookupUnavailable $exception) {
            report($exception->getPrevious() ?? $exception);

            return [
                'product' => null,
                'error' => 'The product catalog is unavailable. Please try scanning again.',
            ];
        }
    }

    /** @return CustomerData */
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
