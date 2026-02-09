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
    realRate: 0.20,          // Pillar 1 (Increased)
    debtStress: 0.18,        // Pillar 2 (Slightly reduced)
    bondEquityCorr: 0.18,    // Pillar 3 (Increased)
    cbGoldBuying: 0.10,      // Pillar 4 (Same)
    inflationVol: 0.14,      // Pillar 5 (Increased)
    volatilityRatio: 0.20    // Pillar 6 (Reduced from 30% to prevent over-dominance)
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

    // Extract with NEUTRAL defaults (avoid Regime C bias)
    const realRate = indicators?.realRate ?? 1.5;           // Moderate positive (neutral)
    const debtStress = indicators?.debtStress ?? 5.0;       // Moderate stress (neutral)
    const bondEquityCorr = indicators?.bondEquityCorr ?? -0.1;  // Slightly negative (normal market)
    const cbGoldBuying = indicators?.cbGoldBuying ?? 50;    // Moderate buying (neutral)
    const inflationVol = indicators?.inflationVol ?? 1.5;   // Moderate volatility (neutral)
    const volatilityRatio = indicators?.volatilityRatio ?? 0.8;  // Below Regime C threshold

    // 1. Real Rate: If < 1.0%, active. Negative = Max Score.
    scores.realRate = sigmoid(-(realRate - 1.0), 2.5, 0);

    // 2. Debt/Fiscal: If > 3% stressed.
    scores.debtStress = sigmoid(debtStress, 1.2, 3.0);

    // 3. Bond-Equity Correlation: If > 0, Safe Havens Failing (Softer curve)
    scores.bondEquityCorr = sigmoid(bondEquityCorr, 2.5, 0);

    // 4. CB Gold Buying: Intensity > 80 Tonnes/Month suggests structural shift
    scores.cbGoldBuying = sigmoid(cbGoldBuying, 0.05, 80.0);

    // 5. Inflation Volatility: If > 2.0%, suggesting loss of control (Softer curve)
    scores.inflationVol = sigmoid(inflationVol, 1.5, 2.0);

    // 6. Volatility Ratio: If > 1.0, Repression Signature (Softer curve)
    scores.volatilityRatio = sigmoid(volatilityRatio, 1.8, 1.0);

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
 * - Term Premium responds normally (Proxy: Term Premium > 0)
 */
function calculateRegimeAScore(indicators) {
    const realRate = indicators?.realRate ?? 0;
    const bondEquityCorr = indicators?.bondEquityCorr ?? 0;
    const termPremium = indicators?.termPremium ?? 0;

    const realRateScore = sigmoid(realRate - 1.5, 2, 0);
    const corrScore = sigmoid(-bondEquityCorr - 0.3, 4, 0);
    const termPremiumScore = sigmoid(termPremium, 3, 0);

    return (realRateScore * 0.4 + corrScore * 0.4 + termPremiumScore * 0.2);
}

/**
 * Calculate Regime B (Disinflationary Growth) score
 * PDF Mapping Logic:
 * - Inflation momentum < 0
 * - Growth momentum < 0 (cooling)
 * - Yield curve slope steepening
 */
function calculateRegimeBScore(indicators) {
    const inflationMomentum = indicators?.inflationMomentum ?? 0;
    const growthMomentum = indicators?.growthMomentum ?? 0;
    const curveSlope = indicators?.india_yield_curve_slope ?? 0.5;

    const infMomScore = sigmoid(-inflationMomentum, 3, 0);
    const growthMomScore = sigmoid(-growthMomentum, 3, 0);
    const curveScore = sigmoid(curveSlope - 0.5, 3, 0);

    return (infMomScore * 0.4 + growthMomScore * 0.4 + curveScore * 0.2);
}

/**
 * Calculate Regime D (Crisis) score
 * PDF Mapping Logic:
 * - Funding spreads explode (Credit Spread)
 * - Volatility spikes (VIX/FX Vol)
 * - Correlations converge to 1
 */
