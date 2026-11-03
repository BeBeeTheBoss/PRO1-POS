<?php

namespace App\Domain\Catalog\Exceptions;

use RuntimeException;

class CloudProductLookupUnavailable extends RuntimeException
{
    public function __construct(?\Throwable $previous = null)
    {
        parent::__construct(
            'The cloud product catalog is currently unavailable.',
            previous: $previous,
        );
    }
}
