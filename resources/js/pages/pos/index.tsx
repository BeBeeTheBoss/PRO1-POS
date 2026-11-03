import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    CircleCheck,
    CreditCard,
    Minus,
    PackageSearch,
    Phone,
    Plus,
    ScanBarcode,
    Search,
    ShoppingCart,
    TicketPercent,
    Trash2,
    UserRound,
} from 'lucide-react';
import {
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
    type PosCartLine as CartLine,
    type PosCoupon as Coupon,
    type PosCustomer as Customer,
    type PosProduct as Product,
    posDraftStorageKey,
    readPosDraft,
    writePosDraft,
} from '@/features/pos/draft';

type Props = {
    branch: { id: number; name: string; code: string };
    cashCustomer: Customer;
    customerResults: Customer[];
    customerLookupError: string | null;
    productResults: Product[];
    productLookupError: string | null;
    barcodeProduct: Product | null;
    barcodeLookupError: string | null;
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
    customerLookupError,
    productResults,
    productLookupError,
    filters,
}: Props) {
    const { auth } = usePage().props;
    const draftStorageKey = useMemo(
        () => posDraftStorageKey(auth.user.id, branch.id),
        [auth.user.id, branch.id],
    );
    const [selectedCustomer, setSelectedCustomer] =
        useState<Customer>(cashCustomer);
    const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState(
        filters.customerSearch,
    );
    const [customerSearching, setCustomerSearching] = useState(false);
    const [productSearch, setProductSearch] = useState(filters.productSearch);
    const [manualSearchSubmitted, setManualSearchSubmitted] = useState(
        filters.productSearch.trim() !== '',
    );
    const [productSearching, setProductSearching] = useState(false);
    const [barcode, setBarcode] = useState('');
    const [scanMessage, setScanMessage] = useState('');
    const [scannerActive, setScannerActive] = useState(false);
    const [draftHydrated, setDraftHydrated] = useState(false);
    const [cart, setCart] = useState<CartLine[]>([]);
    const [couponDialogOpen, setCouponDialogOpen] = useState(false);
    const [couponBarcode, setCouponBarcode] = useState('');
    const [couponCandidate, setCouponCandidate] = useState<Coupon | null>(null);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const [couponLookupMessage, setCouponLookupMessage] = useState('');
    const barcodeInput = useRef<HTMLInputElement>(null);
    const scannerBuffer = useRef('');
    const scannerBufferTimer = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );

    useEffect(() => {
        const draft = readPosDraft(window.localStorage, draftStorageKey);

        if (draft !== null) {
            setSelectedCustomer(draft.customer);
            setCart(draft.cart);
            setSelectedCoupon(draft.coupon);
        }

        setDraftHydrated(true);
    }, [draftStorageKey]);

    useEffect(() => {
        if (!draftHydrated) {
            return;
        }

        writePosDraft(window.localStorage, draftStorageKey, {
            version: 1,
            customer: selectedCustomer,
            cart,
            coupon: selectedCoupon,
        });
    }, [
        cart,
        draftHydrated,
        draftStorageKey,
        selectedCoupon,
        selectedCustomer,
    ]);

    useEffect(() => {
        if (!customerDialogOpen) {
            barcodeInput.current?.focus();
        }
    }, [customerDialogOpen]);

    const addToCart = useCallback((product: Product) => {
        const available =
            product.available_quantity === null
                ? null
                : Number(product.available_quantity);

        if (available !== null && available <= 0) {
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
                          quantity:
                              available === null
                                  ? line.quantity + 1
                                  : Math.min(line.quantity + 1, available),
                      }
                    : line,
            );
        });
        setScanMessage(`${product.name} added to cart.`);
        requestAnimationFrame(() => barcodeInput.current?.focus());
    }, []);

    const searchCustomers = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/pos',
            { customer_search: customerSearch.trim() },
            {
                only: ['customerResults', 'customerLookupError'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setCustomerSearching(true),
                onFinish: () => setCustomerSearching(false),
            },
        );
    };

    const searchProducts = (event: FormEvent) => {
        event.preventDefault();
        const search = productSearch.trim();

        if (search === '') {
            setManualSearchSubmitted(false);
            return;
        }

        setManualSearchSubmitted(true);
        router.get(
            '/pos',
            {
                product_search: search,
                customer_type:
                    selectedCustomer.member_type === 'Member'
                        ? 'Member'
                        : 'Normal',
            },
            {
                only: ['productResults', 'productLookupError'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setProductSearching(true),
                onFinish: () => {
                    setProductSearching(false);
                    requestAnimationFrame(() => barcodeInput.current?.focus());
                },
            },
        );
    };

    const lookupBarcode = useCallback(
        (scannedValue: string) => {
            const scanned = scannedValue.trim();

            if (scanned === '') {
                return;
            }

            setScanMessage('Looking up barcode…');
            router.get(
                '/pos',
                {
                    barcode: scanned,
                    customer_type:
                        selectedCustomer.member_type === 'Member'
                            ? 'Member'
                            : 'Normal',
                },
                {
                    only: ['barcodeProduct', 'barcodeLookupError'],
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    onSuccess: (page) => {
                        const product = page.props
                            .barcodeProduct as Product | null;
                        const lookupError = page.props.barcodeLookupError as
                            | string
                            | null;

                        if (lookupError) {
                            setScanMessage(lookupError);
                        } else if (product) {
                            addToCart(product);
                        } else {
                            setScanMessage(`No product found for ${scanned}.`);
                        }

                        setBarcode('');
                        requestAnimationFrame(() =>
                            barcodeInput.current?.focus(),
                        );
                    },
                },
            );
        },
        [addToCart, selectedCustomer.member_type],
    );

    const scanBarcode = (event: FormEvent) => {
        event.preventDefault();
        lookupBarcode(barcode);
    };

    useEffect(() => {
        let focusFrame: number | null = null;

        const isEditableTarget = (target: EventTarget | null) =>
            target instanceof HTMLElement &&
            (target.isContentEditable ||
                target.matches('input, textarea, select'));

        const clearScannerBuffer = () => {
            scannerBuffer.current = '';

            if (scannerBufferTimer.current !== null) {
                clearTimeout(scannerBufferTimer.current);
                scannerBufferTimer.current = null;
            }
        };

        const updateScannerActivity = () => {
            const editingVisibleField =
                isEditableTarget(document.activeElement) &&
                document.activeElement !== barcodeInput.current;

            setScannerActive(
                document.hasFocus() &&
                    document.visibilityState === 'visible' &&
                    draftHydrated &&
                    !customerDialogOpen &&
                    !couponDialogOpen &&
                    !editingVisibleField,
            );
        };

        const handleScannerKeyDown = (event: KeyboardEvent) => {
            if (
                !document.hasFocus() ||
                document.visibilityState !== 'visible' ||
                !draftHydrated ||
                customerDialogOpen ||
                couponDialogOpen ||
                event.ctrlKey ||
                event.altKey ||
                event.metaKey ||
                event.repeat
            ) {
                clearScannerBuffer();
                return;
            }

            if (
                isEditableTarget(event.target) &&
                event.target !== barcodeInput.current
            ) {
                return;
            }

            if (event.key === 'Enter') {
                const scanned = scannerBuffer.current.trim();

                if (scanned.length >= 4) {
                    event.preventDefault();
                    event.stopPropagation();
                    clearScannerBuffer();
                    lookupBarcode(scanned);
                }

                return;
            }

            if (event.key.length !== 1) {
                return;
            }

            event.preventDefault();
            scannerBuffer.current += event.key;

            if (scannerBufferTimer.current !== null) {
                clearTimeout(scannerBufferTimer.current);
            }

            scannerBufferTimer.current = setTimeout(clearScannerBuffer, 500);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') {
                clearScannerBuffer();
            }

            updateScannerActivity();
        };

        const handleWindowBlur = () => {
            clearScannerBuffer();
            setScannerActive(false);
        };

        const handleFocusChange = () => {
            if (focusFrame !== null) {
                cancelAnimationFrame(focusFrame);
            }

            focusFrame = requestAnimationFrame(updateScannerActivity);
        };

        window.addEventListener('keydown', handleScannerKeyDown, true);
        window.addEventListener('focus', updateScannerActivity);
        window.addEventListener('blur', handleWindowBlur);
        document.addEventListener('focusin', handleFocusChange);
        document.addEventListener('focusout', handleFocusChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        updateScannerActivity();

        return () => {
            if (focusFrame !== null) {
                cancelAnimationFrame(focusFrame);
            }

            window.removeEventListener('keydown', handleScannerKeyDown, true);
            window.removeEventListener('focus', updateScannerActivity);
            window.removeEventListener('blur', handleWindowBlur);
            document.removeEventListener('focusin', handleFocusChange);
            document.removeEventListener('focusout', handleFocusChange);
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
            clearScannerBuffer();
        };
    }, [couponDialogOpen, customerDialogOpen, draftHydrated, lookupBarcode]);

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

    const setQuantity = (productId: Product['id'], requested: number) => {
        setCart((current) =>
            current
                .map((line) => {
                    if (line.id !== productId) {
                        return line;
                    }

                    const available =
                        line.available_quantity === null
                            ? Number.MAX_SAFE_INTEGER
                            : Number(line.available_quantity);
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

    return (
        <>
            <Head title="Cash Sale (CA)" />
            <div className="flex min-h-full w-full flex-col gap-5 bg-slate-100 p-4 lg:p-6">
                <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                            <ShoppingCart className="size-5" />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-950">
                                    New sale
                                </h1>
                                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                                    {branch.code}
                                </Badge>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                                {branch.name} · Ready for barcode scanning
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCustomerDialogOpen(true)}
                        className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-left ring-1 ring-slate-200 transition-colors hover:bg-blue-50 hover:ring-blue-200"
                    >
                        <span className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                            <UserRound className="size-4" />
                        </span>
                        <span>
                            <span className="block text-xs text-slate-500">
                                Customer
                            </span>
                            <span className="block text-sm font-semibold text-slate-950">
                                {selectedCustomer.name}
                            </span>
                        </span>
                        <span className="ml-2 text-xs font-semibold text-blue-600">
                            Change
                        </span>
                    </button>
                </header>

                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <section className="flex min-w-0 flex-col gap-5">
                        <form
                            onSubmit={scanBarcode}
                            className="fixed top-0 left-0 size-px overflow-hidden opacity-0"
                        >
                            <label htmlFor="barcode">
                                Barcode scanner input
                            </label>
                            <input
                                ref={barcodeInput}
                                id="barcode"
                                value={barcode}
                                onChange={(event) =>
                                    setBarcode(event.target.value)
                                }
                                autoComplete="off"
                                tabIndex={-1}
                            />
                            <button type="submit">Add scanned product</button>
                        </form>

                        <form
                            onSubmit={searchProducts}
                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <label
                                        htmlFor="product-search"
                                        className="flex items-center gap-2 text-sm font-bold text-slate-900"
                                    >
                                        <Search className="size-4 text-blue-600" />
                                        Find a product manually
                                    </label>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Optional fallback when a barcode cannot
                                        be scanned.
                                    </p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                                    Optional
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    id="product-search"
                                    value={productSearch}
                                    onChange={(event) => {
                                        setProductSearch(event.target.value);
                                        setManualSearchSubmitted(false);
                                    }}
                                    placeholder="Product name or barcode"
                                    className="h-11 bg-slate-50"
                                />
                                <Button
                                    type="submit"
                                    className="h-11 px-5"
                                    disabled={
                                        productSearching ||
                                        productSearch.trim() === ''
                                    }
                                >
                                    {productSearching ? 'Searching…' : 'Search'}
                                </Button>
                            </div>
                        </form>

                        {!manualSearchSubmitted && !productSearching && (
                            <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-gradient-to-b from-white to-blue-50/60 px-6 text-center shadow-sm">
                                <span className="mb-5 flex size-20 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-600/20">
                                    <ScanBarcode className="size-9" />
                                </span>
                                <h2 className="text-xl font-bold text-slate-950">
                                    Ready to scan products
                                </h2>
                                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                                    Use the barcode scanner now. Each valid scan
                                    is found and added directly to the current
                                    sale.
                                </p>
                                <div
                                    className={`mt-5 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 ${scannerActive ? 'bg-white text-slate-600 ring-slate-200' : 'bg-amber-50 text-amber-800 ring-amber-200'}`}
                                    aria-live="polite"
                                >
                                    <span
                                        className={`size-2 rounded-full ${scannerActive ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    />
                                    {scannerActive
                                        ? scanMessage ||
                                          'Scanner is active and waiting'
                                        : draftHydrated
                                          ? 'Scanner paused — focus this POS window'
                                          : 'Restoring saved sale…'}
                                </div>
                            </div>
                        )}

                        {productSearching && (
                            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-500 shadow-sm">
                                <Search className="mr-2 size-4 animate-pulse text-blue-600" />
                                Searching products…
                            </div>
                        )}

                        {manualSearchSubmitted &&
                            !productSearching &&
                            productLookupError && (
                                <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 text-center shadow-sm">
                                    <PackageSearch className="mb-3 size-9 text-red-500" />
                                    <p className="font-semibold text-red-900">
                                        Product search unavailable
                                    </p>
                                    <p className="mt-1 text-sm text-red-700">
                                        {productLookupError}
                                    </p>
                                </div>
                            )}

                        {manualSearchSubmitted &&
                            !productSearching &&
                            !productLookupError &&
                            productResults.length > 0 && (
                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[720px] table-fixed text-sm">
                                            <colgroup>
                                                <col className="w-[38%]" />
                                                <col className="w-[19%]" />
                                                <col className="w-[9%]" />
                                                <col className="w-[16%]" />
                                                <col className="w-[18%]" />
                                            </colgroup>
                                            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                                <tr>
                                                    <th className="px-4 py-3">
                                                        Product
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        Barcode
                                                    </th>
                                                    <th className="px-4 py-3 text-center">
                                                        Unit
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
                                                {productResults.map(
                                                    (product) => {
                                                        const available =
                                                            product.available_quantity ===
                                                            null
                                                                ? null
                                                                : Number(
                                                                      product.available_quantity,
                                                                  );

                                                        return (
                                                            <tr
                                                                key={product.id}
                                                                className="group transition-colors focus-within:bg-blue-50 hover:bg-blue-50"
                                                            >
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                                                            <PackageSearch className="size-4 text-muted-foreground transition-colors group-hover:text-blue-600" />
                                                                        </span>
                                                                        <span className="leading-5 font-semibold break-words">
                                                                            {
                                                                                product.name
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className="font-medium text-slate-700">
                                                                        {product.barcode ??
                                                                            product.sku}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <Badge variant="secondary">
                                                                        {
                                                                            product.unit_short_name
                                                                        }
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <span className="block font-bold text-blue-700">
                                                                        {money.format(
                                                                            Number(
                                                                                product.selling_price,
                                                                            ),
                                                                        )}
                                                                    </span>
                                                                    {product.price_tier && (
                                                                        <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                                                                            {
                                                                                product.price_tier
                                                                            }{' '}
                                                                            price
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        disabled={
                                                                            available !==
                                                                                null &&
                                                                            available <=
                                                                                0
                                                                        }
                                                                        onClick={() =>
                                                                            addToCart(
                                                                                product,
                                                                            )
                                                                        }
                                                                        className="transition-colors"
                                                                    >
                                                                        <ShoppingCart className="mr-1.5 size-3.5" />
                                                                        Add to
                                                                        cart
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    },
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        {manualSearchSubmitted &&
                            !productSearching &&
                            !productLookupError &&
                            productResults.length === 0 && (
                                <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center shadow-sm">
                                    <PackageSearch className="mb-3 size-9 text-muted-foreground" />
                                    <p className="font-semibold">
                                        No products found
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Try another product name or barcode.
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

            <CustomerDialog
                open={customerDialogOpen}
                cashCustomer={cashCustomer}
                customerResults={customerResults}
                customerLookupError={customerLookupError}
                customerSearch={customerSearch}
                customerSearching={customerSearching}
                selectedCustomer={selectedCustomer}
                onOpenChange={setCustomerDialogOpen}
                onSearchChange={setCustomerSearch}
                onSearch={searchCustomers}
                onSelect={setSelectedCustomer}
                onContinue={() => setCustomerDialogOpen(false)}
            />

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

function CustomerDialog({
    open,
    cashCustomer,
    customerResults,
    customerLookupError,
    customerSearch,
    customerSearching,
    selectedCustomer,
    onOpenChange,
    onSearchChange,
    onSearch,
    onSelect,
    onContinue,
}: {
    open: boolean;
    cashCustomer: Customer;
    customerResults: Customer[];
    customerLookupError: string | null;
    customerSearch: string;
    customerSearching: boolean;
    selectedCustomer: Customer;
    onOpenChange: (open: boolean) => void;
    onSearchChange: (value: string) => void;
    onSearch: (event: FormEvent) => void;
    onSelect: (customer: Customer) => void;
    onContinue: () => void;
}) {
    const selectedCustomerDescription = selectedCustomer.is_cash_customer
        ? 'Walk-in customer'
        : 'Registered customer';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto p-0 sm:max-w-5xl">
                <header className="flex flex-col gap-4 border-b px-5 py-5 pr-14 sm:flex-row sm:items-center sm:justify-between md:px-7 md:pr-14">
                    <div className="flex items-center gap-4">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
                            <UserRound className="size-5" />
                        </span>
                        <div>
                            <DialogTitle className="text-xl font-bold tracking-tight">
                                Who is this sale for?
                            </DialogTitle>
                            <DialogDescription className="mt-0.5 text-sm text-muted-foreground">
                                Use the walk-in customer or find a registered
                                customer by mobile number.
                            </DialogDescription>
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
                                    Enter the exact mobile number registered in
                                    the cloud customer directory.
                                </p>
                            </div>
                            <form
                                onSubmit={onSearch}
                                className="flex flex-col gap-2 sm:flex-row"
                            >
                                <div className="relative flex-1">
                                    <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={customerSearch}
                                        onChange={(event) =>
                                            onSearchChange(event.target.value)
                                        }
                                        type="tel"
                                        inputMode="tel"
                                        autoComplete="tel"
                                        placeholder="Enter mobile number"
                                        className="h-11 bg-background pl-9"
                                        autoFocus
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    variant="outline"
                                    className="h-11 px-5"
                                    disabled={
                                        customerSearching ||
                                        customerSearch.trim().length < 5
                                    }
                                >
                                    <Search className="size-4" />
                                    {customerSearching
                                        ? 'Searching…'
                                        : 'Search'}
                                </Button>
                            </form>

                            {customerLookupError && (
                                <div
                                    role="alert"
                                    className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                                >
                                    {customerLookupError}
                                </div>
                            )}

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
                                                    {customer.phone ??
                                                        'No mobile number'}
                                                    {customer.customer_code
                                                        ? ` · ${customer.customer_code}`
                                                        : ''}
                                                </span>
                                            </span>
                                            {customer.member_type && (
                                                <Badge variant="secondary">
                                                    {customer.member_type}
                                                </Badge>
                                            )}
                                            {selectedCustomer.id ===
                                                customer.id && (
                                                <Check className="size-4 text-blue-600" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {customerSearch !== '' &&
                                customerResults.length === 0 &&
                                !customerLookupError &&
                                !customerSearching && (
                                    <div className="mt-3 rounded-xl border border-dashed bg-muted/40 p-4 text-center">
                                        <p className="text-sm font-medium">
                                            No matching customer yet
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Check the mobile number and search
                                            again, or continue with Cash
                                            Customer.
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
                                        Mobile
                                    </dt>
                                    <dd className="truncate text-right font-medium">
                                        {selectedCustomer.phone ?? '—'}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted-foreground">
                                        Member card
                                    </dt>
                                    <dd className="truncate text-right font-medium">
                                        {selectedCustomer.member_card_no ?? '—'}
                                    </dd>
                                </div>
                                {!selectedCustomer.is_cash_customer && (
                                    <>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-muted-foreground">
                                                Customer code
                                            </dt>
                                            <dd className="truncate text-right font-medium">
                                                {selectedCustomer.customer_code ??
                                                    '—'}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-muted-foreground">
                                                Member type
                                            </dt>
                                            <dd className="truncate text-right font-medium">
                                                {selectedCustomer.member_type ??
                                                    'Normal'}
                                            </dd>
                                        </div>
                                    </>
                                )}
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
            </DialogContent>
        </Dialog>
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
    onQuantityChange: (productId: Product['id'], quantity: number) => void;
    onRemove: (productId: Product['id']) => void;
    onOpenCoupon: () => void;
    onRemoveCoupon: () => void;
}) {
    return (
        <aside className="flex flex-col self-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 xl:sticky xl:top-4 xl:max-h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                    <h2 className="font-bold text-slate-950">Current sale</h2>
                    <p className="text-xs text-slate-500">{customer.name}</p>
                </div>
                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                    {totals.lineCount} lines
                </Badge>
            </div>

            <div className="max-h-[360px] overflow-y-auto p-3">
                {cart.length === 0 ? (
                    <div className="flex min-h-48 flex-col items-center justify-center text-center">
                        <span className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-blue-50">
                            <ShoppingCart className="size-6 text-blue-600" />
                        </span>
                        <p className="font-semibold text-slate-900">
                            Ready to scan
                        </p>
                        <p className="mt-1 max-w-52 text-sm text-slate-500">
                            Scan a product barcode to begin this sale.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {cart.map((line) => (
                            <div
                                key={line.id}
                                className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm leading-5 font-semibold break-words text-slate-950">
                                            {line.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {line.sku} ·{' '}
                                            {money.format(
                                                Number(line.selling_price),
                                            )}
                                            {line.price_tier
                                                ? ` · ${line.price_tier} price`
                                                : ''}
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
                                    <div className="flex items-center rounded-lg border border-slate-200 bg-white">
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
                                            max={
                                                line.available_quantity ??
                                                undefined
                                            }
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

            <div className="space-y-3 border-t border-slate-200 bg-slate-50/80 p-5">
                {coupon ? (
                    <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
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
                    <p className="text-2xl font-black text-blue-700">
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
        { title: 'Sale', href: '/pos' },
        { title: 'Cash Sale (CA)', href: '/pos' },
    ],
};
