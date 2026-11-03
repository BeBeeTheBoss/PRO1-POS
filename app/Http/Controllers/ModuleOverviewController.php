<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ModuleOverviewController extends Controller
{
    /** @var array<string, array{title: string, description: string}> */
    private const MODULES = [
        'inventory' => ['title' => 'Inventory', 'description' => 'Branch stock, adjustments, transfers and movement history.'],
        'sales' => ['title' => 'Sales', 'description' => 'Invoices, returns, refunds and payment history.'],
        'purchases' => ['title' => 'Purchases', 'description' => 'Purchase orders, goods receiving and supplier balances.'],
        'reports' => ['title' => 'Reports', 'description' => 'Sales, profit, inventory valuation and cashier summaries.'],
    ];

    public function __invoke(Request $request, string $module): Response
    {
        abort_unless(array_key_exists($module, self::MODULES), 404);

        return Inertia::render('modules/overview', [
            'module' => $module,
            ...self::MODULES[$module],
        ]);
    }
}
