<?php

namespace App\Domain\Catalog\Actions;

use App\Domain\Catalog\Exceptions\CloudProductLookupUnavailable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * @phpstan-type CloudProductData array{
 *     id: string,
 *     name: string,
 *     sku: string,
 *     barcode: string,
 *     selling_price: string,
 *     normal_price: string,
 *     member_price: string,
 *     price_tier: string,
 *     available_quantity: null,
 *     unit_name: string,
 *     unit_short_name: string,
 *     decimal_places: int,
 *     source: string
 * }
 */
class FindCloudProductByBarcode
{
    /** @return CloudProductData|null */
    public function __invoke(?string $barcode, string $customerType = 'Normal'): ?array
    {
        $barcode = trim((string) $barcode);

        if ($barcode === '') {
            return null;
        }

        try {
            $rows = DB::connection('cloud')->select(<<<'SQL'
                SELECT
                    barcode_code AS barcode,
                    barcode_bill_name AS product_name,
                    unit_code AS unit,
                    product_price1::numeric(19,2) AS normal_price,
                    product_price2::numeric(19,2) AS member_price
                FROM temp_master_product
                WHERE barcode_code = ?
                LIMIT 1
                SQL,
                [$barcode],
            );
        } catch (QueryException $exception) {
            throw new CloudProductLookupUnavailable($exception);
        }

        $row = $rows[0] ?? null;

        if (! is_object($row)) {
            return null;
        }

        $data = (array) $row;
        $normalPrice = $this->decimalString($data, 'normal_price');
        $memberPrice = $this->decimalString($data, 'member_price');
        $isMember = $customerType === 'Member';
        $unit = $this->nullableString($data, 'unit') ?? 'unit';

        return [
            'id' => "cloud-product:{$barcode}",
            'name' => $this->nullableString($data, 'product_name') ?? $barcode,
            'sku' => $barcode,
            'barcode' => $this->nullableString($data, 'barcode') ?? $barcode,
            'selling_price' => $isMember ? $memberPrice : $normalPrice,
            'normal_price' => $normalPrice,
            'member_price' => $memberPrice,
            'price_tier' => $isMember ? 'Member' : 'Normal',
            'available_quantity' => null,
            'unit_name' => $unit,
            'unit_short_name' => $unit,
            'decimal_places' => 3,
            'source' => 'cloud',
        ];
    }

    /** @param array<string, mixed> $data */
    private function decimalString(array $data, string $key): string
    {
        return $this->nullableString($data, $key) ?? '0.00';
    }

    /** @param array<string, mixed> $data */
    private function nullableString(array $data, string $key): ?string
    {
        if (! isset($data[$key])) {
            return null;
        }

        $value = trim((string) $data[$key]);

        return $value === '' ? null : $value;
    }
}
