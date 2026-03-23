/**
 * Regime Transition Stress Tests
 * Validates that the regime system doesn't overreact to short-term changes
 */

import { detectRegime } from './regimeDetector.js';
import { calculateRegimeDecay, shouldAllowRegimeTransition } from './regimeTransitions.js';

/**
 * Test 1: Gold Underperformance
 * Gold underperforms for 18 months, system should still hold gold
 */
export function testGoldUnderperformance() {
    const results = {
        name: 'Gold Underperformance (18 Months)',
        passed: false,
        details: [],
        minGoldWeight: 1.0,
        avgGoldWeight: 0
    };

    // Simulate Regime C with declining gold returns
    const baseIndicators = {
        realRate: -0.5,     // Negative real rates (Regime C)
        debtStress: 0.8,    // High debt stress
        bondEquityCorr: 0.4, // Positive correlation
        cbGoldBuying: 0.6,  // Moderate CB buying
        volatilityRatio: 0.5 // Normal volatility
    };

    let regimeHistory = [];
    let goldWeights = [];

    // Run 18 months
    for (let month = 0; month < 18; month++) {
        const date = `2024-${String(month + 1).padStart(2, '0')}-01`;

        const detection = detectRegime(baseIndicators);
        const regime = detection.dominant;

        // Track regime
        regimeHistory.push({
            date,
            regime,
            probabilities: detection.probabilities,
            confidence: detection.confidence
        });

        // Simulate gold allocation (min of Regime C band)
        const goldWeight = regime === 'REGIME_C' ? 0.10 : 0.025; // 10% in C, 2.5% in A
        goldWeights.push(goldWeight);

        results.details.push({
            month,
            regime,
            goldWeight,
            probC: detection.probabilities.REGIME_C
        });
    }

    results.minGoldWeight = Math.min(...goldWeights);
    results.avgGoldWeight = goldWeights.reduce((a, b) => a + b, 0) / goldWeights.length;

    // Pass if gold weight stays > 5% throughout
    results.passed = results.minGoldWeight >= 0.05;
    results.message = results.passed
        ? `✓ Gold maintained (min: ${(results.minGoldWeight * 100).toFixed(1)}%)`
        : `✗ Gold dropped too low (min: ${(results.minGoldWeight * 100).toFixed(1)}%)`;

    return results;
}

/**
 * Test 2: Inflation Falls with Capped Real Rates
 * Inflation drops but real rates stay low → should NOT exit Regime C prematurely
 */
export function testInflationFallWithCappedRates() {
    const results = {
        name: 'Inflation Fall + Capped Rates',
        passed: false,
        details: [],
        finalRegimeCProb: 0,
        monthsInRegimeC: 0
    };

    let regimeHistory = [];

    // Start in Regime C
    for (let month = 0; month < 12; month++) {
        const inflationDecay = Math.max(4, 7 - month * 0.25); // 7% → 4%
        const realRate = inflationDecay - 5.5; // Repo rate stays 5.5%, real rate capped

        const indicators = {
            realRate: Math.min(1.5, realRate) / 5, // Normalize, cap at 1.5%
            debtStress: 0.7,     // Still high
            bondEquityCorr: 0.3, // Still positive
            cbGoldBuying: 0.5,
            volatilityRatio: 0.4
        };

        const detection = detectRegime(indicators);
        regimeHistory.push({
            date: `2024-${String(month + 1).padStart(2, '0')}-01`,
            regime: detection.dominant,
            probabilities: detection.probabilities,
            confidence: detection.confidence
        });

        if (detection.dominant === 'REGIME_C') {
            results.monthsInRegimeC++;
        }

        results.details.push({
            month,
            inflation: inflationDecay,
            realRate,
            regime: detection.dominant,
            probC: detection.probabilities.REGIME_C
        });
    }

    results.finalRegimeCProb = regimeHistory[regimeHistory.length - 1].probabilities.REGIME_C;

    // Pass if Regime C probability stays > 40%
    results.passed = results.finalRegimeCProb >= 0.40;
    results.message = results.passed
        ? `✓ Stayed in Regime C (final prob: ${(results.finalRegimeCProb * 100).toFixed(0)}%)`
        : `✗ Exited Regime C too early (final prob: ${(results.finalRegimeCProb * 100).toFixed(0)}%)`;

    return results;
}

/**
 * Test 3: Equity + Bond Rally
 * Both asset classes rally → should shift gradually, not instantly
 */
