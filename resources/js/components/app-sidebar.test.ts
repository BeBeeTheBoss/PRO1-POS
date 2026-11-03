import { describe, expect, it } from 'vitest';
import { mainNavItems } from './app-sidebar';

describe('application sidebar navigation', () => {
    it('nests the POS page under Sale as Cash Sale (CA)', () => {
        const sale = mainNavItems.find((item) => item.title === 'Sale');

        expect(sale).toBeDefined();
        expect(sale?.href).toBe('/pos');
        expect(sale?.items).toEqual([
            expect.objectContaining({
                title: 'Cash Sale (CA)',
                href: '/pos',
            }),
        ]);
        expect(
            mainNavItems.some((item) => item.title === 'Point of Sale'),
        ).toBe(false);
    });
});
