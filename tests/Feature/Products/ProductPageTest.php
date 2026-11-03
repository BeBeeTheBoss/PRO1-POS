<?php

namespace Tests\Feature\Products;

use App\Domain\Catalog\Actions\SearchCloudProducts;
use App\Domain\Catalog\Exceptions\CloudProductLookupUnavailable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class ProductPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_open_the_product_directory(): void
    {
        $this->get(route('products.index'))
            ->assertRedirect(route('login'));
    }

    public function test_product_directory_opens_without_querying_cloud(): void
    {
        $finder = Mockery::mock(SearchCloudProducts::class);
        $finder->shouldReceive('__invoke')
            ->once()
            ->with(null, 'Normal')
            ->andReturn(collect());
        $this->app->instance(SearchCloudProducts::class, $finder);

        $this->actingAs(User::factory()->create())
            ->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('products/index')
                ->has('products', 0)
                ->where('lookupError', null)
                ->where('filters.search', ''));
    }

    public function test_products_can_be_found_by_name_or_barcode(): void
    {
        $finder = Mockery::mock(SearchCloudProducts::class);
        $finder->shouldReceive('__invoke')
            ->once()
            ->with('Claw Hammer', 'Normal')
            ->andReturn(collect([$this->product()]));
        $this->app->instance(SearchCloudProducts::class, $finder);

        $this->actingAs(User::factory()->create())
            ->get(route('products.index', ['search' => 'Claw Hammer']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('products', 1)
                ->where('products.0.name', 'Claw Hammer')
                ->where('products.0.barcode', '8852425459084')
                ->where('products.0.normal_price', '12500.00')
                ->where('products.0.member_price', '11000.00')
                ->where('filters.search', 'Claw Hammer'));
    }

    public function test_cloud_lookup_failure_is_presented_without_database_details(): void
    {
        $finder = Mockery::mock(SearchCloudProducts::class);
        $finder->shouldReceive('__invoke')
            ->once()
            ->with('8852425459084', 'Normal')
            ->andThrow(new CloudProductLookupUnavailable);
        $this->app->instance(SearchCloudProducts::class, $finder);

        $this->actingAs(User::factory()->create())
            ->get(route('products.index', ['search' => '8852425459084']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('products', 0)
                ->where('lookupError', 'The product catalog is unavailable. Please try again.'));
    }

    public function test_product_search_is_validated(): void
    {
        $finder = Mockery::mock(SearchCloudProducts::class);
        $finder->shouldNotReceive('__invoke');
        $this->app->instance(SearchCloudProducts::class, $finder);

        $this->actingAs(User::factory()->create())
            ->from(route('products.index'))
            ->get(route('products.index', ['search' => str_repeat('A', 101)]))
            ->assertRedirect(route('products.index'))
            ->assertSessionHasErrors('search');
    }

    public function test_legacy_product_module_url_redirects_to_the_directory(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/modules/products')
            ->assertRedirect('/products');
    }

    /** @return array<string, mixed> */
    private function product(): array
    {
        return [
            'id' => 'cloud-product:8852425459084',
            'name' => 'Claw Hammer',
            'sku' => '8852425459084',
            'barcode' => '8852425459084',
            'selling_price' => '12500.00',
            'normal_price' => '12500.00',
            'member_price' => '11000.00',
            'price_tier' => 'Normal',
            'available_quantity' => null,
            'unit_name' => 'PCS',
            'unit_short_name' => 'PCS',
            'decimal_places' => 3,
            'source' => 'cloud',
        ];
    }
}
