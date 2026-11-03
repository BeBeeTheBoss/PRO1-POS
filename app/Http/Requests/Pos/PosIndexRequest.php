<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class PosIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'customer_search' => ['nullable', 'string', 'min:5', 'max:30'],
            'product_search' => ['nullable', 'string', 'max:100'],
            'barcode' => ['nullable', 'string', 'max:80'],
            'customer_type' => ['nullable', 'string', 'in:Normal,Member'],
            'coupon_barcode' => ['nullable', 'string', 'max:80'],
        ];
    }
}
