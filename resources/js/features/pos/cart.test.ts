import { describe, expect, it } from 'vitest';
import {
    calculateCouponDiscount,
    normalizeQuantity,
    stepQuantity,
} from './cart';

describe('POS cart quantities', () => {
    it('changes plus and minus controls by one whole unit', () => {
        expect(stepQuantity(2, 'decrease')).toBe(1);
        expect(stepQuantity(1, 'increase')).toBe(2);
    });

    it('keeps manually entered quantities within unit precision and stock', () => {
        expect(normalizeQuantity(1.236, 10, 2)).toBe(1.24);
        expect(normalizeQuantity(12, 10, 2)).toBe(10);
        expect(normalizeQuantity(-1, 10, 2)).toBe(0);
    });

    it('never applies more coupon discount than the cart subtotal', () => {
        expect(calculateCouponDiscount(50_000, 10_000)).toBe(10_000);
        expect(calculateCouponDiscount(5_000, 10_000)).toBe(5_000);
        expect(calculateCouponDiscount(0, 10_000)).toBe(0);
    });
});
