/**
 * Indian Expression Layer
 * Translates global regime probabilities into India-specific portfolio adjustments
 * 
 * Architecture:
 * GLOBAL REGIME (US/FRED) → REGIME PROBABILITIES → INDIAN EXPRESSION → OPTIMIZER
 */

/**
 * Express regime in Indian context
 * @param {string} dominantRegime - 'REGIME_A', 'REGIME_B', 'REGIME_C', or 'REGIME_D'
 * @param {Object} indianMacroData - Latest Indian macro indicators
 * @returns {Object} Indian-specific portfolio adjustments
 */
export function expressRegimeInIndia(dominantRegime, indianMacroData) {
    const {
        repoRate = 6.5,
        cpiInflation = 5.0,
        gdpGrowth = 6.5,
        bankCredit = 12.0,
        gSecYield = 7.0,
        forexReserves = 600,
        inrUsd = 83.0,
        realRate = 1.5
    } = indianMacroData || {};

    // Calculate derived Indian metrics
    const systemLiquidity = estimateSystemLiquidity(forexReserves, bankCredit);
    const isLiquidityTight = systemLiquidity < 0;
    const nominalGDP = gdpGrowth + cpiInflation; // Approximation

    let expression = {
        equityBias: 'NEUTRAL',      // LARGE_CAP, MID_CAP, SMALL_CAP, QUALITY, NEUTRAL
        debtStrategy: 'BALANCED',    // SHORT_DURATION, ACCRUAL, DURATION, BALANCED
        qualityBias: false,          //  Apply quality filter
        durationPreference: 'MEDIUM', // SHORT, MEDIUM, LONG
        liquidityPenalty: false      // Penalize leverage/small caps
    };

    switch (dominantRegime) {
        case 'REGIME_A': // Monetary Credibility (India)
            expression = {
                equityBias: 'LARGE_CAP',      // RBI conservative → large caps preferred
                debtStrategy: 'DURATION',      // Long bonds viable
                qualityBias: false,
                durationPreference: 'LONG',
                liquidityPenalty: isLiquidityTight
            };
            break;

        case 'REGIME_B': // Disinflationary Growth (India)
            expression = {
                equityBias: 'NEUTRAL',         // Broad participation
                debtStrategy: 'ACCRUAL',       // Accrual + duration sweet spot
                qualityBias: false,
                durationPreference: 'MEDIUM',
                liquidityPenalty: false
            };
            break;

        case 'REGIME_C': // Fiscal Dominance (India)
            expression = {
                equityBias: 'QUALITY',         // Quality bias critical
                debtStrategy: 'SHORT_DURATION', // Duration risky, accrual > duration
                qualityBias: true,              // Filter for quality stocks
                durationPreference: 'SHORT',    // Avoid long duration
                liquidityPenalty: isLiquidityTight
            };
            break;

        case 'REGIME_D': // Crisis (India)
            expression = {
                equityBias: 'LARGE_CAP',       // Large caps relatively resilient
                debtStrategy: 'SHORT_DURATION', // Only highest quality, short duration
                qualityBias: true,
                durationPreference: 'SHORT',
                liquidityPenalty: true          // Always tight during crisis
            };
            break;
    }

    return {
        regime: dominantRegime,
        expression,
        indianContext: {
            nominalGDP,
            systemLiquidity,
            isLiquidityTight,
            realRate
        }
    };
}

/**
 * Estimate system liquidity based on available data
 * Positive = surplus, Negative = deficit
 */
function estimateSystemLiquidity(forexReserves, bankCredit) {
    // Simplified proxy: High forex + high credit growth = positive liquidity
    // This is a rough estimate - ideally use RBI's actual system liquidity data
    const forexScore = (forexReserves - 500) / 100; // Normalized around $500B
    const creditScore = (bankCredit - 12) / 5;       // Normalized around 12% growth

    return (forexScore + creditScore) / 2;
}

/**
 * Get equity allocation bias within regime constraints
 * @param {string} dominantRegime
 * @param {Object} indianMacroData
 * @returns {Object} Equity allocation preferences
 */
export function getIndianEquityBias(dominantRegime, indianMacroData) {
    const { expression } = expressRegimeInIndia(dominantRegime, indianMacroData);

    const biases = {
        'LARGE_CAP': {
            largeCap: 1.2,    // Overweight by 20%
            midCap: 0.8,      // Underweight by 20%
            smallCap: 0.6     // Underweight by 40%
        },
        'MID_CAP': {
            largeCap: 0.9,
            midCap: 1.3,
            smallCap: 1.1
        },
        'SMALL_CAP': {
            largeCap: 0.8,
            midCap: 1.1,
            smallCap: 1.4
        },
        'QUALITY': {
            largeCap: 1.3,    // Strong quality bias to large caps
            midCap: 0.9,
            smallCap: 0.5     // Heavily penalize small caps
        },
        'NEUTRAL': {
            largeCap: 1.0,
            midCap: 1.0,
            smallCap: 1.0
        }
    };

    return biases[expression.equityBias] || biases.NEUTRAL;
}

/**
 * Get debt allocation strategy
 * @param {string} dominantRegime
 * @param {Object} indianMacroData
 * @returns {Object} Debt duration preferences
 */
export function getIndianDebtStrategy(dominantRegime, indianMacroData) {
    const { expression } = expressRegimeInIndia(dominantRegime, indianMacroData);

    const strategies = {
        'SHORT_DURATION': {
            short: 1.5,       // Heavily favor short duration
            medium: 0.8,
            long: 0.3         // Avoid long duration
        },
        'ACCRUAL': {
            short: 0.9,
            medium: 1.3,      // Favor medium for accrual
            long: 0.8
        },
        'DURATION': {
            short: 0.7,
            medium: 1.0,
            long: 1.4         // Favor long duration
        },
        'BALANCED': {
            short: 1.0,
            medium: 1.0,
            long: 1.0
        }
    };

    return strategies[expression.debtStrategy] || strategies.BALANCED;
}

/**
 * Apply liquidity constraints to weights
 * Penalize leverage and small caps when liquidity is tight
 */
export function applyLiquidityConstraints(weights, fundCategories, liquidityPenalty = false) {
    if (!liquidityPenalty) return weights;

    const adjusted = { ...weights };

    for (const [fundCode, weight] of Object.entries(weights)) {
        const category = fundCategories[fundCode];

        // Penalize small caps by 30% when liquidity tight
        if (category?.includes('Small Cap')) {
            adjusted[fundCode] = weight * 0.7;
        }

        // Penalize mid caps by 15%
        if (category?.includes('Mid Cap')) {
            adjusted[fundCode] = weight * 0.85;
        }
    }

    // Renormalize to sum to 1
    const total = Object.values(adjusted).reduce((sum, w) => sum + w, 0);
    if (total > 0) {
        for (const fundCode in adjusted) {
            adjusted[fundCode] /= total;
        }
    }

    return adjusted;
}

export default {
    expressRegimeInIndia,
    getIndianEquityBias,
    getIndianDebtStrategy,
    applyLiquidityConstraints
};
