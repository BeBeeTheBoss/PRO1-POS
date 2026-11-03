import { Head, router } from '@inertiajs/react';
import { PackageSearch, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { CopyableValue } from '@/components/copyable-value';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Product = {
    id: string;
    name: string;
    sku: string;
    barcode: string;
    selling_price: string;
    normal_price: string;
    member_price: string;
    price_tier: string;
    available_quantity: null;
    unit_name: string;
    unit_short_name: string;
    decimal_places: number;
    source: 'cloud';
};

type Props = {
    products: Product[];
    lookupError: string | null;
    filters: { search: string };
};

const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MMK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

export default function ProductIndex({
    products,
    lookupError,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [searching, setSearching] = useState(false);
    const hasSearched = filters.search.trim() !== '';

    const searchProducts = (event: FormEvent) => {
        event.preventDefault();
        const value = search.trim();

        if (value.length === 0) {
            return;
        }

        router.get(
            '/products',
            { search: value },
            {
                only: ['products', 'lookupError', 'filters'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setSearching(true),
                onFinish: () => setSearching(false),
            },
        );
    };

    const clearSearch = () => {
        setSearch('');
        router.get(
            '/products',
            {},
            {
                only: ['products', 'lookupError', 'filters'],
                preserveState: true,
                replace: true,
            },
        );
    };

    return (
        <>
            <Head title="Products" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-sm font-semibold text-blue-600">
                            Product directory
                        </p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                            Products
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Find cloud products by name or barcode. Search
                            ignores letter case and spaces.
                        </p>
                    </div>
                    {hasSearched && !lookupError && (
                        <Badge className="w-fit bg-blue-50 px-3 py-1.5 text-blue-700 hover:bg-blue-50">
                            {products.length}{' '}
                            {products.length === 1 ? 'product' : 'products'}
                        </Badge>
                    )}
                </header>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <form
                        onSubmit={searchProducts}
                        className="flex flex-col gap-3 lg:flex-row lg:items-end"
                    >
                        <div className="flex-1">
                            <label
                                htmlFor="product-search"
                                className="text-sm font-semibold text-slate-900"
                            >
                                Product name or barcode
                            </label>
                            <p className="mt-1 text-xs text-slate-500">
                                Enter all or part of a product name, or
                                scan/type a barcode.
                            </p>
                            <div className="relative mt-3">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    id="product-search"
                                    type="search"
                                    autoComplete="off"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Enter product name or barcode"
                                    className="h-11 bg-slate-50 pl-9"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {hasSearched && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11"
                                    onClick={clearSearch}
                                >
                                    Clear
                                </Button>
                            )}
                            <Button
                                type="submit"
                                className="h-11 bg-blue-600 px-6 hover:bg-blue-700"
                                disabled={
                                    searching || search.trim().length === 0
                                }
                            >
                                <Search className="size-4" />
                                {searching ? 'Searching…' : 'Find product'}
                            </Button>
                        </div>
                    </form>
                </section>

                {lookupError && (
                    <div
                        role="alert"
                        className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700"
                    >
                        {lookupError}
                    </div>
                )}

                {!hasSearched && !lookupError && (
                    <EmptyState
                        title="Search the product directory"
                        description="Enter a product name or barcode above to view product details."
                    />
                )}

                {hasSearched &&
                    !lookupError &&
                    !searching &&
                    products.length === 0 && (
                        <EmptyState
                            title="No products found"
                            description={`No cloud product matches ${filters.search}. Check the name or barcode and try again.`}
                        />
                    )}

                {!lookupError && products.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-5 py-3">
                                            Product name
                                        </th>
                                        <th className="px-4 py-3">Barcode</th>
                                        <th className="px-4 py-3">Unit</th>
                                        <th className="px-4 py-3 text-right">
                                            Normal price
                                        </th>
                                        <th className="px-5 py-3 text-right">
                                            Member price
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {products.map((product) => (
                                        <tr
                                            key={product.id}
                                            className="align-top transition-colors hover:bg-slate-50"
                                        >
                                            <td className="max-w-lg px-5 py-4 font-semibold break-words text-slate-950">
                                                {product.name}
                                            </td>
                                            <td className="px-4 py-4 text-slate-700">
                                                <CopyableValue
                                                    label="barcode"
                                                    value={product.barcode}
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <Badge
                                                    variant="secondary"
                                                    className="font-semibold"
                                                >
                                                    {product.unit_short_name}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4 text-right font-semibold whitespace-nowrap text-slate-900">
                                                {money.format(
                                                    Number(
                                                        product.normal_price,
                                                    ),
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right font-semibold whitespace-nowrap text-blue-700">
                                                {money.format(
                                                    Number(
                                                        product.member_price,
                                                    ),
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function EmptyState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center shadow-sm">
            <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <PackageSearch className="size-6" />
            </span>
            <h2 className="font-bold text-slate-950">{title}</h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">
                {description}
            </p>
        </div>
    );
}

ProductIndex.layout = {
    breadcrumbs: [{ title: 'Products', href: '/products' }],
};
