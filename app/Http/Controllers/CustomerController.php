<?php

namespace App\Http\Controllers;

use App\Domain\Contacts\Actions\SearchCloudCustomers;
use App\Domain\Contacts\Exceptions\CloudCustomerLookupUnavailable;
use App\Http\Requests\Customers\CustomerIndexRequest;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * @phpstan-import-type CloudCustomerData from SearchCloudCustomers
 */
class CustomerController extends Controller
{
    public function __construct(
        private readonly SearchCloudCustomers $searchCloudCustomers,
    ) {}

    public function __invoke(CustomerIndexRequest $request): Response
    {
        $search = $request->validated('search');
        $lookup = $this->lookup(is_string($search) ? $search : null);

        return Inertia::render('customers/index', [
            'customers' => $lookup['customers'],
            'lookupError' => $lookup['error'],
            'filters' => [
                'search' => is_string($search) ? $search : '',
            ],
        ]);
    }

    /** @return array{customers: Collection<int, CloudCustomerData>, error: string|null} */
    private function lookup(?string $search): array
    {
        try {
            return [
                'customers' => ($this->searchCloudCustomers)($search),
                'error' => null,
            ];
        } catch (CloudCustomerLookupUnavailable $exception) {
            report($exception->getPrevious() ?? $exception);

            return [
                'customers' => collect(),
                'error' => 'The customer directory is unavailable. Please try again.',
            ];
        }
    }
}