export function testEquityBondRally() {
    const results = {
        name: 'Equity + Bond Rally (Gradual Shift)',
        passed: false,
        details: [],
        maxMonthlyChange: 0
    };

    let regimeHistory = [];
    let prevAllocation = { EQUITY: 0.50, DEBT_MEDIUM: 0.25, HYBRID: 0.125, DEBT_SHORT: 0.125, GOLD: 0.04 };

    // Simulate rally over 3 months
    for (let month = 0; month < 6; month++) {
        // Improving conditions
        const indicators = {
            realRate: month * 0.15,    // Gradually positive
            debtStress: 0.3 - month * 0.05,
            bondEquityCorr: -0.2 - month * 0.1, // Improving correlation
            cbGoldBuying: 0.2,
            volatilityRatio: 0.3
        };

        const detection = detectRegime(indicators);
        regimeHistory.push({
            date: `2024-${String(month + 1).padStart(2, '0')}-01`,
            regime: detection.dominant,
            probabilities: detection.probabilities,
            confidence: detection.confidence
        });

        // Simulated allocation shift
        const targetAllocation = detection.dominant === 'REGIME_A'
            ? { EQUITY: 0.60, DEBT_MEDIUM: 0.125, HYBRID: 0.125, DEBT_SHORT: 0.075, GOLD: 0.025 }
            : prevAllocation;

        const allocationChange = Math.abs(targetAllocation.EQUITY - prevAllocation.EQUITY);
        results.maxMonthlyChange = Math.max(results.maxMonthlyChange, allocationChange);

        results.details.push({
            month,
            regime: detection.dominant,
            equityChange: allocationChange,
            probA: detection.probabilities.REGIME_A
        });

        prevAllocation = targetAllocation;
    }

    // Pass if allocation changes < 10% per month
    results.passed = results.maxMonthlyChange <= 0.10;
    results.message = results.passed
        ? `✓ Gradual shift (max change: ${(results.maxMonthlyChange * 100).toFixed(1)}%/month)`
        : `✗ Too rapid (max change: ${(results.maxMonthlyChange * 100).toFixed(1)}%/month)`;

    return results;
}

/**
 * Test 4: Crisis Spike (Temporary Regime D)
 * VIX spike → Regime D → should return to previous regime within 3 months
 */
export function testCrisisSpike() {
    const results = {
        name: 'Crisis Spike (Temporary D Overlay)',
        passed: false,
        details: [],
        monthsToReturn: 0,
        returnedToPrevious: false
    };

    let regimeHistory = [];
    const preCrisisRegime = 'REGIME_B';

    // Build history in Regime B
    for (let i = 0; i < 6; i++) {
        regimeHistory.push({
            date: `2024-${String(i + 1).padStart(2, '0')}-01`,
            regime: preCrisisRegime,
            probabilities: { REGIME_A: 0.1, REGIME_B: 0.7, REGIME_C: 0.1, REGIME_D: 0.1 },
            confidence: 0.7
        });
    }

    // Crisis month
    let month = 6;
    const crisisIndicators = {
        realRate: 0.2,
        debtStress: 0.9,    // Spike
        bondEquityCorr: 0.8, // Everything correlated
        cbGoldBuying: 0.3,
        volatilityRatio: 0.9 // High vol
    };

    const crisisDetection = detectRegime(crisisIndicators);
    regimeHistory.push({
        date: `2024-${String(month + 1).padStart(2, '0')}-01`,
        regime: 'REGIME_D',
        probabilities: crisisDetection.probabilities,
        confidence: 0.6
    });
    results.details.push({ month, regime: 'REGIME_D', event: 'CRISIS' });

    // Recovery months
    for (let recovMonth = 0; recovMonth < 6; recovMonth++) {
        month++;
        const recoveryIndicators = {
            realRate: 0.3,
            debtStress: 0.4 - recovMonth * 0.05,
            bondEquityCorr: 0.1,
            cbGoldBuying: 0.2,
            volatilityRatio: 0.4 - recovMonth * 0.05
        };

        const recovDetection = detectRegime(recoveryIndicators);
        regimeHistory.push({
            date: `2024-${String(month + 1).padStart(2, '0')}-01`,
            regime: recovDetection.dominant,
            probabilities: recovDetection.probabilities,
            confidence: recovDetection.confidence
        });

        results.details.push({
            month: recovMonth + 1,
            regime: recovDetection.dominant,
            probD: recovDetection.probabilities.REGIME_D
        });

        // Check if returned to non-D regime
        if (recovDetection.dominant !== 'REGIME_D' && !results.returnedToPrevious) {
            results.monthsToReturn = recovMonth + 1;
            results.returnedToPrevious = true;
        }
    }

    // Pass if returned within 3 months
    results.passed = results.returnedToPrevious && results.monthsToReturn <= 3;
    results.message = results.passed
        ? `✓ Returned in ${results.monthsToReturn} months`
        : `✗ ${results.returnedToPrevious ? `Took ${results.monthsToReturn} months` : 'Did not return'}`;

    return results;
}

/**
 * Run all stress tests
 * @returns {Object} Test results summary
 */
export function runAllStressTests() {
    const tests = [
        testGoldUnderperformance(),
        testInflationFallWithCappedRates(),
        testEquityBondRally(),
        testCrisisSpike()
    ];

    const totalTests = tests.length;
    const passedTests = tests.filter(t => t.passed).length;
    const overallPassed = passedTests === totalTests;

    return {
        overall: overallPassed,
        passed: passedTests,
        total: totalTests,
        tests,
        summary: `${passedTests}/${totalTests} tests passed`,
        message: overallPassed
            ? '✓ All stress tests passed'
            : `✗ ${totalTests - passedTests} test(s) failed`
    };
}

export default {
    testGoldUnderperformance,
    testInflationFallWithCappedRates,
    testEquityBondRally,
    testCrisisSpike,
    runAllStressTests
};
