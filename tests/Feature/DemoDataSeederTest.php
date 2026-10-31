<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockMovement;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoDataSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_data_is_complete_and_idempotent(): void
    {
        $this->seed(DemoDataSeeder::class);
        $this->seed(DemoDataSeeder::class);

        $this->assertSame(9, Customer::query()->count());
        $this->assertSame(18, Product::query()->count());
        $this->assertSame(18, Inventory::query()->count());
        $this->assertSame(18, StockMovement::query()->count());
        $this->assertSame(3, Coupon::query()->count());
        $this->assertSame(1, Customer::query()->where('is_cash_customer', true)->count());

        $this->assertDatabaseHas('customers', [
            'id_card' => '12/OUKAMA(N)123456',
            'name' => 'Aung Min Khant',
        ]);
        $this->assertDatabaseHas('products', [
            'sku' => 'BM-CEM-050',
            'barcode' => '100000000012',
        ]);
        $this->assertDatabaseHas('inventories', [
            'product_id' => Product::query()->where('sku', 'BM-CEM-050')->value('id'),
            'quantity' => 80,
        ]);
        $this->assertDatabaseHas('coupons', [
            'barcode' => 'CPN-HOME-10000',
            'amount' => 10000,
            'is_active' => true,
        ]);
    }
}
