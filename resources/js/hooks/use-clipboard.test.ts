import { describe, expect, it, vi } from 'vitest';
import { writeClipboardText } from './use-clipboard';

describe('writeClipboardText', () => {
    it('writes the supplied value to the clipboard', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);

        await expect(
            writeClipboardText('CUST-001', { writeText }),
        ).resolves.toBe(true);
        expect(writeText).toHaveBeenCalledWith('CUST-001');
    });

    it('returns false when clipboard access fails', async () => {
        const failure = new Error('denied');
        const writeText = vi.fn().mockRejectedValue(failure);
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await expect(
            writeClipboardText('09421123456', { writeText }),
        ).resolves.toBe(false);
        expect(warning).toHaveBeenCalledWith('Copy failed', failure);

        warning.mockRestore();
    });
});