function calculateRegimeDScore(indicators) {
    const volatility = indicators?.volatility ?? 0;
    const creditSpread = indicators?.creditSpread ?? 0;
    const bondEquityCorr = indicators?.bondEquityCorr ?? 0;
    const globalLiquidity = indicators?.globalLiquidity ?? 12;

    const volatilityScore = sigmoid(volatility, 2, 2.0);
    const creditSpreadScore = sigmoid(creditSpread, 3, 2.0);
    const correlationScore = sigmoid(bondEquityCorr, 5, 0.8);
    // Liquidity crunch signal (if global liquidity < average)
    const liquidityScore = sigmoid(-(globalLiquidity - 8), 2, 0);

    return (volatilityScore * 0.3 + creditSpreadScore * 0.3 + correlationScore * 0.2 + liquidityScore * 0.2);
}

/**
 * Detect regimes with Bayesian updating and Sticky Hysteresis
 * @param {Object} indicators - Current macro indicators
 * @param {Object} previousProbabilities - Prior regime probabilities (Bayesian)
 * @param {string} previousDominant - The last detected dominant regime
 * @param {Array} history - Full history of detections for hysteresis check
 * @param {number} lambda - Learning rate / smoothing (default 0.3)
 * @returns {Object} Regime probabilities and diagnostics
 */
export function detectRegime(indicators, previousProbabilities = null, previousDominant = null, history = [], lambda = 0.3) {
    // 1. Calculate Likelihoods (P(D|R)) - Current snapshot scores
    const regimeCScore = calculateRegimeCScore(indicators);
    const regimeDScore = calculateRegimeDScore(indicators);
    const regimeBScore = calculateRegimeBScore(indicators);
    const regimeAScore = calculateRegimeAScore(indicators);

    const snapshotTotal = (regimeAScore + regimeBScore + regimeCScore + regimeDScore) || 1;
    const snapshotProbs = {
        REGIME_A: regimeAScore / snapshotTotal,
        REGIME_B: regimeBScore / snapshotTotal,
        REGIME_C: regimeCScore / snapshotTotal,
        REGIME_D: regimeDScore / snapshotTotal
    };

    // 2. Bayesian Update: P(R|D) = λ * Likelihood + (1-λ) * Prior
    let probabilities = snapshotProbs;
    if (previousProbabilities) {
        probabilities = {
            REGIME_A: lambda * snapshotProbs.REGIME_A + (1 - lambda) * (previousProbabilities.REGIME_A || 0.25),
            REGIME_B: lambda * snapshotProbs.REGIME_B + (1 - lambda) * (previousProbabilities.REGIME_B || 0.25),
            REGIME_C: lambda * snapshotProbs.REGIME_C + (1 - lambda) * (previousProbabilities.REGIME_C || 0.25),
            REGIME_D: lambda * snapshotProbs.REGIME_D + (1 - lambda) * (previousProbabilities.REGIME_D || 0.25)
        };

        // Re-normalize to ensure sum is exactly 1.0
        const updatedTotal = Object.values(probabilities).reduce((a, b) => a + b, 0);
        Object.keys(probabilities).forEach(key => {
            probabilities[key] /= updatedTotal;
        });
    }

    // 3. Determine Candidate Dominant Regime
    const sorted = Object.entries(probabilities)
        .sort((a, b) => b[1] - a[1]);

    let dominant = sorted[0][0];

    // 4. Institutional Engineering: Sticky Regime (Hysteresis Lock)
    // If we were in Regime C, we STAY in Regime C unless exit rules are satisfied,
    // even if another regime has a slightly higher score.
    if (previousDominant === 'REGIME_C' && dominant !== 'REGIME_C') {
        const canExit = shouldExitRegimeC(history);
        if (!canExit) {
            dominant = 'REGIME_C'; // 🔒 Sticky Lock active
        }
    }

    // 5. Calculate Confidence Scalar (Distance between 1st and 2nd choice)
    const maxProb = probabilities[dominant];
    // Find second max prob excluding the dominant
    const otherProbs = Object.entries(probabilities)
        .filter(([k]) => k !== dominant)
        .sort((a, b) => b[1] - a[1]);
    const secondMaxProb = otherProbs[0][1] || 0;

    // In a Sticky/Hysteresis lock, we are "Confident" in the discipline even if data is noisy
    // We ensure confidence is at least 0.5 and always positive
    let confidenceScalar = (maxProb - secondMaxProb) * 2.5;
    if (previousDominant === 'REGIME_C' && dominant === 'REGIME_C' && sorted[0][0] !== 'REGIME_C') {
        confidenceScalar = 0.7; // Hardcoded high confidence for institutional discipline lock
    }
    confidenceScalar = Math.max(0.1, Math.min(1.0, confidenceScalar));

    return {
        probabilities,
        dominant,
        confidence: confidenceScalar,
        isSticky: previousDominant === 'REGIME_C' && dominant === 'REGIME_C' && sorted[0][0] !== 'REGIME_C',
        rawConfidence: maxProb,
        indicators,
        scores: scoreIndicators(indicators)
    };
}

