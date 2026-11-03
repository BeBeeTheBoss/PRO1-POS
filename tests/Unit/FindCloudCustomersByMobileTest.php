<?php

namespace Tests\Unit;

use App\Domain\Contacts\Actions\FindCloudCustomersByMobile;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class FindCloudCustomersByMobileTest extends TestCase
{
    public function test_it_uses_a_bound_exact_mobile_query_and_maps_cloud_customer_data(): void
    {
        $connection = Mockery::mock(Connection::class);
        $connection->shouldReceive('select')
            ->once()
            ->withArgs(function (string $sql, array $bindings): bool {
                return str_contains($sql, 'FROM gbh_customer')
                    && str_contains($sql, 'WHERE mobile = ?')
                    && $bindings === ['09421123456'];
            })
            ->andReturn([(object) [
                'member_type' => 'Member',
                'tax_id' => 'TAX-001',
                'nrc' => '12/OUKAMA(N)123456',
                'member_card_no' => 'MEMBER-123456',
                'customer_code' => 'CUST-001',
                'customer_name' => "Aung Min\nKhant",
                'address' => 'Yangon',
                'mobile' => '09421123456',
                'office_phone' => '01-123456',
            ]]);

        DB::shouldReceive('connection')
            ->once()
            ->with('cloud')
            ->andReturn($connection);

        $customer = (new FindCloudCustomersByMobile)('09421123456')->sole();

        $this->assertSame('cloud:CUST-001', $customer['id']);
        $this->assertSame('Member', $customer['member_type']);
        $this->assertSame('MEMBER-123456', $customer['member_card_no']);
        $this->assertSame('09421123456', $customer['phone']);
        $this->assertFalse($customer['is_cash_customer']);
    }

    public function test_it_does_not_query_cloud_for_an_empty_mobile_number(): void
    {
        DB::shouldReceive('connection')->never();

        $this->assertCount(0, (new FindCloudCustomersByMobile)('  '));
    }
}
