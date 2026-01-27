/**
 * Regime Sanity Checks
 * Validates regime detection engine against historical scenarios specified in PDFs
 */

import { detectRegime } from './regimeDetector.js';

export const SCENARIOS = [
    {
        name: 'Late 1970s (Fiscal Dominance)',
        expectedRegime: 'REGIME_C',
        indicators: {
            realRate: -2.0,          // Negative raw real rate
            debtStress: 10.0,        // High raw yield (%)
            bondEquityCorr: 0.4,     // Positive correlation
            cbGoldBuying: 2.0,       // High gold buying (z-score)
            inflationVol: 3.5,       // High inflation vol
            volatilityRatio: 2.2,    // High vol ratio
            volatility: 0.5,
            creditSpread: 0.5
        }
    },
    {
        name: '2008 Financial Crisis (Crisis Spike)',
        expectedRegime: 'REGIME_D',
        indicators: {
            realRate: 0.5,
            debtStress: 4.5,
            bondEquityCorr: 0.9,
            cbGoldBuying: 0.0,
            inflationVol: 1.0,
            volatilityRatio: 1.0,
            volatility: 4.5,         // Huge volatility (z-score)
            creditSpread: 4.0        // Huge spread (z-score)
        }
    },
    {
        name: '2010-2013 (European Debt Crisis / Post-GFC)',
        expectedRegime: 'REGIME_C',
        indicators: {
            realRate: 0.2,           // Rates capped near zero
            debtStress: 8.0,         // Debt stress high
            bondEquityCorr: 0.2,     // Correlation rising
            cbGoldBuying: 1.5,
            inflationVol: 2.5,       // Added missing vol
            volatilityRatio: 1.5,
            volatility: 0.5,
            creditSpread: 1.0
        }
    },
    {
        name: 'Late 1990s (Disinflationary Growth)',
        expectedRegime: 'REGIME_B',
        indicators: {
            realRate: 2.5,
            debtStress: 6.0,
            bondEquityCorr: -0.4,
            inflationMomentum: -0.8, // Falling inflation
            growthMomentum: -0.5,    // Falling (but positive) growth momentum
            inflationVol: 0.5,
            volatilityRatio: 0.8,
            volatility: -0.5,
            creditSpread: -0.5
        }
    },
    {
        name: '2017-2019 (Normal / Monetary Credibility)',
        expectedRegime: 'REGIME_A',
        indicators: {
            realRate: 2.0,           // Positive real rates (> 1.5%)
            debtStress: 4.0,         // Normal yield
            bondEquityCorr: -0.5,    // Strong hedge
            volatilityRatio: 0.7,    // Vol ratio < 1.0
            volatility: -1.0,
            creditSpread: -1.0
        }
    },
    {
        name: '2020 COVID Shock (Crisis → C Transition)',
        expectedRegime: 'REGIME_D',
        indicators: {
            realRate: -0.5,
            debtStress: 2.5,
            bondEquityCorr: 0.8,
            cbGoldBuying: 0.5,
            volatilityRatio: 1.2,
            volatility: 5.0,
            creditSpread: 3.5
        }
    },
    {
        name: '2022-2025 (Inflation / Fiscal Repression)',
        expectedRegime: 'REGIME_C',
        indicators: {
            realRate: -1.0,          // Negative real rates
            debtStress: 9.0,         // Yields rising but capped below inflation
            bondEquityCorr: 0.6,     // Hedge broken
            cbGoldBuying: 2.5,       // Record gold buying
            inflationVol: 4.5,       // High inflation vol
            volatilityRatio: 2.8,    // High vol ratio
            volatility: 1.0,
            creditSpread: 1.0
        }
    }
];

/**
 * Run all sanity checks
 */
export function runRegimeSanityChecks() {
    const results = [];
    let passedCount = 0;

    for (const scenario of SCENARIOS) {
        const detection = detectRegime(scenario.indicators);
        const passed = detection.dominant === scenario.expectedRegime;

        if (passed) passedCount++;

        results.push({
            scenario: scenario.name,
            expected: scenario.expectedRegime,
            actual: detection.dominant,
            passed,
            probabilities: detection.probabilities
        });
    }

    return {
        overallPassed: passedCount === SCENARIOS.length,
        passedCount,
        totalCount: SCENARIOS.length,
        results
    };
}

export default {
    SCENARIOS,
    runRegimeSanityChecks
};
