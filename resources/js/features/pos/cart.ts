export type QuantityDirection = 'increase' | 'decrease';

export function stepQuantity(
    quantity: number,
    direction: QuantityDirection,
): number {
    return quantity + (direction === 'increase' ? 1 : -1);
}

export function normalizeQuantity(
    requested: number,
    available: number,
    decimalPlaces: number,
): number {
    const precision = 10 ** decimalPlaces;

    return (
        Math.round(Math.min(Math.max(requested, 0), available) * precision) /
        precision
    );
}

export function calculateCouponDiscount(
    subtotal: number,
    couponAmount: number,
): number {
    if (!Number.isFinite(subtotal) || !Number.isFinite(couponAmount)) {
        return 0;
    }

    return Math.min(Math.max(subtotal, 0), Math.max(couponAmount, 0));
}
