<?php

namespace App\Http\Controllers;

use App\Domain\Catalog\Actions\FindCloudProductByBarcode;
use App\Domain\Catalog\Actions\SearchCloudProducts;
use App\Domain\Catalog\Exceptions\CloudProductLookupUnavailable;
use App\Http\Requests\Products\ProductIndexRequest;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * @phpstan-import-type CloudProductData from FindCloudProductByBarcode
 */
class ProductController extends Controller
{
    public function __construct(
        private readonly SearchCloudProducts $searchCloudProducts,
    ) {}

    public function __invoke(ProductIndexRequest $request): Response
    {
        $search = $request->validated('search');
        $lookup = $this->lookup(is_string($search) ? $search : null);

        return Inertia::render('products/index', [
            'products' => $lookup['products'],
            'lookupError' => $lookup['error'],
            'filters' => [
                'search' => is_string($search) ? $search : '',
            ],
        ]);
    }

    /** @return array{products: Collection<int, CloudProductData>, error: string|null} */
    private function lookup(?string $search): array
    {
        try {
            return [
                'products' => ($this->searchCloudProducts)($search, 'Normal'),
                'error' => null,
            ];
        } catch (CloudProductLookupUnavailable $exception) {
            report($exception->getPrevious() ?? $exception);

            return [
                'products' => collect(),
                'error' => 'The product catalog is unavailable. Please try again.',
            ];
        }
    }
}
