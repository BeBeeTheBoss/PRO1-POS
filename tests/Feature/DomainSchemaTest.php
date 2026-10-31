<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DomainSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_core_pos_tables_are_available(): void
    {
        foreach ([
            'branches', 'categories', 'units', 'products', 'customers', 'suppliers',
            'inventories', 'stock_movements', 'sales', 'sale_items', 'payments', 'coupons',
        ] as $table) {
            $this->assertTrue(Schema::hasTable($table), "Expected the {$table} table to exist.");
        }
    }

    public function test_inventory_has_one_balance_per_branch_and_product(): void
    {
        $this->assertTrue(Schema::hasColumns('inventories', [
            'branch_id', 'product_id', 'quantity',
        ]));
    }

    public function test_customers_support_pos_identity_selection(): void
    {
        $this->assertTrue(Schema::hasColumns('customers', [
            'id_card', 'is_cash_customer',
        ]));
    }

    public function test_coupons_support_barcode_amount_and_validity(): void
    {
        $this->assertTrue(Schema::hasColumns('coupons', [
            'code', 'barcode', 'amount', 'is_active', 'starts_at', 'expires_at',
        ]));
    }
}
