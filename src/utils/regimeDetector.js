/**
 * Regime Detection Engine
 * Calculates probabilities for 4 market regimes (A, B, C, D)
 */

import { REGIMES, getAssetClass } from '../config/regimeConfig.js';

/**
 * Regime scoring weights (must sum to 1.0)
 */
/**
 * Regime scoring weights (must sum to 1.0)
 * Aligned with the "6 Pillars of Data" in the PDF Report
 */
export const REGIME_WEIGHTS = {
    realRate: 0.15,          // Pillar 1
    debtStress: 0.20,        // Pillar 2
    bondEquityCorr: 0.15,    // Pillar 3
    cbGoldBuying: 0.10,      // Pillar 4
    inflationVol: 0.10,      // Pillar 5
    volatilityRatio: 0.30    // Pillar 6 (Most important)
};

/**
 * Sigmoid transformation for smooth scoring
 */
function sigmoid(x, k = 1, theta = 0) {
    return 1 / (1 + Math.exp(-k * (x - theta)));
}

/**
 * Score individual indicators for Regime C (Fiscal Dominance)
 * Based on PDF Report Table:
 * - Real Rates < 1.0% = Active
 * - Debt/GDP Interest > 3.0% = Stressed
 * - Bond-Equity Corr > 0 = Safe Havens Failing
 * - CB Gold Purchases = Structural Bullish
 * - Inflation Vol > 2.0 = Monetary Control Loss
 * - Vol Ratio > 1.0 = Repression Signature
 */
export function scoreIndicators(indicators) {
    const scores = {};

    // 1. Real Rate: If < 1.0%, active. Negative = Max Score.
    scores.realRate = sigmoid(-(indicators.realRate - 0.5), 2, 0);

    // 2. Debt/Fiscal: If > 3% stressed. 
    scores.debtStress = sigmoid(indicators.debtStress, 1.5, 7);

    // 3. Bond-Equity Correlation: If > 0, Safe Havens Failing
    scores.bondEquityCorr = sigmoid(indicators.bondEquityCorr, 4, 0);

    // 4. CB Gold Buying: z-score > +1 suggests structural shift
    scores.cbGoldBuying = sigmoid(indicators.cbGoldBuying, 2, 1.0);

    // 5. Inflation Volatility: If > 2.0%, suggesting loss of control
    scores.inflationVol = sigmoid(indicators.inflationVol || 0, 2, 2.0);

    // 6. Volatility Ratio: If > 1.0, Repression Signature (Weight 30%)
    scores.volatilityRatio = sigmoid(indicators.volatilityRatio, 3, 1.0);

    return scores;
}

/**
 * Calculate Regime C probability
 */
export function calculateRegimeCScore(indicators) {
    const scores = scoreIndicators(indicators);

    let totalScore = 0;
    for (const [indicator, weight] of Object.entries(REGIME_WEIGHTS)) {
        totalScore += (scores[indicator] || 0) * weight;
    }

    return Math.max(0, Math.min(1, totalScore));
}

/**
 * Calculate Regime A (Monetary Credibility) score
 * PDF Mapping Logic:
 * - Real rate percentile > 70% (Proxy: Real rate > 1.5%)
 * - Eq-bond corr < -0.3
 * - Inflation vol < growth vol (Vol ratio < 1.0)
 */
function calculateRegimeAScore(indicators) {
    const realRateScore = sigmoid(indicators.realRate - 1.5, 2, 0);
    const corrScore = sigmoid(-indicators.bondEquityCorr - 0.3, 4, 0);
    const volRatioScore = sigmoid(-(indicators.volatilityRatio - 0.9), 5, 0);

    return (realRateScore * 0.4 + corrScore * 0.3 + volRatioScore * 0.3);
}

/**
 * Calculate Regime B (Disinflationary Growth) score
 * PDF Mapping Logic:
 * - Inflation momentum < 0
 * - Growth momentum < 0
 * - Eq-bond corr < 0
 */
function calculateRegimeBScore(indicators) {
    const infMomScore = sigmoid(-(indicators.inflationMomentum || 0), 3, 0);
    const growthMomScore = sigmoid(-(indicators.growthMomentum || 0), 3, 0);
    const corrScore = sigmoid(-indicators.bondEquityCorr, 3, 0);

    return (infMomScore * 0.4 + growthMomScore * 0.3 + corrScore * 0.3);
}

/**
 * Calculate Regime D (Crisis) score
 * PDF Mapping Logic:
 * - Funding spreads explode
 * - Volatility exceeds thresholds
 * - Correlations go to 1
 */
