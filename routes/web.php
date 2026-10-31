<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ModuleOverviewController;
use App\Http\Controllers\PosController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('pos', PosController::class)->name('pos.index');
    Route::get('modules/{module}', ModuleOverviewController::class)->name('modules.show');
});

require __DIR__.'/settings.php';
