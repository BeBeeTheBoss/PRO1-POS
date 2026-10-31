<?php

namespace App\Domain\Sales\Enums;

enum PaymentMethod: string
{
    case Cash = 'cash';
    case BankTransfer = 'bank_transfer';
    case MobileWallet = 'mobile_wallet';
    case Card = 'card';
    case Credit = 'credit';
}
