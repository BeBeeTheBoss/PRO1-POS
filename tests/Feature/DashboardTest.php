<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page(): void
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_dashboard(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('stats.todayRevenue', 0)
            ->where('stats.todayTransactions', 0)
            ->where('stats.activeProducts', 0)
            ->where('stats.lowStockProducts', 0)
            ->has('recentSales', 0));
    }

    public function test_unknown_modules_return_not_found(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get('/modules/unknown')->assertNotFound();
    }
}
