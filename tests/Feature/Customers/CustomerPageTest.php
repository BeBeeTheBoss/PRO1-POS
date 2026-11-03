<?php

namespace Tests\Feature\Customers;

use App\Domain\Contacts\Actions\SearchCloudCustomers;
use App\Domain\Contacts\Exceptions\CloudCustomerLookupUnavailable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class CustomerPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_open_the_customer_directory(): void
    {
        $this->get(route('customers.index'))
            ->assertRedirect(route('login'));
    }

    public function test_customer_directory_opens_without_querying_cloud(): void
    {
        $finder = Mockery::mock(SearchCloudCustomers::class);
        $finder->shouldReceive('__invoke')->once()->with(null)->andReturn(collect());
        $this->app->instance(SearchCloudCustomers::class, $finder);

        $this->actingAs(User::factory()->create())
            ->get(route('customers.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('customers/index')
                ->has('customers', 0)
                ->where('lookupError', null)
                ->where('filters.search', ''));
    }

    public function test_registered_customers_can_be_found_by_exact_mobile_number(): void
    {
        $finder = Mockery::mock(SearchCloudCustomers::class);
        $finder->shouldReceive('__invoke')
            ->once()
            ->with('09421123456')
            ->andReturn(collect([$this->customer()]));
        $this->app->instance(SearchCloudCustomers::class, $finder);

        $this->actingAs(User::factory()->create())
            ->get(route('customers.index', ['search' => '09421123456']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('customers', 1)
                ->where('customers.0.name', 'Aung Min Khant')
                ->where('customers.0.phone', '09421123456')
                ->where('customers.0.member_type', 'Member')
                ->where('customers.0.customer_code', 'CUST-001')
                ->where('filters.search', '09421123456'));
    }

    public function test_registered_customers_can_be_found_by_exact_id_card(): void
    {
        $finder = Mockery::mock(SearchCloudCustomers::class);
        $finder->shouldReceive('__invoke')
            ->once()
            ->with('MEMBER-123456')
            ->andReturn(collect([$this->customer()]));
        $this->app->instance(SearchCloudCustomers::class, $finder);

        $this->actingAs(User::factory()->create())
            ->get(route('customers.index', ['search' => 'MEMBER-123456']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('customers', 1)
                ->where('customers.0.member_card_no', 'MEMBER-123456')
                ->where('filters.search', 'MEMBER-123456'));
    }

    public function test_registered_customers_can_be_found_by_exact_customer_code(): void
    {
        $finder = Mockery::mock(SearchCloudCustomers::class);
        $finder->shouldReceive('__invoke')
            ->once()
            ->with('CUST-001')
            ->andReturn(collect([$this->customer()]));
        $this->app->instance(SearchCloudCustomers::class, $finder);

        $this->actingAs(User::factory()->create())
            ->get(route('customers.index', ['search' => 'CUST-001']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('customers', 1)
                ->where('customers.0.customer_code', 'CUST-001')
                ->where('filters.search', 'CUST-001'));
    }

    public function test_cloud_lookup_failure_is_presented_without_exposing_database_details(): void
    {
        $finder = Mockery::mock(SearchCloudCustomers::class);
        $finder->shouldReceive('__invoke')
            ->once()
            ->with('09421123456')
            ->andThrow(new CloudCustomerLookupUnavailable);
        $this->app->instance(SearchCloudCustomers::class, $finder);

        $this->actingAs(User::factory()->create())
            ->get(route('customers.index', ['search' => '09421123456']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('customers', 0)
                ->where('lookupError', 'The customer directory is unavailable. Please try again.'));
    }

    public function test_customer_search_is_validated(): void
    {
        $finder = Mockery::mock(SearchCloudCustomers::class);
        $finder->shouldNotReceive('__invoke');
        $this->app->instance(SearchCloudCustomers::class, $finder);

        $this->actingAs(User::factory()->create())
            ->from(route('customers.index'))
            ->get(route('customers.index', ['search' => str_repeat('A', 81)]))
            ->assertRedirect(route('customers.index'))
            ->assertSessionHasErrors('search');
    }

    /** @return array<string, mixed> */
    private function customer(): array
    {
        return [
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
            'office_phone' => '01-123456',
        ];
    }
}
