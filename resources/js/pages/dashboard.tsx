import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Boxes,
    CircleDollarSign,
    Package,
    ReceiptText,
    ShoppingCart,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type RecentSale = {
    id: number;
    invoice_number: string;
    grand_total: string;
    sold_at: string;
    customer: { name: string } | null;
    cashier: { name: string };
};

type Props = {
    stats: {
        todayRevenue: number;
        todayTransactions: number;
        activeProducts: number;
        lowStockProducts: number;
    };
    recentSales: RecentSale[];
};

const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MMK',
    maximumFractionDigits: 0,
});

export default function Dashboard({ stats, recentSales }: Props) {
    const cards = [
        {
            label: "Today's revenue",
            value: money.format(stats.todayRevenue),
            icon: CircleDollarSign,
            tone: 'text-blue-600',
        },
        {
            label: "Today's transactions",
            value: stats.todayTransactions.toLocaleString(),
            icon: ReceiptText,
            tone: 'text-blue-600',
        },
        {
            label: 'Active products',
            value: stats.activeProducts.toLocaleString(),
            icon: Package,
            tone: 'text-violet-600',
        },
        {
            label: 'Low stock',
            value: stats.lowStockProducts.toLocaleString(),
            icon: AlertTriangle,
            tone: 'text-amber-600',
        },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-sm font-medium text-blue-600">
                            Store overview
                        </p>
                        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                            Good day. Here is your business.
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Live operational summary across sales and stock.
                        </p>
                    </div>
                    <Button
                        asChild
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Link href="/pos">
                            <ShoppingCart className="mr-2 size-4" />
                            Open POS
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map(({ label, value, icon: Icon, tone }) => (
                        <Card key={label}>
                            <CardContent className="flex items-center justify-between p-5">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        {label}
                                    </p>
                                    <p className="mt-1 text-2xl font-bold">
                                        {value}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-muted p-3">
                                    <Icon className={`size-5 ${tone}`} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Recent sales</CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/modules/sales">
                                    View all{' '}
                                    <ArrowRight className="ml-1 size-4" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {recentSales.length === 0 ? (
                                <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed text-center">
                                    <ReceiptText className="mb-3 size-8 text-muted-foreground" />
                                    <p className="font-medium">
                                        No sales recorded yet
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Completed sales will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {recentSales.map((sale) => (
                                        <div
                                            key={sale.id}
                                            className="flex items-center justify-between py-3"
                                        >
                                            <div>
                                                <p className="font-medium">
                                                    {sale.invoice_number}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {sale.customer?.name ??
                                                        'Walk-in customer'}{' '}
                                                    · {sale.cashier.name}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold">
                                                    {money.format(
                                                        Number(
                                                            sale.grand_total,
                                                        ),
                                                    )}
                                                </p>
                                                <Badge variant="secondary">
                                                    Paid
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Quick actions</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            <Button
                                variant="outline"
                                className="h-auto justify-start p-4"
                                asChild
                            >
                                <Link href="/products">
                                    <Package className="mr-3 size-5 text-violet-600" />
                                    <span className="text-left">
                                        <span className="block font-semibold">
                                            Find product
                                        </span>
                                        <span className="block text-xs text-muted-foreground">
                                            Search by name or barcode
                                        </span>
                                    </span>
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-auto justify-start p-4"
                                asChild
                            >
                                <Link href="/modules/inventory">
                                    <Boxes className="mr-3 size-5 text-blue-600" />
                                    <span className="text-left">
                                        <span className="block font-semibold">
                                            Adjust stock
                                        </span>
                                        <span className="block text-xs text-muted-foreground">
                                            Record opening or corrected balance
                                        </span>
                                    </span>
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-auto justify-start p-4"
                                asChild
                            >
                                <Link href="/modules/purchases">
                                    <ReceiptText className="mr-3 size-5 text-blue-600" />
                                    <span className="text-left">
                                        <span className="block font-semibold">
                                            Receive purchase
                                        </span>
                                        <span className="block text-xs text-muted-foreground">
                                            Bring supplier stock into inventory
                                        </span>
                                    </span>
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: '/dashboard' }],
};
