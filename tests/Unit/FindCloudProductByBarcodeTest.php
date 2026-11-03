<?php

namespace Tests\Unit;

use App\Domain\Catalog\Actions\FindCloudProductByBarcode;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class FindCloudProductByBarcodeTest extends TestCase
{
    public function test_it_uses_a_bound_exact_barcode_query_and_selects_member_price(): void
    {
        $connection = Mockery::mock(Connection::class);
        $connection->shouldReceive('select')
            ->once()
            ->withArgs(function (string $sql, array $bindings): bool {
                return str_contains($sql, 'FROM temp_master_product')
                    && str_contains($sql, 'WHERE barcode_code = ?')
                    && str_contains($sql, 'product_price1::numeric(19,2)')
                    && str_contains($sql, 'product_price2::numeric(19,2)')
                    && $bindings === ['8852425459084'];
            })
            ->andReturn([(object) [
                'barcode' => '8852425459084',
                'product_name' => 'Member Price Product',
                'unit' => 'PCS',
                'normal_price' => '12500.00',
                'member_price' => '11000.00',
            ]]);

        DB::shouldReceive('connection')
            ->once()
            ->with('cloud')
            ->andReturn($connection);

        $product = (new FindCloudProductByBarcode)(
            '8852425459084',
            'Member',
        );

        $this->assertIsArray($product);
        $this->assertSame('cloud-product:8852425459084', $product['id']);
        $this->assertSame('11000.00', $product['selling_price']);
        $this->assertSame('12500.00', $product['normal_price']);
        $this->assertSame('Member', $product['price_tier']);
        $this->assertNull($product['available_quantity']);
    }

    public function test_it_does_not_query_cloud_for_an_empty_barcode(): void
    {
        DB::shouldReceive('connection')->never();

        $this->assertNull((new FindCloudProductByBarcode)('  '));
    }
}
