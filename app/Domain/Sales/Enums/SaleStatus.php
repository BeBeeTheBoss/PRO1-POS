<?php

namespace App\Domain\Sales\Enums;

enum SaleStatus: string
{
    case Draft = 'draft';
    case Completed = 'completed';
    case Voided = 'voided';
    case Refunded = 'refunded';
}
