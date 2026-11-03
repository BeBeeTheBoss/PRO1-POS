<?php

namespace Tests\Feature\Pos;

use App\Domain\Catalog\Actions\FindCloudProductByBarcode;
use App\Domain\Catalog\Actions\SearchCloudProducts;
use App\Domain\Catalog\Exceptions\CloudProductLookupUnavailable;
use App\Domain\Contacts\Actions\FindCloudCustomersByMobile;
use App\Domain\Contacts\Exceptions\CloudCustomerLookupUnavailable;
use App\Models\Branch;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class PosPageTest extends TestCase
{
    use RefreshDatabase;

    private Customer $cashCustomer;

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $branch = Branch::query()->create([
            'name' => 'Main Branch',
            'code' => 'MAIN',
        ]);
        $unit = Unit::query()->create([
            'name' => 'Piece',
            'short_name' => 'pcs',
        ]);

        $this->cashCustomer = Customer::query()
            ->where('is_cash_customer', true)
            ->firstOrFail();
        $this->product = Product::query()->create([
            'unit_id' => $unit->id,
            'name' => 'Claw Hammer',
            'sku' => 'HW-HAM-001',
            'barcode' => '100000000001',
            'selling_price' => '15000.00',
        ]);
        Inventory::query()->create([
            'branch_id' => $branch->id,
            'product_id' => $this->product->id,
            'quantity' => '24.000',
        ]);
    }

    public function test_guests_cannot_open_the_pos(): void
    {
        $this->get(route('pos.index'))->assertRedirect(route('login'));
    }

    public function test_pos_opens_with_cash_customer_without_preloading_product_catalog(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get(route('pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('pos/index')
                ->where('cashCustomer.id', $this->cashCustomer->id)
                ->where('cashCustomer.name', 'Cash Customer')
                ->has('productResults', 0));
    }

    public function test_cloud_customer_can_be_found_by_exact_mobile_number(): void
    {
        $finder = Mockery::mock(FindCloudCustomersByMobile::class);
        $finder->shouldReceive('__invoke')
            ->once()
            ->with('09421123456')
            ->andReturn(collect([[
                'id' => 'cloud:CUST-001',
                'name' => 'Aung Min Khant',
                'id_card' => 'MEMBER-123456',
                'phone' => '09421123456',
                'is_cash_customer' => false,
                'source' => 'cloud',
                'member_type' => 'Member',
                'tax_id' => 'TAX-001',
                'nrc' => '12/OUKAMA(N)123456',
                'member_card_no' => 'MEMBER-123456',
                'customer_code' => 'CUST-001',
                'address' => 'Yangon',
                'office_phone' => null,
            ]]));
        $this->app->instance(FindCloudCustomersByMobile::class, $finder);
        $this->actingAs(User::factory()->create());

        $this->get(route('pos.index', ['customer_search' => '09421123456']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('customerResults', 1)
                ->where('customerResults.0.id', 'cloud:CUST-001')
                ->where('customerResults.0.phone', '09421123456')
                ->where('customerResults.0.member_type', 'Member')
                ->where('customerResults.0.customer_code', 'CUST-001')
                ->where('customerLookupError', null));
    }

    public function test_cloud_customer_lookup_failure_is_presented_without_breaking_the_pos(): void
    {
        $finder = Mockery::mock(FindCloudCustomersByMobile::class);
        $finder->shouldReceive('__invoke')
            ->once()
            ->with('09421123456')
            ->andThrow(new CloudCustomerLookupUnavailable);
        $this->app->instance(FindCloudCustomersByMobile::class, $finder);

        $this->actingAs(User::factory()->create())
            ->get(route('pos.index', ['customer_search' => '09421123456']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('customerResults', 0)
                ->where('customerLookupError', 'The customer directory is unavailable. Try again or continue with Cash Customer.'));
    }

    public function test_barcode_lookup_uses_normal_cloud_price_for_cash_customer(): void
    {
        $finder = Mockery::mock(FindCloudProductByBarcode::class);
        $finder->shouldReceive('__invoke')
            ->once()
            ->with('8852425459084', 'Normal')
            ->andReturn($this->cloudProduct('Normal', '12500.00'));
        $this->app->instance(FindCloudProductByBarcode::class, $finder);
        $this->actingAs(User::factory()->create());

        $this->get(route('pos.index', [
            'barcode' => '8852425459084',
            'customer_type' => 'Normal',
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('barcodeProduct.id', 'cloud-product:8852425459084')
                ->where('barcodeProduct.barcode', '8852425459084')
                ->where('barcodeProduct.selling_price', '12500.00')
                ->where('barcodeProduct.price_tier', 'Normal')
                ->where('barcodeLookupError', null));
    }

    public function test_barcode_lookup_uses_member_cloud_price_for_member_customer(): void
    {
        $finder = Mockery::mock(FindCloudProductByBarcode::class);
        $finder->shouldReceive('__invoke')
            ->once()
            ->with('8852425459084', 'Member')
            ->andReturn($this->cloudProduct('Member', '11000.00'));
        $this->app->instance(FindCloudProductByBarcode::class, $finder);

        $this->actingAs(User::factory()->create())
            ->get(route('pos.index', [
                'barcode' => '8852425459084',
                'customer_type' => 'Member',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('barcodeProduct.selling_price', '11000.00')
                ->where('barcodeProduct.normal_price', '12500.00')
                ->where('barcodeProduct.member_price', '11000.00')
                ->where('barcodeProduct.price_tier', 'Member'));
    }

    public function test_cloud_product_lookup_failure_is_presented_without_breaking_the_pos(): void
    {
        $finder = Mockery::mock(FindCloudProductByBarcode::class);
        $finder->shouldReceive('__invoke')
            ->once()
            ->with('8852425459084', 'Normal')
            ->andThrow(new CloudProductLookupUnavailable);
        $this->app->instance(FindCloudProductByBarcode::class, $finder);

        $this->actingAs(User::factory()->create())
            ->get(route('pos.index', [
                'barcode' => '8852425459084',
                'customer_type' => 'Normal',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('barcodeProduct', null)
                ->where('barcodeLookupError', 'The product catalog is unavailable. Please try scanning again.'));
    }

    public function test_manual_product_search_uses_cloud_name_or_barcode_and_customer_price(): void
    {
        $finder = Mockery::mock(SearchCloudProducts::class);
        $finder->shouldReceive('__invoke')
            ->once()
            ->with('ClAw Hammer', 'Member')
            ->andReturn(collect([$this->cloudProduct('Member', '11000.00')]));
        $this->app->instance(SearchCloudProducts::class, $finder);
        $this->actingAs(User::factory()->create());

        $this->get(route('pos.index', [
            'product_search' => 'ClAw Hammer',
            'customer_type' => 'Member',
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('productResults', 1)
                ->where('productResults.0.id', 'cloud-product:8852425459084')
                ->where('productResults.0.barcode', '8852425459084')
                ->where('productResults.0.selling_price', '11000.00')
                ->where('productLookupError', null));
    }

    public function test_manual_cloud_product_lookup_failure_is_presented_without_breaking_the_pos(): void
    {
        $finder = Mockery::mock(SearchCloudProducts::class);
        $finder->shouldReceive('__invoke')
            ->once()
            ->with('Claw Hammer', 'Normal')
            ->andThrow(new CloudProductLookupUnavailable);
        $this->app->instance(SearchCloudProducts::class, $finder);

        $this->actingAs(User::factory()->create())
            ->get(route('pos.index', ['product_search' => 'Claw Hammer']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('productResults', 0)
                ->where('productLookupError', 'The product catalog is unavailable. Please try searching again.'));
    }

    public function test_active_coupon_can_be_found_by_exact_barcode(): void
    {
        $coupon = Coupon::query()->create([
            'name' => 'Home Center Reward',
            'code' => 'HOME-10000',
            'barcode' => 'CPN-HOME-10000',
            'amount' => '10000.00',
            'is_active' => true,
        ]);

        $this->actingAs(User::factory()->create())
            ->get(route('pos.index', ['coupon_barcode' => $coupon->barcode]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('couponResult.id', $coupon->id)
                ->where('couponResult.barcode', 'CPN-HOME-10000')
                ->where('couponResult.amount', '10000.00'));
    }

    public function test_inactive_or_expired_coupon_is_not_available(): void
    {
        Coupon::query()->create([
            'name' => 'Expired Coupon',
            'code' => 'EXPIRED-5000',
            'barcode' => 'CPN-EXPIRED-5000',
            'amount' => '5000.00',
            'is_active' => true,
            'expires_at' => now()->subMinute(),
        ]);

        $this->actingAs(User::factory()->create())
            ->get(route('pos.index', ['coupon_barcode' => 'CPN-EXPIRED-5000']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('couponResult', null));
    }

    /** @return array<string, mixed> */
    private function cloudProduct(string $priceTier, string $sellingPrice): array
    {
        return [
            'id' => 'cloud-product:8852425459084',
            'name' => 'Cloud Product',
            'sku' => '8852425459084',
            'barcode' => '8852425459084',
            'selling_price' => $sellingPrice,
            'normal_price' => '12500.00',
            'member_price' => '11000.00',
            'price_tier' => $priceTier,
            'available_quantity' => null,
            'unit_name' => 'PCS',
            'unit_short_name' => 'PCS',
            'decimal_places' => 3,
            'source' => 'cloud',
        ];
    }
}
