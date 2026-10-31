<?php

namespace Tests\Feature\Pos;

use App\Models\Branch;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PosPageTest extends TestCase
{
    use RefreshDatabase;

    private Customer $cashCustomer;

    private Customer $registeredCustomer;

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
        $this->registeredCustomer = Customer::query()->create([
            'name' => 'Aung Min Khant',
            'id_card' => '12/OUKAMA(N)123456',
            'phone' => '09-421-123-456',
        ]);
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

    public function test_pos_opens_with_cash_customer_and_available_products(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get(route('pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('pos/index')
                ->where('cashCustomer.id', $this->cashCustomer->id)
                ->where('cashCustomer.name', 'Cash Customer')
                ->has('productResults', 1)
                ->where('productResults.0.id', $this->product->id)
                ->where('productResults.0.available_quantity', '24'));
    }

    public function test_customer_can_be_found_by_partial_id_card(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get(route('pos.index', ['customer_search' => '123456']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('customerResults', 1)
                ->where('customerResults.0.id', $this->registeredCustomer->id)
                ->where('customerResults.0.id_card', '12/OUKAMA(N)123456'));
    }

    public function test_barcode_lookup_returns_an_exact_product(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get(route('pos.index', ['barcode' => '100000000001']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('barcodeProduct.id', $this->product->id)
                ->where('barcodeProduct.barcode', '100000000001'));
    }

    public function test_manual_product_search_ignores_case_and_spaces(): void
    {
        $this->actingAs(User::factory()->create());

        foreach (['clawhammer', 'CLAW HAMMER', '  ClAw   HaMmEr  ', 'hw- ham-001'] as $search) {
            $this->get(route('pos.index', ['product_search' => $search]))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->has('productResults', 1)
                    ->where('productResults.0.id', $this->product->id)
                    ->where('productResults.0.name', 'Claw Hammer'));
        }
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
}