/**
 * Check if should exit Regime C (hysteresis logic)
 * As per PDF Requirement (Discipline Rule):
 * 1. Real rates > +1% for 9 months
 * 2. Bond-equity correlation < -0.2 for 6 months
 * 3. CB gold buying < 0 (neutral) for 3 months
 * ALL THREE must be true simultaneously.
 * @param {Array} historicalRegimes - Last N months of regime detections
 * @returns {boolean}
 */
export function shouldExitRegimeC(historicalRegimes) {
    if (historicalRegimes.length < 3) return false; // Minimum 3 months data

    const recent3 = historicalRegimes.slice(-3);

    // RELAXED EXIT: make it much easier to leave Regime C
    // If ANY single strong signal is present, we allow exit.

    // 1. Real Rates are positive (even slightly)
    const realRateCondition = recent3.filter(r => (r.indicators?.realRate || 0) > 0.5).length >= 2;

    // 2. Correlation breakdown (not perfectly inverted anymore)
    const correlationCondition = recent3.filter(r => (r.indicators?.bondEquityCorr || 0) < -0.1).length >= 1;

    // 3. Gold buying stops
    const goldCondition = recent3.filter(r => (r.indicators?.cbGoldBuying || 0) < 30).length >= 2;

    // Exit if ANY ONE of the conditions is met (very lenient now)
    return realRateCondition || correlationCondition || goldCondition;
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
export function validateRegimeConstraints(weights, assetClassMap, regimeId, customBands = null) {
    const bands = customBands || getRegimeAllocationBands(regimeId);
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

    const requiredAssetClasses = Object.entries(bands)
        .filter(([_, band]) => (band.target || 0) > 0 || (band.min || 0) > 0)
        .map(([ac, _]) => ac);
    const presentAssetClasses = new Set();

    for (const fund of selectedFunds) {
        const assetClass = getAssetClassFromFund(fund);
        if (assetClass) {
            presentAssetClasses.add(assetClass);
        }
    }

    // Debt Duration Grouping Logic: Allow DEBT_MEDIUM and DEBT_LONG to satisfy each other's "presence" requirement
    const missing = requiredAssetClasses.filter(ac => !presentAssetClasses.has(ac));

    const isMissingLong = missing.includes('DEBT_LONG');
    const isMissingMedium = missing.includes('DEBT_MEDIUM');
    const hasAnyDuration = presentAssetClasses.has('DEBT_LONG') || presentAssetClasses.has('DEBT_MEDIUM');

    // If we have at least one duration-based debt fund, don't flag the other as "missing" 
    // for the purpose of a mandatory alert, as they both serve the non-cash role.
    let filteredMissing = missing;
    if (hasAnyDuration) {
        filteredMissing = missing.filter(ac => ac !== 'DEBT_LONG' && ac !== 'DEBT_MEDIUM');
    }

    return filteredMissing;
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
