
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * Format number to IDR Currency
 */
export const formatCurrency = (amount: number | string | undefined | null): string => {
    if (amount === undefined || amount === null) return 'Rp 0';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return 'Rp 0';

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(num);
};

/**
 * Clean currency string to number (for inputs)
 * Handles: "Rp 1.000.000", "1.000.000,50", etc.
 */
export const parseCurrency = (value: string | number | undefined | null): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;

    const clean = value
        .replace(/Rp/g, '')       // Hapus Rp
        .replace(/\./g, '')       // Hapus titik (ribuan)
        .replace(/ /g, '')        // Hapus spasi
        .replace(/,/g, '.');      // Ubah koma ke titik (desimal)

    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
};

/**
 * Just get numeric characters (for phone numbers, etc)
 */
export const toNumeric = (value: string): string => {
    return value.replace(/\D/g, "");
};

/**
 * Format number with thousand separators (No Rp)
 * Useful for inputs that are being typed
 */
export const formatNumber = (num: number | string): string => {
    const val = typeof num === 'string' ? parseCurrency(num) : num;
    return new Intl.NumberFormat('id-ID').format(val);
};

/**
 * Format Date to Indonesian format
 * Example: 30 Januari 2026
 */
export const formatDate = (date: Date | string | number | undefined | null, pattern: string = 'dd MMMM yyyy'): string => {
    if (!date) return '-';
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return format(d, pattern, { locale: id });
};

/**
 * Format Time to HH:mm
 */
export const formatTime = (date: Date | string | undefined | null): string => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'HH:mm');
};

/**
 * Capitalize first letter
 */
export const capitalize = (str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
