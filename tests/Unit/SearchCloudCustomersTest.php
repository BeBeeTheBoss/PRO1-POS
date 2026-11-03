<?php

namespace Tests\Unit;

use App\Domain\Contacts\Actions\SearchCloudCustomers;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class SearchCloudCustomersTest extends TestCase
{
    public function test_it_uses_bound_exact_customer_code_mobile_and_id_card_conditions(): void
    {
        $connection = Mockery::mock(Connection::class);
        $connection->shouldReceive('select')
            ->once()
            ->withArgs(function (string $sql, array $bindings): bool {
                return str_contains($sql, 'FROM gbh_customer')
                    && str_contains($sql, 'mobile = ? OR identification_card = ? OR customer_barcode = ?')
                    && $bindings === [
                        'CUST-001',
                        'CUST-001',
                        'CUST-001',
                        'CUST-001',
                        'CUST-001',
                    ];
            })
            ->andReturn([(object) [
                'member_type' => 'Member',
                'tax_id' => 'TAX-001',
                'nrc' => '12/OUKAMA(N)123456',
                'member_card_no' => 'MEMBER-123456',
                'customer_code' => 'CUST-001',
                'customer_name' => 'Aung Min Khant',
                'address' => 'Yangon',
                'mobile' => '09421123456',
                'office_phone' => '01-123456',
            ]]);

        DB::shouldReceive('connection')
            ->once()
            ->with('cloud')
            ->andReturn($connection);

        $customer = (new SearchCloudCustomers)(' CUST-001 ')->sole();

        $this->assertSame('cloud:CUST-001', $customer['id']);
        $this->assertSame('MEMBER-123456', $customer['id_card']);
        $this->assertSame('09421123456', $customer['phone']);
        $this->assertSame('Member', $customer['member_type']);
    }

    public function test_it_does_not_query_cloud_for_an_empty_search(): void
    {
        DB::shouldReceive('connection')->never();

        $this->assertCount(0, (new SearchCloudCustomers)('  '));
    }
}
