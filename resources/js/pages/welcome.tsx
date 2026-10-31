import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    Boxes,
    PackageCheck,
    ShoppingCart,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { Button } from '@/components/ui/button';

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Store operations, in one place" />
            <div className="min-h-screen bg-[#f6f7f2] text-slate-950 dark:bg-slate-950 dark:text-white">
                <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
                    <div className="flex items-center">
                        <AppLogo />
                    </div>
                    <Button asChild variant="outline">
                        <Link href={auth.user ? '/dashboard' : '/login'}>
                            {auth.user ? 'Dashboard' : 'Sign in'}
                            <ArrowRight className="ml-2 size-4" />
                        </Link>
                    </Button>
                </header>

                <main className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
                    <section>
                        <div className="mb-6 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            Built for hardware and household stores
                        </div>
                        <h1 className="max-w-3xl text-5xl leading-[1.05] font-black tracking-[-0.04em] sm:text-6xl">
                            Sell faster. Know exactly what is on every shelf.
                        </h1>
                        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                            A modern point-of-sale foundation for products sold
                            by piece, foot, metre, bag and more—backed by
                            auditable stock movements.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button
                                asChild
                                size="lg"
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Link
                                    href={auth.user ? '/dashboard' : '/login'}
                                >
                                    Open workspace
                                    <ArrowRight className="ml-2 size-4" />
                                </Link>
                            </Button>
                            {!auth.user && (
                                <Button asChild size="lg" variant="ghost">
                                    <Link href="/register">
                                        Create local account
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </section>

                    <section className="relative">
                        <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-blue-200/40 blur-3xl dark:bg-blue-900/20" />
                        <div className="rounded-[2rem] border border-white/70 bg-white p-5 shadow-2xl shadow-blue-950/10 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
                                <div>
                                    <p className="text-sm text-slate-500">
                                        Today
                                    </p>
                                    <p className="text-xl font-bold">
                                        Store overview
                                    </p>
                                </div>
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                    Open
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 py-5">
                                <Metric
                                    icon={ShoppingCart}
                                    label="Fast checkout"
                                    value="Barcode ready"
                                />
                                <Metric
                                    icon={Boxes}
                                    label="Inventory"
                                    value="Branch aware"
                                />
                                <Metric
                                    icon={PackageCheck}
                                    label="Stock ledger"
                                    value="Fully audited"
                                />
                                <Metric
                                    icon={BarChart3}
                                    label="Reporting"
                                    value="Profit ready"
                                />
                            </div>
                            <div className="rounded-2xl bg-slate-950 p-5 text-white">
                                <p className="text-sm text-slate-400">
                                    Designed for real store operations
                                </p>
                                <p className="mt-2 text-lg font-semibold">
                                    Catalog, stock, sales, payments and
                                    purchasing share one reliable source of
                                    truth.
                                </p>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}

function Metric({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof ShoppingCart;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <Icon className="mb-5 size-5 text-blue-600" />
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 font-semibold">{value}</p>
        </div>
    );
}
