import { describe, expect, it } from 'vitest';
import {
    clearPosDraft,
    type PosDraft,
    posDraftStorageKey,
    readPosDraft,
    writePosDraft,
} from './draft';

class MemoryStorage {
    private readonly values = new Map<string, string>();

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }

    removeItem(key: string): void {
        this.values.delete(key);
    }
}

const draft: PosDraft = {
    version: 1,
    customer: {
        id: 'cloud:CUST-001',
        name: 'Member Customer',
        id_card: 'MEM-001',
        phone: '09123456789',
        is_cash_customer: false,
        member_type: 'Member',
    },
    cart: [
        {
            id: 'cloud-product:8852425459084',
            name: 'Test Product',
            sku: '8852425459084',
            barcode: '8852425459084',
            selling_price: '11000.00',
            available_quantity: null,
            unit_name: 'PC',
            unit_short_name: 'PC',
            decimal_places: 3,
            quantity: 2,
            price_tier: 'Member',
        },
    ],
    coupon: null,
};

describe('POS draft storage', () => {
    it('round-trips a validated customer and cart draft', () => {
        const storage = new MemoryStorage();
        const key = posDraftStorageKey(7, 2);

        expect(writePosDraft(storage, key, draft)).toBe(true);
        expect(readPosDraft(storage, key)).toEqual(draft);
    });

    it('scopes drafts by user and branch', () => {
        expect(posDraftStorageKey(7, 2)).not.toBe(posDraftStorageKey(8, 2));
        expect(posDraftStorageKey(7, 2)).not.toBe(posDraftStorageKey(7, 3));
    });

    it('rejects malformed or unsupported stored data', () => {
        const storage = new MemoryStorage();
        storage.setItem('broken', '{');
        storage.setItem('old', JSON.stringify({ ...draft, version: 0 }));

        expect(readPosDraft(storage, 'broken')).toBeNull();
        expect(readPosDraft(storage, 'old')).toBeNull();
    });

    it('clears the draft after a successful payment boundary', () => {
        const storage = new MemoryStorage();
        const key = posDraftStorageKey(7, 2);
        writePosDraft(storage, key, draft);

        clearPosDraft(storage, key);

        expect(readPosDraft(storage, key)).toBeNull();
    });
});
