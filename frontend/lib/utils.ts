/**
 * Formatting utilities for numbers and percentages
 */

export function formatPercent(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
}

export function formatLargeNumber(value: number): string {
    if (value >= 10000000) {
        return `₹${(value / 10000000).toFixed(2)} Cr`;
    } else if (value >= 100000) {
        return `₹${(value / 100000).toFixed(2)} L`;
    } else if (value >= 1000) {
        return `₹${(value / 1000).toFixed(2)} K`;
    }
    return `₹${value.toFixed(0)}`;
}

export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}
