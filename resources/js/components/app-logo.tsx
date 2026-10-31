import { usePage } from '@inertiajs/react';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <div className="flex min-w-0 flex-1 items-center">
            <span className="flex h-10 w-[132px] items-center justify-center overflow-hidden group-data-[collapsible=icon]:hidden">
                <img
                    src="/images/pro1-global-home-center.png"
                    alt={`${name} · PRO1 Global Home Center`}
                    className="block w-full object-contain dark:drop-shadow-[0_0_1px_rgba(255,255,255,0.8)]"
                />
            </span>
            <span className="hidden size-8 items-center overflow-hidden group-data-[collapsible=icon]:flex">
                <img
                    src="/images/pro1-global-home-center.png"
                    alt=""
                    aria-hidden="true"
                    className="h-7 w-auto max-w-none dark:drop-shadow-[0_0_1px_rgba(255,255,255,0.8)]"
                />
            </span>
        </div>
    );
}
