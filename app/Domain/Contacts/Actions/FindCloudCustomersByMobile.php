<?php

namespace App\Domain\Contacts\Actions;

use App\Domain\Contacts\Exceptions\CloudCustomerLookupUnavailable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * @phpstan-type CloudCustomerData array{
 *     id: string,
 *     name: string,
 *     id_card: string|null,
 *     phone: string|null,
 *     is_cash_customer: bool,
 *     source: string,
 *     member_type: string,
 *     tax_id: string|null,
 *     nrc: string|null,
 *     member_card_no: string|null,
 *     customer_code: string|null,
 *     address: string|null,
 *     office_phone: string|null
 * }
 */
class FindCloudCustomersByMobile
{
    /** @return Collection<int, CloudCustomerData> */
    public function __invoke(?string $mobile): Collection
    {
        $mobile = trim((string) $mobile);

        if ($mobile === '') {
            return collect();
        }

        try {
            $rows = DB::connection('cloud')->select(<<<'SQL'
                SELECT
                    CASE WHEN customer_rank_id = '1013' THEN 'Member' ELSE 'Normal' END AS member_type,
                    tax_code AS tax_id,
                    nrc_array_id AS nrc,
                    identification_card AS member_card_no,
                    customer_barcode AS customer_code,
                    COALESCE(REGEXP_REPLACE(fullname, E'[\n\r]+', ' ', 'g'), '') AS customer_name,
                    COALESCE(REGEXP_REPLACE(full_address, E'[\n\r]+', ' ', 'g'), '') AS address,
                    mobile,
                    office_phone
                FROM gbh_customer
                WHERE mobile = ?
                ORDER BY customer_name
                LIMIT 10
                SQL,
                [$mobile],
            );
        } catch (QueryException $exception) {
            throw new CloudCustomerLookupUnavailable($exception);
        }

        return collect($rows)->map(function (object $row): array {
            $data = (array) $row;
            $customerCode = $this->nullableString($data, 'customer_code');
            $memberCardNo = $this->nullableString($data, 'member_card_no');
            $phone = $this->nullableString($data, 'mobile');
            $name = $this->nullableString($data, 'customer_name') ?? 'Unnamed customer';
            $identity = $customerCode ?? hash(
                'sha256',
                implode('|', [$memberCardNo, $phone, $name]),
            );

            return [
                'id' => "cloud:{$identity}",
                'name' => $name,
                'id_card' => $memberCardNo,
                'phone' => $phone,
                'is_cash_customer' => false,
                'source' => 'cloud',
                'member_type' => $this->nullableString($data, 'member_type') ?? 'Normal',
                'tax_id' => $this->nullableString($data, 'tax_id'),
                'nrc' => $this->nullableString($data, 'nrc'),
                'member_card_no' => $memberCardNo,
                'customer_code' => $customerCode,
                'address' => $this->nullableString($data, 'address'),
                'office_phone' => $this->nullableString($data, 'office_phone'),
            ];
        })->values();
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
