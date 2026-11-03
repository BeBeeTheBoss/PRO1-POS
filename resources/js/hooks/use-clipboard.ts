// Credit: https://usehooks-ts.com/
import { useState } from 'react';

export type CopiedValue = string | null;
export type CopyFn = (text: string) => Promise<boolean>;
export type UseClipboardReturn = [CopiedValue, CopyFn];
type ClipboardWriter = Pick<Clipboard, 'writeText'>;

export async function writeClipboardText(
    text: string,
    clipboard: ClipboardWriter | undefined = typeof navigator === 'undefined'
        ? undefined
        : navigator.clipboard,
): Promise<boolean> {
    if (!clipboard) {
        console.warn('Clipboard not supported');

        return false;
    }

    try {
        await clipboard.writeText(text);

        return true;
    } catch (error) {
        console.warn('Copy failed', error);

        return false;
    }
}

export function useClipboard(): UseClipboardReturn {
    const [copiedText, setCopiedText] = useState<CopiedValue>(null);

    const copy: CopyFn = async (text) => {
        const copied = await writeClipboardText(text);

        if (copied) {
            setCopiedText(text);
        } else {
            setCopiedText(null);
        }

        return copied;
    };

    return [copiedText, copy];
}
