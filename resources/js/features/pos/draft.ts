export type PosCustomer = {
    id: number | string;
    name: string;
    id_card: string | null;
    phone: string | null;
    is_cash_customer: boolean;
    source?: 'cloud';
    member_type?: string;
    tax_id?: string | null;
    nrc?: string | null;
    member_card_no?: string | null;
    customer_code?: string | null;
    address?: string | null;
    office_phone?: string | null;
};

export type PosProduct = {
    id: number | string;
    name: string;
    sku: string;
    barcode: string | null;
    selling_price: string;
    normal_price?: string;
    member_price?: string;
    price_tier?: 'Normal' | 'Member';
    available_quantity: string | null;
    unit_name: string;
    unit_short_name: string;
    decimal_places: number;
    source?: 'cloud';
};

export type PosCartLine = PosProduct & { quantity: number };

export type PosCoupon = {
    id: number;
    name: string;
    code: string;
    barcode: string;
    amount: string;
};

export type PosDraft = {
    version: 1;
    customer: PosCustomer;
    cart: PosCartLine[];
    coupon: PosCoupon | null;
};

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const DRAFT_VERSION = 1;

export function posDraftStorageKey(userId: number, branchId: number): string {
    return `pos:draft:v${DRAFT_VERSION}:user:${userId}:branch:${branchId}`;
}

export function readPosDraft(
    storage: DraftStorage,
    key: string,
): PosDraft | null {
    try {
        const stored = storage.getItem(key);

        if (stored === null) {
            return null;
        }

        const parsed: unknown = JSON.parse(stored);

        return isPosDraft(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function writePosDraft(
    storage: DraftStorage,
    key: string,
    draft: PosDraft,
): boolean {
    try {
        storage.setItem(key, JSON.stringify(draft));

        return true;
    } catch {
        return false;
    }
}

export function clearPosDraft(storage: DraftStorage, key: string): void {
    try {
        storage.removeItem(key);
    } catch {
        // Storage can be unavailable in privacy modes. The sale still proceeds.
    }
}

function isPosDraft(value: unknown): value is PosDraft {
    if (!isRecord(value) || value.version !== DRAFT_VERSION) {
        return false;
    }

    return (
        isCustomer(value.customer) &&
        Array.isArray(value.cart) &&
        value.cart.every(isCartLine) &&
        (value.coupon === null || isCoupon(value.coupon))
    );
}

function isCustomer(value: unknown): value is PosCustomer {
    return (
        isRecord(value) &&
        (typeof value.id === 'number' || typeof value.id === 'string') &&
        typeof value.name === 'string' &&
        isNullableString(value.id_card) &&
        isNullableString(value.phone) &&
        typeof value.is_cash_customer === 'boolean' &&
        isOptionalString(value.member_type)
    );
}

function isCartLine(value: unknown): value is PosCartLine {
    return (
        isRecord(value) &&
        (typeof value.id === 'number' || typeof value.id === 'string') &&
        typeof value.name === 'string' &&
        typeof value.sku === 'string' &&
        isNullableString(value.barcode) &&
        isDecimalString(value.selling_price) &&
        (value.available_quantity === null ||
            isDecimalString(value.available_quantity)) &&
        typeof value.unit_name === 'string' &&
        typeof value.unit_short_name === 'string' &&
        Number.isInteger(value.decimal_places) &&
        typeof value.quantity === 'number' &&
        Number.isFinite(value.quantity) &&
        value.quantity > 0
    );
}

function isCoupon(value: unknown): value is PosCoupon {
    return (
        isRecord(value) &&
        typeof value.id === 'number' &&
        typeof value.name === 'string' &&
        typeof value.code === 'string' &&
        typeof value.barcode === 'string' &&
        isDecimalString(value.amount)
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isNullableString(value: unknown): value is string | null {
    return value === null || typeof value === 'string';
}

function isOptionalString(value: unknown): value is string | undefined {
    return value === undefined || typeof value === 'string';
}

function isDecimalString(value: unknown): value is string {
    return typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value);
}
