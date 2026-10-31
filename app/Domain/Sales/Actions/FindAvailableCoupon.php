<?php

namespace App\Domain\Sales\Actions;

use App\Models\Coupon;
use Illuminate\Database\Eloquent\Builder;

class FindAvailableCoupon
{
    public function __invoke(?string $barcode): ?Coupon
    {
        $barcode = trim((string) $barcode);

        if ($barcode === '') {
            return null;
        }

        return Coupon::query()
            ->where('barcode', $barcode)
            ->where('is_active', true)
            ->where(function (Builder $query): void {
                $query->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function (Builder $query): void {
                $query->whereNull('expires_at')->orWhere('expires_at', '>=', now());
            })
            ->first();
    }
}
