import { Head, router } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    Barcode,
    Check,
    CircleCheck,
    CreditCard,
    Minus,
    PackageSearch,
    Plus,
    ScanBarcode,
    Search,
    ShoppingCart,
    TicketPercent,
    Trash2,
    UserRound,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    calculateCouponDiscount,
    normalizeQuantity,
    stepQuantity,
} from '@/features/pos/cart';

type Customer = {
    id: number;
    name: string;
    id_card: string | null;
    phone: string | null;
    is_cash_customer: boolean;
};

type Product = {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    selling_price: string;
    available_quantity: string;
    unit_name: string;
    unit_short_name: string;
    decimal_places: number;
};

type CartLine = Product & { quantity: number };

type Coupon = {
    id: number;
    name: string;
    code: string;
    barcode: string;
    amount: string;
};

type Props = {
    branch: { id: number; name: string; code: string };
    cashCustomer: Customer;
    customerResults: Customer[];
    productResults: Product[];
    barcodeProduct: Product | null;
    couponResult: Coupon | null;
    filters: { customerSearch: string; productSearch: string };
};

const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MMK',
    maximumFractionDigits: 0,
});

export default function PosIndex({
    branch,
    cashCustomer,
    customerResults,
    productResults,
    filters,
}: Props) {
    const [selectedCustomer, setSelectedCustomer] =
        useState<Customer>(cashCustomer);
    const [customerConfirmed, setCustomerConfirmed] = useState(false);
    const [customerSearch, setCustomerSearch] = useState(
        filters.customerSearch,
    );
    const [productSearch, setProductSearch] = useState(filters.productSearch);
    const [barcode, setBarcode] = useState('');
    const [scanMessage, setScanMessage] = useState('');
    const [cart, setCart] = useState<CartLine[]>([]);
    const [couponDialogOpen, setCouponDialogOpen] = useState(false);
    const [couponBarcode, setCouponBarcode] = useState('');
    const [couponCandidate, setCouponCandidate] = useState<Coupon | null>(null);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const [couponLookupMessage, setCouponLookupMessage] = useState('');
    const barcodeInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (customerConfirmed) {
            barcodeInput.current?.focus();
        }
    }, [customerConfirmed]);

    const addToCart = (product: Product) => {
        const available = Number(product.available_quantity);

        if (available <= 0) {
            setScanMessage(`${product.name} is out of stock.`);
            return;
        }

        setCart((current) => {
            const existing = current.find((line) => line.id === product.id);

            if (!existing) {
                return [...current, { ...product, quantity: 1 }];
            }

            return current.map((line) =>
                line.id === product.id
                    ? {
                          ...line,
                          quantity: Math.min(line.quantity + 1, available),
                      }
                    : line,
            );
        });
        setScanMessage(`${product.name} added to cart.`);
    };

    const searchCustomers = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/pos',
            { customer_search: customerSearch.trim() },
            {
                only: ['customerResults'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const searchProducts = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/pos',
            { product_search: productSearch.trim() },
            {
                only: ['productResults'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const scanBarcode = (event: FormEvent) => {
        event.preventDefault();
        const scanned = barcode.trim();

        if (scanned === '') {
            return;
        }

        setScanMessage('Looking up barcode…');
        router.get(
            '/pos',
            { barcode: scanned },
            {
                only: ['barcodeProduct'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onSuccess: (page) => {
                    const product = page.props.barcodeProduct as Product | null;

                    if (product) {
                        addToCart(product);
                    } else {
                        setScanMessage(`No product found for ${scanned}.`);
                    }

                    setBarcode('');
                    requestAnimationFrame(() => barcodeInput.current?.focus());
                },
            },
        );
    };

    const lookupCoupon = (event: FormEvent) => {
        event.preventDefault();
        const scanned = couponBarcode.trim();

        if (scanned === '') {
            return;
        }

        setCouponCandidate(null);
        setCouponLookupMessage('Checking coupon…');
        router.get(
            '/pos',
            { coupon_barcode: scanned },
            {
                only: ['couponResult'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onSuccess: (page) => {
                    const coupon = page.props.couponResult as Coupon | null;

                    setCouponCandidate(coupon);
                    setCouponLookupMessage(
                        coupon
                            ? 'Coupon found. Confirm to apply it to this sale.'
                            : 'Coupon was not found, is inactive, or has expired.',
                    );
                },
            },
        );
    };

    const openCouponDialog = () => {
        setCouponBarcode('');
        setCouponCandidate(null);
        setCouponLookupMessage('');
        setCouponDialogOpen(true);
    };

    const setQuantity = (productId: number, requested: number) => {
        setCart((current) =>
            current
                .map((line) => {
                    if (line.id !== productId) {
                        return line;
                    }

                    const available = Number(line.available_quantity);
                    const quantity = normalizeQuantity(
                        requested,
                        available,
                        line.decimal_places,
                    );

                    return { ...line, quantity };
                })
                .filter((line) => line.quantity > 0),
        );
    };

    const totals = useMemo(() => {
        const subtotal = cart.reduce(
            (total, line) => total + Number(line.selling_price) * line.quantity,
            0,
        );
        const discount = calculateCouponDiscount(
            subtotal,
            Number(selectedCoupon?.amount ?? 0),
        );

        return {
            lineCount: cart.length,
            quantity: cart.reduce((total, line) => total + line.quantity, 0),
            subtotal,
            discount,
            tax: 0,
            grandTotal: subtotal - discount,
        };
    }, [cart, selectedCoupon]);

    if (!customerConfirmed) {
        return (
            <>
                <Head title="Point of Sale · Select customer" />
                <CustomerStep
                    cashCustomer={cashCustomer}
                    customerResults={customerResults}
                    customerSearch={customerSearch}
                    selectedCustomer={selectedCustomer}
                    onSearchChange={setCustomerSearch}
                    onSearch={searchCustomers}
                    onSelect={setSelectedCustomer}
                    onContinue={() => setCustomerConfirmed(true)}
                />
            </>
        );
    }

    return (
        <>
            <Head title="Point of Sale" />
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:p-6">
                <header className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold">Point of Sale</h1>
                            <Badge variant="secondary">{branch.code}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {branch.name} · Scan or search products
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCustomerConfirmed(false)}
                        className="flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted"
                    >
                        <span className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            <UserRound className="size-4" />
                        </span>
                        <span>
                            <span className="block text-xs text-muted-foreground">
                                Customer · Change
                            </span>
                            <span className="block text-sm font-semibold">
                                {selectedCustomer.name}
                            </span>
                        </span>
                    </button>
                </header>

                <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
                    <section className="flex min-w-0 flex-col gap-4">
                        <Card>
                            <CardContent className="grid gap-3 p-4 md:grid-cols-2">
                                <form
                                    onSubmit={scanBarcode}
                                    className="space-y-2"
                                >
                                    <label
                                        htmlFor="barcode"
                                        className="flex items-center gap-2 text-sm font-semibold"
                                    >
                                        <Barcode className="size-4 text-blue-600" />
                                        Barcode scanner
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            ref={barcodeInput}
                                            id="barcode"
                                            value={barcode}
                                            onChange={(event) =>
                                                setBarcode(event.target.value)
                                            }
                                            placeholder="Scan barcode and press Enter"
                                            autoComplete="off"
                                        />
                                        <Button type="submit" size="icon">
                                            <Plus className="size-4" />
                                        </Button>
                                    </div>
                                    <p
                                        className="min-h-5 text-xs text-muted-foreground"
                                        aria-live="polite"
                                    >
                                        {scanMessage ||
                                            'Scanner input stays ready after every scan.'}
                                    </p>
                                </form>

                                <form
                                    onSubmit={searchProducts}
                                    className="space-y-2"
                                >
                                    <label
                                        htmlFor="product-search"
                                        className="flex items-center gap-2 text-sm font-semibold"
                                    >
                                        <Search className="size-4 text-blue-600" />
                                        Manual product search
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="product-search"
                                            value={productSearch}
                                            onChange={(event) =>
                                                setProductSearch(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Name, SKU or barcode"
                                        />
                                        <Button type="submit" variant="outline">
                                            Search
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Showing up to 24 matching products.
                                    </p>
                                </form>
                            </CardContent>
                        </Card>

                        {productResults.length > 0 && (
                            <div className="overflow-hidden rounded-xl border bg-card">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[720px] text-sm">
                                        <thead className="border-b bg-muted/60 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    Product
                                                </th>
                                                <th className="px-4 py-3">
                                                    SKU / Barcode
                                                </th>
                                                <th className="px-4 py-3">
                                                    Available
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Price
                                                </th>
                                                <th className="w-36 px-4 py-3 text-right">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {productResults.map((product) => {
                                                const available = Number(
                                                    product.available_quantity,
                                                );

                                                return (
                                                    <tr
                                                        key={product.id}
                                                        className="group transition-colors focus-within:bg-blue-50/70 hover:bg-blue-50/70 dark:focus-within:bg-blue-950/20 dark:hover:bg-blue-950/20"
                                                    >
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                                                    <PackageSearch className="size-4 text-muted-foreground transition-colors group-hover:text-blue-600" />
                                                                </span>
                                                                <span className="font-semibold">
                                                                    {
                                                                        product.name
                                                                    }
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="block font-medium">
                                                                {product.sku}
                                                            </span>
                                                            <span className="block text-xs text-muted-foreground">
                                                                {product.barcode ??
                                                                    'No barcode'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Badge
                                                                variant={
                                                                    available >
                                                                    0
                                                                        ? 'secondary'
                                                                        : 'destructive'
                                                                }
                                                            >
                                                                {available > 0
                                                                    ? `${formatQuantity(available, product.decimal_places)} ${product.unit_short_name}`
                                                                    : 'Out of stock'}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-blue-700 dark:text-blue-400">
                                                            {money.format(
                                                                Number(
                                                                    product.selling_price,
                                                                ),
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                disabled={
                                                                    available <=
                                                                    0
                                                                }
                                                                onClick={() =>
                                                                    addToCart(
                                                                        product,
                                                                    )
                                                                }
                                                                className="transition-all sm:pointer-events-none sm:translate-x-1 sm:opacity-0 sm:group-focus-within:pointer-events-auto sm:group-focus-within:translate-x-0 sm:group-focus-within:opacity-100 sm:group-hover:pointer-events-auto sm:group-hover:translate-x-0 sm:group-hover:opacity-100"
                                                            >
                                                                <ShoppingCart className="mr-1.5 size-3.5" />
                                                                Add to cart
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {productResults.length === 0 && (
                            <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed bg-card text-center">
                                <PackageSearch className="mb-3 size-9 text-muted-foreground" />
                                <p className="font-semibold">
                                    No products found
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Try another name, SKU or barcode.
                                </p>
                            </div>
                        )}
                    </section>

                    <CartSummary
                        cart={cart}
                        totals={totals}
                        customer={selectedCustomer}
                        coupon={selectedCoupon}
                        onQuantityChange={setQuantity}
                        onRemove={(productId) =>
                            setCart((current) =>
                                current.filter((line) => line.id !== productId),
                            )
                        }
                        onOpenCoupon={openCouponDialog}
                        onRemoveCoupon={() => setSelectedCoupon(null)}
                    />
                </div>
            </div>

            <CouponDialog
                open={couponDialogOpen}
                barcode={couponBarcode}
                candidate={couponCandidate}
                lookupMessage={couponLookupMessage}
                onOpenChange={setCouponDialogOpen}
                onBarcodeChange={setCouponBarcode}
                onLookup={lookupCoupon}
                onApply={() => {
                    if (couponCandidate) {
                        setSelectedCoupon(couponCandidate);
                        setCouponDialogOpen(false);
                    }
                }}
            />
        </>
    );
}

function CustomerStep({
    cashCustomer,
    customerResults,
    customerSearch,
    selectedCustomer,
    onSearchChange,
    onSearch,
    onSelect,
    onContinue,
}: {
    cashCustomer: Customer;
    customerResults: Customer[];
    customerSearch: string;
    selectedCustomer: Customer;
    onSearchChange: (value: string) => void;
    onSearch: (event: FormEvent) => void;
    onSelect: (customer: Customer) => void;
    onContinue: () => void;
}) {
    const selectedCustomerDescription = selectedCustomer.is_cash_customer
        ? 'Walk-in customer'
        : 'Registered customer';

    return (
        <div className="flex flex-1 items-center justify-center bg-muted/30 p-4 md:p-8">
            <div className="w-full max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-sm">
                <header className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-7">
                    <div className="flex items-center gap-4">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
                            <UserRound className="size-5" />
                        </span>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">
                                Who is this sale for?
                            </h1>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Use the walk-in customer or find a registered
                                customer by ID card.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-start rounded-full border bg-background px-3 py-1.5 text-xs font-semibold sm:self-auto">
                        <span className="size-2 rounded-full bg-blue-500" />
                        Customer
                        <span className="text-muted-foreground">1 of 2</span>
                    </div>
                </header>

                <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
                    <main className="space-y-6 p-5 md:p-7">
                        <section>
                            <div className="mb-3">
                                <h2 className="text-sm font-semibold">
                                    Quick sale
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Best for customers without an account.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onSelect(cashCustomer)}
                                aria-pressed={
                                    selectedCustomer.id === cashCustomer.id
                                }
                                className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${selectedCustomer.id === cashCustomer.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20 dark:bg-blue-950/30' : 'hover:border-blue-300 hover:bg-muted/60'}`}
                            >
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                                    <CreditCard className="size-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block font-semibold">
                                        {cashCustomer.name}
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        No account or customer details required
                                    </span>
                                </span>
                                {selectedCustomer.id === cashCustomer.id && (
                                    <span className="flex size-6 items-center justify-center rounded-full bg-blue-600 text-white">
                                        <Check className="size-3.5" />
                                    </span>
                                )}
                            </button>
                        </section>

                        <section>
                            <div className="mb-3">
                                <h2 className="text-sm font-semibold">
                                    Registered customer
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Search using the full or partial ID card.
                                </p>
                            </div>
                            <form
                                onSubmit={onSearch}
                                className="flex flex-col gap-2 sm:flex-row"
                            >
                                <div className="relative flex-1">
                                    <BadgeCheck className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={customerSearch}
                                        onChange={(event) =>
                                            onSearchChange(event.target.value)
                                        }
                                        placeholder="Search customer ID card"
                                        className="h-11 bg-background pl-9"
                                        autoFocus
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    variant="outline"
                                    className="h-11 px-5"
                                >
                                    <Search className="size-4" />
                                    Search
                                </Button>
                            </form>

                            {customerResults.length > 0 && (
                                <div className="mt-3 max-h-60 space-y-1 overflow-y-auto rounded-xl border bg-background p-1.5">
                                    {customerResults.map((customer) => (
                                        <button
                                            key={customer.id}
                                            type="button"
                                            onClick={() => onSelect(customer)}
                                            aria-pressed={
                                                selectedCustomer.id ===
                                                customer.id
                                            }
                                            className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${selectedCustomer.id === customer.id ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-muted'}`}
                                        >
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
                                                {customer.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-semibold">
                                                    {customer.name}
                                                </span>
                                                <span className="block truncate text-xs text-muted-foreground">
                                                    {customer.id_card}
                                                    {customer.phone
                                                        ? ` · ${customer.phone}`
                                                        : ''}
                                                </span>
                                            </span>
                                            {selectedCustomer.id ===
                                                customer.id && (
                                                <Check className="size-4 text-blue-600" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {customerSearch !== '' &&
                                customerResults.length === 0 && (
                                    <div className="mt-3 rounded-xl border border-dashed bg-muted/40 p-4 text-center">
                                        <p className="text-sm font-medium">
                                            No matching customer yet
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Check the ID card and search again,
                                            or continue with Cash Customer.
                                        </p>
                                    </div>
                                )}
                        </section>
                    </main>

                    <aside className="flex flex-col justify-between gap-6 border-t bg-muted/35 p-5 md:p-7 lg:border-t-0 lg:border-l">
                        <div>
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Selected customer
                            </p>
                            <div className="mt-4 flex items-center gap-3">
                                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-foreground text-lg font-bold text-background">
                                    {selectedCustomer.name
                                        .charAt(0)
                                        .toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate font-bold">
                                        {selectedCustomer.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedCustomerDescription}
                                    </p>
                                </div>
                            </div>

                            <dl className="mt-6 space-y-3 border-t pt-5 text-sm">
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted-foreground">
                                        ID card
                                    </dt>
                                    <dd className="truncate text-right font-medium">
                                        {selectedCustomer.id_card ?? '—'}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted-foreground">
                                        Phone
                                    </dt>
                                    <dd className="truncate text-right font-medium">
                                        {selectedCustomer.phone ?? '—'}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <div>
                            <Button
                                type="button"
                                size="lg"
                                onClick={onContinue}
                                className="h-11 w-full bg-blue-600 hover:bg-blue-700"
                            >
                                Continue to products
                                <ArrowRight className="size-4" />
                            </Button>
                            <p className="mt-3 text-center text-xs text-muted-foreground">
                                You can change this customer before checkout.
                            </p>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}

function CouponDialog({
    open,
    barcode,
    candidate,
    lookupMessage,
    onOpenChange,
    onBarcodeChange,
    onLookup,
    onApply,
}: {
    open: boolean;
    barcode: string;
    candidate: Coupon | null;
    lookupMessage: string;
    onOpenChange: (open: boolean) => void;
    onBarcodeChange: (barcode: string) => void;
    onLookup: (event: FormEvent) => void;
    onApply: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        <TicketPercent className="size-5" />
                    </div>
                    <DialogTitle>Apply coupon code</DialogTitle>
                    <DialogDescription>
                        Scan the coupon barcode or enter it manually, then
                        confirm the coupon to apply its amount.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onLookup} className="space-y-3">
                    <label
                        htmlFor="coupon-barcode"
                        className="text-sm font-semibold"
                    >
                        Coupon barcode
                    </label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <ScanBarcode className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="coupon-barcode"
                                value={barcode}
                                onChange={(event) =>
                                    onBarcodeChange(event.target.value)
                                }
                                placeholder="Scan barcode and press Enter"
                                className="pl-9"
                                autoComplete="off"
                                autoFocus
                            />
                        </div>
                        <Button type="submit" variant="outline">
                            Check
                        </Button>
                    </div>
                </form>

                <p
                    className="min-h-5 text-xs text-muted-foreground"
                    aria-live="polite"
                >
                    {lookupMessage ||
                        'The barcode scanner can submit with the Enter key.'}
                </p>

                {candidate && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
                        <div className="flex items-start gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                                <CircleCheck className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold">
                                    {candidate.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {candidate.code} · {candidate.barcode}
                                </p>
                            </div>
                            <p className="font-bold text-blue-700 dark:text-blue-300">
                                {money.format(Number(candidate.amount))}
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        disabled={!candidate}
                        onClick={onApply}
                    >
                        Apply coupon
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CartSummary({
    cart,
    totals,
    customer,
    coupon,
    onQuantityChange,
    onRemove,
    onOpenCoupon,
    onRemoveCoupon,
}: {
    cart: CartLine[];
    totals: {
        lineCount: number;
        quantity: number;
        subtotal: number;
        discount: number;
        tax: number;
        grandTotal: number;
    };
    customer: Customer;
    coupon: Coupon | null;
    onQuantityChange: (productId: number, quantity: number) => void;
    onRemove: (productId: number) => void;
    onOpenCoupon: () => void;
    onRemoveCoupon: () => void;
}) {
    return (
        <aside className="flex min-h-[540px] flex-col rounded-xl border bg-card xl:sticky xl:top-4 xl:max-h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between border-b p-4">
                <div>
                    <h2 className="font-bold">Current sale</h2>
                    <p className="text-xs text-muted-foreground">
                        {customer.name}
                    </p>
                </div>
                <Badge variant="secondary">{totals.lineCount} lines</Badge>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {cart.length === 0 ? (
                    <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
                        <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-muted">
                            <ShoppingCart className="size-6 text-muted-foreground" />
                        </span>
                        <p className="font-semibold">Cart is empty</p>
                        <p className="mt-1 max-w-52 text-sm text-muted-foreground">
                            Scan a barcode or choose a product to begin.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {cart.map((line) => (
                            <div
                                key={line.id}
                                className="rounded-lg border p-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold">
                                            {line.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {line.sku} ·{' '}
                                            {money.format(
                                                Number(line.selling_price),
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onRemove(line.id)}
                                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        aria-label={`Remove ${line.name}`}
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <div className="flex items-center rounded-lg border">
                                        <button
                                            type="button"
                                            className="p-2 hover:bg-muted"
                                            onClick={() =>
                                                onQuantityChange(
                                                    line.id,
                                                    stepQuantity(
                                                        line.quantity,
                                                        'decrease',
                                                    ),
                                                )
                                            }
                                            aria-label="Decrease quantity"
                                        >
                                            <Minus className="size-3" />
                                        </button>
                                        <Input
                                            type="number"
                                            min="0"
                                            max={line.available_quantity}
                                            step={1 / 10 ** line.decimal_places}
                                            value={line.quantity}
                                            onChange={(event) =>
                                                onQuantityChange(
                                                    line.id,
                                                    Number(event.target.value),
                                                )
                                            }
                                            className="h-8 w-16 rounded-none border-0 px-1 text-center shadow-none focus-visible:ring-0"
                                            aria-label={`${line.name} quantity`}
                                        />
                                        <button
                                            type="button"
                                            className="p-2 hover:bg-muted"
                                            onClick={() =>
                                                onQuantityChange(
                                                    line.id,
                                                    stepQuantity(
                                                        line.quantity,
                                                        'increase',
                                                    ),
                                                )
                                            }
                                            aria-label="Increase quantity"
                                        >
                                            <Plus className="size-3" />
                                        </button>
                                    </div>
                                    <p className="font-bold">
                                        {money.format(
                                            Number(line.selling_price) *
                                                line.quantity,
                                        )}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-3 border-t bg-muted/30 p-4">
                {coupon ? (
                    <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <TicketPercent className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                                {coupon.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {coupon.code} · −{money.format(totals.discount)}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onRemoveCoupon}
                            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Remove ${coupon.name}`}
                        >
                            <Trash2 className="size-4" />
                        </button>
                    </div>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start bg-background"
                        disabled={cart.length === 0}
                        onClick={onOpenCoupon}
                    >
                        <TicketPercent className="size-4 text-blue-600" />
                        Apply coupon code
                    </Button>
                )}
                <SummaryRow
                    label={`Items (${formatQuantity(totals.quantity, 3)})`}
                    value={money.format(totals.subtotal)}
                />
                <SummaryRow
                    label="Discount"
                    value={
                        totals.discount > 0
                            ? `−${money.format(totals.discount)}`
                            : money.format(0)
                    }
                />
                <SummaryRow label="Tax" value={money.format(totals.tax)} />
                <div className="my-2 h-px bg-border" />
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold">Grand total</p>
                        <p className="text-xs text-muted-foreground">
                            Server recalculates at payment
                        </p>
                    </div>
                    <p className="text-2xl font-black text-blue-700 dark:text-blue-400">
                        {money.format(totals.grandTotal)}
                    </p>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                    Coupon eligibility and totals are revalidated by the server
                    at payment.
                </p>
            </div>
        </aside>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

function formatQuantity(value: number, decimalPlaces: number): string {
    return value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimalPlaces,
    });
}

PosIndex.layout = {
    breadcrumbs: [
        { title: 'Point of Sale', href: '/pos' },
        { title: 'New sale', href: '/pos' },
    ],
};
