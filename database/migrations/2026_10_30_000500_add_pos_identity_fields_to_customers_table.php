<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('id_card', 80)->nullable()->unique()->after('name');
            $table->boolean('is_cash_customer')->default(false)->after('credit_limit');
        });

        $existingCashCustomerId = DB::table('customers')
            ->where('name', 'Cash Customer')
            ->whereNull('deleted_at')
            ->value('id');

        if ($existingCashCustomerId) {
            DB::table('customers')
                ->where('id', $existingCashCustomerId)
                ->update([
                    'id_card' => 'CASH',
                    'is_cash_customer' => true,
                    'updated_at' => now(),
                ]);
        } else {
            DB::table('customers')->insert([
                'name' => 'Cash Customer',
                'id_card' => 'CASH',
                'credit_limit' => 0,
                'is_cash_customer' => true,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique(['id_card']);
            $table->dropColumn(['id_card', 'is_cash_customer']);
        });
    }
};
