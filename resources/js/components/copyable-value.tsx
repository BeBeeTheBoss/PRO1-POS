import { Check, Copy } from 'lucide-react';
import { useClipboard } from '@/hooks/use-clipboard';

export function CopyableValue({
    label,
    value,
}: {
    label: string;
    value: string | null;
}) {
    const [copiedText, copy] = useClipboard();
    const copied = value !== null && copiedText === value;

    if (!value) {
        return <span className="whitespace-nowrap">—</span>;
    }

    return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span>{value}</span>
            <button
                type="button"
                onClick={() => void copy(value)}
                aria-label={`Copy ${label}`}
                title={copied ? `${label} copied` : `Copy ${label}`}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none"
            >
                {copied ? (
                    <Check className="size-3.5 text-emerald-600" />
                ) : (
                    <Copy className="size-3.5" />
                )}
                <span className="sr-only">
                    {copied ? `${label} copied` : `Copy ${label}`}
                </span>
            </button>
        </span>
    );
}
