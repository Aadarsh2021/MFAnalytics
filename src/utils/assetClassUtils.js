import { getAssetClass } from '../config/regimeConfig.js';

/**
 * Asset Class Utilities
 * Helper functions for mapping funds to asset classes and aggregating weights
 */

/**
 * Map funds to their asset classes
 * @param {Array} funds - Array of fund objects with sebiCategory
 * @returns {Object} - Map of fundCode -> assetClass
 */
export function mapFundsToAssetClasses(funds) {
    const fundAssetMap = {};

    funds.forEach(fund => {
        const name = fund.name || fund.schemeName || '';
        const subCategory = fund.sebiCategory?.split(' - ')[1]?.trim() || '';
        const assetClass = getAssetClass(subCategory, name);
        fundAssetMap[fund.code || fund.schemeCode] = assetClass;
    });

    return fundAssetMap;
}

/**
 * Calculate asset class weights from individual fund weights
 * @param {Object} weights - Map of fundCode -> weight
 * @param {Object} fundAssetMap - Map of fundCode -> assetClass
 * @returns {Object} - Map of assetClass -> totalWeight
 */
export function calculateAssetClassWeights(weights, fundAssetMap) {
    const assetClassWeights = {
        EQUITY: 0,
        HYBRID: 0,
        DEBT_MEDIUM: 0,
        DEBT_SHORT: 0,
        GOLD: 0
    };

    Object.entries(weights).forEach(([fundCode, weight]) => {
        const assetClass = fundAssetMap[fundCode];
        if (assetClass && assetClassWeights.hasOwnProperty(assetClass)) {
            assetClassWeights[assetClass] += weight;
        }
    });

    return assetClassWeights;
}

/**
 * Validate portfolio weights against regime allocation bands
 * @param {Object} assetClassWeights - Map of assetClass -> weight
 * @param {Object} regime - Regime object with allocationBands
 * @returns {Object} - { valid: boolean, violations: Array }
 */
export function validateAgainstBands(assetClassWeights, regime) {
    if (!regime.allocationBands) {
        return { valid: true, violations: [] };
    }

    const violations = [];

    Object.entries(regime.allocationBands).forEach(([assetClass, band]) => {
        const weight = assetClassWeights[assetClass] || 0;

        if (weight < band.min) {
            violations.push({
                assetClass,
                type: 'below_min',
                actual: weight,
                min: band.min,
                max: band.max,
                target: band.target
            });
        }

        if (weight > band.max) {
            violations.push({
                assetClass,
                type: 'above_max',
                actual: weight,
                min: band.min,
                max: band.max,
                target: band.target
            });
        }
    });

    return {
        valid: violations.length === 0,
        violations
    };
}

/**
 * Get asset class name for display
 */
export function getAssetClassName(assetClass) {
    const names = {
        EQUITY: 'Pure Equities',
        HYBRID: 'Hybrid Funds',
        DEBT_MEDIUM: 'Medium/Dynamic Debt',
        DEBT_SHORT: 'Short Duration/Cash',
        GOLD: 'Gold'
    };
    return names[assetClass] || assetClass;
}

/**
 * Get asset class color for charts
 */
export function getAssetClassColor(assetClass) {
    const colors = {
        EQUITY: '#3B82F6', // Blue
        HYBRID: '#8B5CF6', // Purple
        DEBT_MEDIUM: '#10B981', // Green
        DEBT_SHORT: '#06B6D4', // Cyan
        GOLD: '#F59E0B' // Amber
    };
    return colors[assetClass] || '#6B7280';
}

export default {
    mapFundsToAssetClasses,
    calculateAssetClassWeights,
    validateAgainstBands,
    getAssetClassName,
    getAssetClassColor
};