function calculateRegimeDScore(indicators) {
    const volatilityScore = sigmoid(indicators.volatility || 0, 2, 2.0); // High z-score threshold
    const creditSpreadScore = sigmoid(indicators.creditSpread || 0, 2, 2.0);
    const correlationScore = sigmoid(indicators.bondEquityCorr, 5, 0.8); // Corr spikes near 1

    return (volatilityScore * 0.4 + creditSpreadScore * 0.3 + correlationScore * 0.3);
}

/**
 * Detect all 4 regimes
 * @param {Object} indicators - Current macro indicators
 * @returns {Object} Regime probabilities
 */
export function detectRegime(indicators) {
    const regimeCScore = calculateRegimeCScore(indicators);
    const regimeDScore = calculateRegimeDScore(indicators);
    const regimeBScore = calculateRegimeBScore(indicators);
    const regimeAScore = calculateRegimeAScore(indicators);

    // Normalize to sum to 1
    const total = (regimeAScore + regimeBScore + regimeCScore + regimeDScore) || 1;

    const probabilities = {
        REGIME_A: regimeAScore / total,
        REGIME_B: regimeBScore / total,
        REGIME_C: regimeCScore / total,
        REGIME_D: regimeDScore / total
    };

    // Determine dominant regime
    const dominant = Object.entries(probabilities)
        .sort((a, b) => b[1] - a[1])[0][0];

    return {
        probabilities,
        dominant,
        confidence: probabilities[dominant],
        indicators,
        scores: scoreIndicators(indicators)
    };
}

/**
 * Check if should exit Regime C (hysteresis logic)
 * @param {Array} historicalRegimes - Last N months of regime detections
 * @returns {boolean}
 */
export function shouldExitRegimeC(historicalRegimes, hysteresisPeriod = 3) {
    if (historicalRegimes.length < hysteresisPeriod) return false;

    const recent = historicalRegimes.slice(-hysteresisPeriod);

    // All 3 conditions must be met for sustained period
    const conditions = recent.every(r => {
        return (
            r.indicators.realRate > 1.0 &&  // Real rate > +1%
            r.indicators.bondEquityCorr < -0.2 &&  // Negative correlation restored
            r.indicators.cbGoldBuying < 0  // CB gold buying z-score < 0
        );
    });

    return conditions;
}

/**
 * Get regime-specific allocation bands
 */
export function getRegimeAllocationBands(regimeId) {
    const regime = REGIMES[regimeId];
    if (!regime || !regime.allocationBands) {
        return null;
    }
    return regime.allocationBands;
}

/**
 * Validate if portfolio adheres to regime constraints
 */
export function validateRegimeConstraints(weights, assetClassMap, regimeId) {
    const bands = getRegimeAllocationBands(regimeId);
    if (!bands) return { valid: true, violations: [] };

    // Aggregate weights by asset class
    const assetClassWeights = {};
    for (const [fundCode, weight] of Object.entries(weights)) {
        const assetClass = assetClassMap[fundCode];
        if (assetClass) {
            assetClassWeights[assetClass] = (assetClassWeights[assetClass] || 0) + weight;
        }
    }

    // Check violations
    const violations = [];
    for (const [assetClass, band] of Object.entries(bands)) {
        const weight = assetClassWeights[assetClass] || 0;

        if (weight < band.min) {
            violations.push({
                assetClass,
                type: 'below_min',
                actual: weight,
                required: band.min,
                target: band.target
            });
        }

        if (weight > band.max) {
            violations.push({
                assetClass,
                type: 'above_max',
                actual: weight,
                required: band.max,
                target: band.target
            });
        }
    }

    return {
        valid: violations.length === 0,
        violations
    };
}

/**
 * Get missing asset classes for a regime
 */
export function getMissingAssetClasses(selectedFunds, regimeId) {
    const bands = getRegimeAllocationBands(regimeId);
    if (!bands) return [];

    const requiredAssetClasses = Object.keys(bands);
    const presentAssetClasses = new Set();

    for (const fund of selectedFunds) {
        const assetClass = getAssetClassFromFund(fund);
        if (assetClass) {
            presentAssetClasses.add(assetClass);
        }
    }

    return requiredAssetClasses.filter(ac => !presentAssetClasses.has(ac));
}

/**
 * Helper to get asset class from fund
 */
function getAssetClassFromFund(fund) {
    // Use centralized logic from regimeConfig
    return getAssetClass(
        fund.sebiCategory || fund.category || '',
        fund.name || fund.schemeName || ''
    );
}

export default {
    detectRegime,
    calculateRegimeCScore,
    scoreIndicators,
    shouldExitRegimeC,
    getRegimeAllocationBands,
    validateRegimeConstraints,
    getMissingAssetClasses
};
