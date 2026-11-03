<?php

namespace App\Domain\Contacts\Exceptions;

use RuntimeException;

class CloudCustomerLookupUnavailable extends RuntimeException
{
    public function __construct(?\Throwable $previous = null)
    {
        parent::__construct(
            'The cloud customer directory is currently unavailable.',
            previous: $previous,
        );
    }
}
