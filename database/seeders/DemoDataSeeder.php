<?php

namespace Database\Seeders;

use App\Domain\Inventory\Enums\StockMovementType;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoDataSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        DB::transaction(function (): void {
            $branch = Branch::query()->firstOrCreate(
                ['code' => 'MAIN'],
                [
                    'name' => 'Main Branch',
                    'phone' => '09-000-000-000',
                    'address' => 'Yangon',
                    'is_active' => true,
                ],
            );

            $unitIds = $this->seedUnits();
            $categoryIds = $this->seedCategories();
            $this->seedCustomers();
            $this->seedCoupons();
            $this->seedProducts($branch, $unitIds, $categoryIds);
        });
    }

    /** @return array<string, int> */
    private function seedUnits(): array
    {
        /** @var array<int, array{name: string, short_name: string, decimal_places: int}> $definitions */
        $definitions = [
            ['name' => 'Piece', 'short_name' => 'pcs', 'decimal_places' => 0],
            ['name' => 'Foot', 'short_name' => 'ft', 'decimal_places' => 2],
            ['name' => 'Meter', 'short_name' => 'm', 'decimal_places' => 2],
            ['name' => 'Bag', 'short_name' => 'bag', 'decimal_places' => 0],
            ['name' => 'Kilogram', 'short_name' => 'kg', 'decimal_places' => 3],
            ['name' => 'Roll', 'short_name' => 'roll', 'decimal_places' => 0],
            ['name' => 'Box', 'short_name' => 'box', 'decimal_places' => 0],
            ['name' => 'Square Meter', 'short_name' => 'sqm', 'decimal_places' => 2],
        ];

        $ids = [];

        foreach ($definitions as $definition) {
            $unit = Unit::query()->updateOrCreate(
                ['short_name' => $definition['short_name']],
                [
                    'name' => $definition['name'],
                    'decimal_places' => $definition['decimal_places'],
                ],
            );
            $ids[$definition['short_name']] = $unit->id;
        }

        return $ids;
    }

    /** @return array<string, int> */
    private function seedCategories(): array
    {
        /** @var array<string, string> $definitions */
        $definitions = [
            'hardware' => 'Hardware & Tools',
            'electrical' => 'Electrical',
            'plumbing' => 'Plumbing',
            'building-materials' => 'Building Materials',
            'paint' => 'Paint & Accessories',
            'household' => 'Household Goods',
        ];

        $ids = [];

        foreach ($definitions as $slug => $name) {
            $category = Category::query()->updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'is_active' => true],
            );
            $ids[$slug] = $category->id;
        }

        return $ids;
    }

    private function seedCustomers(): void
    {
        Customer::query()->updateOrCreate(
            ['is_cash_customer' => true],
            [
                'name' => 'Cash Customer',
                'id_card' => 'CASH',
                'is_active' => true,
            ],
        );

        /** @var array<int, array{name: string, id_card: string, phone: string, address: string, credit_limit: string}> $customers */
        $customers = [
            ['name' => 'Aung Min Khant', 'id_card' => '12/OUKAMA(N)123456', 'phone' => '09-421-123-456', 'address' => 'North Okkalapa, Yangon', 'credit_limit' => '500000.00'],
            ['name' => 'Su Su Hlaing', 'id_card' => '9/MAYANA(N)654321', 'phone' => '09-780-654-321', 'address' => 'Chanmyathazi, Mandalay', 'credit_limit' => '300000.00'],
            ['name' => 'Ko Zaw Lin', 'id_card' => '12/THAKATA(N)246810', 'phone' => '09-450-246-810', 'address' => 'Thaketa, Yangon', 'credit_limit' => '250000.00'],
            ['name' => 'May Thazin Oo', 'id_card' => '7/PAMANA(N)135791', 'phone' => '09-795-135-791', 'address' => 'Bago', 'credit_limit' => '200000.00'],
            ['name' => 'Nay Lin Tun', 'id_card' => '10/MALAMA(N)112233', 'phone' => '09-402-112-233', 'address' => 'Mawlamyine, Mon', 'credit_limit' => '400000.00'],
            ['name' => 'Ei Ei Mon', 'id_card' => '5/SAKANA(N)445566', 'phone' => '09-777-445-566', 'address' => 'Sagaing', 'credit_limit' => '150000.00'],
            ['name' => 'Htet Aung', 'id_card' => '13/TAKANA(N)778899', 'phone' => '09-969-778-899', 'address' => 'Taunggyi, Shan', 'credit_limit' => '350000.00'],
            ['name' => 'Thandar Win', 'id_card' => '14/PATHANA(N)998877', 'phone' => '09-254-998-877', 'address' => 'Pathein, Ayeyarwady', 'credit_limit' => '100000.00'],
        ];

        foreach ($customers as $customer) {
            Customer::query()->updateOrCreate(
                ['id_card' => $customer['id_card']],
                [
                    'name' => $customer['name'],
                    'phone' => $customer['phone'],
                    'address' => $customer['address'],
                    'credit_limit' => $customer['credit_limit'],
                    'is_cash_customer' => false,
                    'is_active' => true,
                ],
            );
        }
    }

    private function seedCoupons(): void
    {
        /** @var array<int, array{name: string, code: string, barcode: string, amount: string}> $coupons */
        $coupons = [
            ['name' => 'Welcome Coupon', 'code' => 'WELCOME-5000', 'barcode' => 'CPN-WELCOME-5000', 'amount' => '5000.00'],
            ['name' => 'Home Center Reward', 'code' => 'HOME-10000', 'barcode' => 'CPN-HOME-10000', 'amount' => '10000.00'],
            ['name' => 'PRO1 Special', 'code' => 'PRO1-25000', 'barcode' => 'CPN-PRO1-25000', 'amount' => '25000.00'],
        ];

        foreach ($coupons as $coupon) {
            Coupon::query()->updateOrCreate(
                ['barcode' => $coupon['barcode']],
                [...$coupon, 'is_active' => true],
            );
        }
    }

    /**
     * @param  array<string, int>  $unitIds
     * @param  array<string, int>  $categoryIds
     */
    private function seedProducts(Branch $branch, array $unitIds, array $categoryIds): void
    {
        /** @var array<int, array{name: string, sku: string, barcode: string, category: string, unit: string, cost_price: string, selling_price: string, reorder_level: string, stock: string}> $products */
        $products = [
            ['name' => 'Claw Hammer 16 oz', 'sku' => 'HW-HAM-001', 'barcode' => '100000000001', 'category' => 'hardware', 'unit' => 'pcs', 'cost_price' => '12000.00', 'selling_price' => '15000.00', 'reorder_level' => '5.000', 'stock' => '24.000'],
            ['name' => 'Measuring Tape 5m', 'sku' => 'HW-TAP-005', 'barcode' => '100000000002', 'category' => 'hardware', 'unit' => 'pcs', 'cost_price' => '6000.00', 'selling_price' => '8000.00', 'reorder_level' => '5.000', 'stock' => '22.000'],
            ['name' => 'Door Lock Set Stainless Steel', 'sku' => 'HW-LOC-010', 'barcode' => '100000000003', 'category' => 'hardware', 'unit' => 'pcs', 'cost_price' => '28000.00', 'selling_price' => '35000.00', 'reorder_level' => '3.000', 'stock' => '8.000'],
            ['name' => 'Steel Nail 2 inch', 'sku' => 'HW-NAI-002', 'barcode' => '100000000004', 'category' => 'hardware', 'unit' => 'kg', 'cost_price' => '4200.00', 'selling_price' => '5500.00', 'reorder_level' => '10.000', 'stock' => '50.500'],
            ['name' => 'Wood Screw 1.5 inch (100 pcs)', 'sku' => 'HW-SCR-150', 'barcode' => '100000000005', 'category' => 'hardware', 'unit' => 'box', 'cost_price' => '6500.00', 'selling_price' => '8500.00', 'reorder_level' => '5.000', 'stock' => '25.000'],
            ['name' => 'LED Bulb 12W Daylight', 'sku' => 'EL-LED-012', 'barcode' => '100000000006', 'category' => 'electrical', 'unit' => 'pcs', 'cost_price' => '2500.00', 'selling_price' => '3500.00', 'reorder_level' => '10.000', 'stock' => '48.000'],
            ['name' => 'Copper Wire 2.5mm 100m', 'sku' => 'EL-WIR-250', 'barcode' => '100000000007', 'category' => 'electrical', 'unit' => 'roll', 'cost_price' => '85000.00', 'selling_price' => '98000.00', 'reorder_level' => '4.000', 'stock' => '18.000'],
            ['name' => 'One Gang Wall Switch', 'sku' => 'EL-SWI-001', 'barcode' => '100000000008', 'category' => 'electrical', 'unit' => 'pcs', 'cost_price' => '3200.00', 'selling_price' => '4500.00', 'reorder_level' => '10.000', 'stock' => '60.000'],
            ['name' => 'PVC Pipe 1 inch (10 ft)', 'sku' => 'PL-PIP-100', 'barcode' => '100000000009', 'category' => 'plumbing', 'unit' => 'pcs', 'cost_price' => '6500.00', 'selling_price' => '8000.00', 'reorder_level' => '8.000', 'stock' => '35.000'],
            ['name' => 'PVC Elbow 1 inch', 'sku' => 'PL-ELB-100', 'barcode' => '100000000010', 'category' => 'plumbing', 'unit' => 'pcs', 'cost_price' => '650.00', 'selling_price' => '900.00', 'reorder_level' => '20.000', 'stock' => '100.000'],
            ['name' => 'PTFE Thread Seal Tape', 'sku' => 'PL-TAP-001', 'barcode' => '100000000011', 'category' => 'plumbing', 'unit' => 'roll', 'cost_price' => '450.00', 'selling_price' => '700.00', 'reorder_level' => '15.000', 'stock' => '75.000'],
            ['name' => 'Portland Cement 50kg', 'sku' => 'BM-CEM-050', 'barcode' => '100000000012', 'category' => 'building-materials', 'unit' => 'bag', 'cost_price' => '13500.00', 'selling_price' => '15000.00', 'reorder_level' => '20.000', 'stock' => '80.000'],
            ['name' => 'Deformed Steel Bar 12mm', 'sku' => 'BM-REB-012', 'barcode' => '100000000013', 'category' => 'building-materials', 'unit' => 'ft', 'cost_price' => '1750.00', 'selling_price' => '2100.00', 'reorder_level' => '100.000', 'stock' => '600.000'],
            ['name' => 'Ceramic Wall Tile White', 'sku' => 'BM-TIL-001', 'barcode' => '100000000014', 'category' => 'building-materials', 'unit' => 'sqm', 'cost_price' => '18000.00', 'selling_price' => '22000.00', 'reorder_level' => '20.000', 'stock' => '120.500'],
            ['name' => 'Interior Wall Paint White 5L', 'sku' => 'PA-WHT-005', 'barcode' => '100000000015', 'category' => 'paint', 'unit' => 'pcs', 'cost_price' => '38000.00', 'selling_price' => '45000.00', 'reorder_level' => '4.000', 'stock' => '12.000'],
            ['name' => 'Paint Roller 9 inch', 'sku' => 'PA-ROL-009', 'barcode' => '100000000016', 'category' => 'paint', 'unit' => 'pcs', 'cost_price' => '4500.00', 'selling_price' => '6500.00', 'reorder_level' => '6.000', 'stock' => '30.000'],
            ['name' => 'Plastic Bucket 20L', 'sku' => 'HH-BUC-020', 'barcode' => '100000000017', 'category' => 'household', 'unit' => 'pcs', 'cost_price' => '7500.00', 'selling_price' => '9500.00', 'reorder_level' => '5.000', 'stock' => '15.000'],
            ['name' => 'Floor Cleaner Lemon 1L', 'sku' => 'HH-CLN-001', 'barcode' => '100000000018', 'category' => 'household', 'unit' => 'pcs', 'cost_price' => '3200.00', 'selling_price' => '4500.00', 'reorder_level' => '10.000', 'stock' => '40.000'],
        ];

        $userId = User::query()->where('email', 'admin@example.com')->value('id');

        foreach ($products as $data) {
            $product = Product::query()->updateOrCreate(
                ['sku' => $data['sku']],
                [
                    'category_id' => $categoryIds[$data['category']],
                    'unit_id' => $unitIds[$data['unit']],
                    'name' => $data['name'],
                    'barcode' => $data['barcode'],
                    'cost_price' => $data['cost_price'],
                    'selling_price' => $data['selling_price'],
                    'reorder_level' => $data['reorder_level'],
                    'status' => 'active',
                ],
            );

            $inventory = Inventory::query()->firstOrCreate(
                ['branch_id' => $branch->id, 'product_id' => $product->id],
                ['quantity' => $data['stock']],
            );

            StockMovement::query()->firstOrCreate(
                [
                    'branch_id' => $branch->id,
                    'product_id' => $product->id,
                    'type' => StockMovementType::Opening,
                    'note' => 'Demo opening stock',
                ],
                [
                    'user_id' => $userId,
                    'quantity' => $inventory->quantity,
                    'balance_after' => $inventory->quantity,
                ],
            );
        }
    }
}
