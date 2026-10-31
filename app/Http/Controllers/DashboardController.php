<?php

namespace App\Http\Controllers;

use App\Domain\Sales\Enums\SaleStatus;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $todaySales = Sale::query()
            ->where('status', SaleStatus::Completed)
            ->whereDate('sold_at', today());

        return Inertia::render('dashboard', [
            'stats' => [
                'todayRevenue' => (float) (clone $todaySales)->sum('grand_total'),
                'todayTransactions' => (clone $todaySales)->count(),
                'activeProducts' => Product::query()->where('status', 'active')->count(),
                'lowStockProducts' => Inventory::query()
                    ->join('products', 'products.id', '=', 'inventories.product_id')
                    ->where('products.status', 'active')
                    ->whereNull('products.deleted_at')
                    ->whereColumn('inventories.quantity', '<=', 'products.reorder_level')
                    ->count(),
            ],
            'recentSales' => Sale::query()
                ->with(['customer:id,name', 'cashier:id,name'])
                ->where('status', SaleStatus::Completed)
                ->latest('sold_at')
                ->limit(5)
                ->get(['id', 'customer_id', 'cashier_id', 'invoice_number', 'grand_total', 'sold_at']),
        ]);
    }
}
