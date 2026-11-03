<?php

namespace App\Domain\Catalog\Actions;

use App\Domain\Catalog\Exceptions\CloudProductLookupUnavailable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * @phpstan-import-type CloudProductData from FindCloudProductByBarcode
 */
class SearchCloudProducts
{
    /** @return Collection<int, CloudProductData> */
    public function __invoke(?string $search, string $customerType = 'Normal'): Collection
    {
        $search = trim((string) $search);

        if ($search === '') {
            return collect();
        }

        $normalizedSearch = mb_strtolower(preg_replace('/\s+/u', '', $search) ?? '');
        $likeSearch = "%{$normalizedSearch}%";

        try {
            $rows = DB::connection('cloud')->select(<<<'SQL'
                SELECT
                    barcode_code AS barcode,
                    barcode_bill_name AS product_name,
                    unit_code AS unit,
                    product_price1::numeric(19,2) AS normal_price,
                    product_price2::numeric(19,2) AS member_price
                FROM temp_master_product
                WHERE
                    LOWER(REGEXP_REPLACE(COALESCE(barcode_code, ''), '\s+', '', 'g')) LIKE ?
                    OR LOWER(REGEXP_REPLACE(COALESCE(barcode_bill_name, ''), '\s+', '', 'g')) LIKE ?
                ORDER BY
                    CASE WHEN barcode_code = ? THEN 0 ELSE 1 END,
                    barcode_bill_name,
                    barcode_code
                LIMIT 24
                SQL,
                [$likeSearch, $likeSearch, $search],
            );
        } catch (QueryException $exception) {
            throw new CloudProductLookupUnavailable($exception);
        }

        return collect($rows)
            ->filter(fn (mixed $row): bool => is_object($row))
            ->map(fn (object $row): array => $this->productData($row, $customerType))
            ->values();
    }

    /** @return CloudProductData */
    private function productData(object $row, string $customerType): array
    {
        $data = (array) $row;
        $barcode = $this->nullableString($data, 'barcode') ?? '';
        $normalPrice = $this->decimalString($data, 'normal_price');
        $memberPrice = $this->decimalString($data, 'member_price');
        $isMember = $customerType === 'Member';
        $unit = $this->nullableString($data, 'unit') ?? 'unit';

        return [
            'id' => "cloud-product:{$barcode}",
            'name' => $this->nullableString($data, 'product_name') ?? $barcode,
            'sku' => $barcode,
            'barcode' => $barcode,
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
