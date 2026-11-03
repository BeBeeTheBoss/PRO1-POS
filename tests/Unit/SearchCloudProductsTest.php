<?php

namespace Tests\Unit;

use App\Domain\Catalog\Actions\SearchCloudProducts;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class SearchCloudProductsTest extends TestCase
{
    public function test_it_searches_cloud_products_by_normalized_name_or_barcode(): void
    {
        $connection = Mockery::mock(Connection::class);
        $connection->shouldReceive('select')
            ->once()
            ->withArgs(function (string $sql, array $bindings): bool {
                return str_contains($sql, 'FROM temp_master_product')
                    && str_contains($sql, "COALESCE(barcode_code, '')")
                    && str_contains($sql, "COALESCE(barcode_bill_name, '')")
                    && str_contains($sql, 'product_price1::numeric(19,2)')
                    && str_contains($sql, 'product_price2::numeric(19,2)')
                    && str_contains($sql, 'LIMIT 24')
                    && $bindings === ['%clawhammer%', '%clawhammer%', 'ClAw   HaMmEr'];
            })
            ->andReturn([(object) [
                'barcode' => '8852425459084',
                'product_name' => 'Claw Hammer',
                'unit' => 'PCS',
                'normal_price' => '12500.00',
                'member_price' => '11000.00',
            ]]);

        DB::shouldReceive('connection')
            ->once()
            ->with('cloud')
            ->andReturn($connection);

        $products = (new SearchCloudProducts)('  ClAw   HaMmEr  ', 'Member');

        $this->assertCount(1, $products);
        $this->assertSame('cloud-product:8852425459084', $products[0]['id']);
        $this->assertSame('Claw Hammer', $products[0]['name']);
        $this->assertSame('8852425459084', $products[0]['barcode']);
        $this->assertSame('11000.00', $products[0]['selling_price']);
        $this->assertSame('Member', $products[0]['price_tier']);
    }

    public function test_it_does_not_query_cloud_for_an_empty_search(): void
    {
        DB::shouldReceive('connection')->never();

        $this->assertTrue((new SearchCloudProducts)('  ')->isEmpty());
    }

    public function test_it_selects_normal_price_for_a_normal_customer(): void
    {
        $connection = Mockery::mock(Connection::class);
        $connection->shouldReceive('select')
            ->once()
            ->andReturn([(object) [
                'barcode' => '2000000675923',
                'product_name' => 'Crystal Chandelier',
                'unit' => 'PC',
                'normal_price' => '850000.00',
                'member_price' => '800000.00',
            ]]);

        DB::shouldReceive('connection')
            ->once()
            ->with('cloud')
            ->andReturn($connection);

        $product = (new SearchCloudProducts)('2000000675923', 'Normal')->firstOrFail();

        $this->assertSame('850000.00', $product['selling_price']);
        $this->assertSame('Normal', $product['price_tier']);
    }
}
