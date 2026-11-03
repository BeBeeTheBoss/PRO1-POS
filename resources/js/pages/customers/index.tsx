import { Head, router } from '@inertiajs/react';
import { Search, UsersRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { CopyableValue } from '@/components/copyable-value';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Customer = {
    id: string;
    name: string;
    id_card: string | null;
    phone: string | null;
    is_cash_customer: false;
    source: 'cloud';
    member_type: string;
    tax_id: string | null;
    nrc: string | null;
    member_card_no: string | null;
    customer_code: string | null;
    address: string | null;
    office_phone: string | null;
};

type Props = {
    customers: Customer[];
    lookupError: string | null;
    filters: { search: string };
};

export default function CustomerIndex({
    customers,
    lookupError,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [searching, setSearching] = useState(false);
    const hasSearched = filters.search.trim() !== '';

    const searchCustomers = (event: FormEvent) => {
        event.preventDefault();
        const value = search.trim();

        if (value.length < 1) {
            return;
        }

        router.get(
            '/customers',
            { search: value },
            {
                only: ['customers', 'lookupError', 'filters'],
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
            '/customers',
            {},
            {
                only: ['customers', 'lookupError', 'filters'],
                preserveState: true,
                replace: true,
            },
        );
    };

    return (
        <>
            <Head title="Customers" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-sm font-semibold text-blue-600">
                            Customer directory
                        </p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                            Customers
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Find registered customers by an exact customer code,
                            mobile number or ID card.
                        </p>
                    </div>
                    {hasSearched && !lookupError && (
                        <Badge className="w-fit bg-blue-50 px-3 py-1.5 text-blue-700 hover:bg-blue-50">
                            {customers.length}{' '}
                            {customers.length === 1 ? 'customer' : 'customers'}
                        </Badge>
                    )}
                </header>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <form
                        onSubmit={searchCustomers}
                        className="flex flex-col gap-3 lg:flex-row lg:items-end"
                    >
                        <div className="flex-1">
                            <label
                                htmlFor="customer-search"
                                className="text-sm font-semibold text-slate-900"
                            >
                                Customer code, mobile number or ID card
                            </label>
                            <p className="mt-1 text-xs text-slate-500">
                                Enter the exact customer code, mobile number or
                                ID card registered in the cloud customer
                                directory.
                            </p>
                            <div className="relative mt-3">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    id="customer-search"
                                    type="search"
                                    autoComplete="off"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Enter customer code, mobile number or ID card"
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
                                disabled={searching || search.trim().length < 1}
                            >
                                <Search className="size-4" />
                                {searching ? 'Searching…' : 'Find customer'}
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
                        icon={Search}
                        title="Search the customer directory"
                        description="Enter an exact customer code, mobile number or ID card above to view customer details."
                    />
                )}

                {hasSearched &&
                    !lookupError &&
                    !searching &&
                    customers.length === 0 && (
                        <EmptyState
                            icon={UsersRound}
                            title="No customers found"
                            description={`No registered customer matches ${filters.search}. Check the customer code, mobile number or ID card and try again.`}
                        />
                    )}

                {!lookupError && customers.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1320px] text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-5 py-3">Name</th>
                                        <th className="px-4 py-3">
                                            Customer code
                                        </th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Mobile</th>
                                        <th className="px-4 py-3">ID card</th>
                                        <th className="px-4 py-3">NRC</th>
                                        <th className="px-4 py-3">Tax ID</th>
                                        <th className="px-4 py-3">
                                            Office phone
                                        </th>
                                        <th className="px-5 py-3">Address</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {customers.map((customer) => (
                                        <tr
                                            key={customer.id}
                                            className="align-top transition-colors hover:bg-slate-50"
                                        >
                                            <td className="max-w-64 px-5 py-4 font-semibold break-words text-slate-950">
                                                {customer.name}
                                            </td>
                                            <td className="px-4 py-4 text-slate-700">
                                                <CopyableValue
                                                    label="customer code"
                                                    value={
                                                        customer.customer_code
                                                    }
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <Badge
                                                    className={
                                                        customer.member_type ===
                                                        'Member'
                                                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-50'
                                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                                                    }
                                                >
                                                    {customer.member_type}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4 text-slate-700">
                                                <CopyableValue
                                                    label="mobile number"
                                                    value={customer.phone}
                                                />
                                            </td>
                                            <td className="px-4 py-4 text-slate-700">
                                                <CopyableValue
                                                    label="ID card"
                                                    value={
                                                        customer.member_card_no
                                                    }
                                                />
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-slate-700">
                                                {customer.nrc ?? '—'}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-slate-700">
                                                {customer.tax_id ?? '—'}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-slate-700">
                                                {customer.office_phone ?? '—'}
                                            </td>
                                            <td className="max-w-80 px-5 py-4 break-words text-slate-700">
                                                {customer.address ?? '—'}
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
    icon: Icon,
    title,
    description,
}: {
    icon: typeof Search;
    title: string;
    description: string;
}) {
    return (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center shadow-sm">
            <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Icon className="size-6" />
            </span>
            <h2 className="font-bold text-slate-950">{title}</h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">
                {description}
            </p>
        </div>
    );
}

CustomerIndex.layout = {
    breadcrumbs: [{ title: 'Customers', href: '/customers' }],
};
