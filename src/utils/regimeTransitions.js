/**
 * Gradual Regime Transition Helpers
 * Functions to manage smooth regime transitions with decay and validation
 */

import { TRANSITION_CONFIG } from '../config/regimeConfig.js';

/**
 * Calculate regime probability decay
 * Prevents rapid regime switches by limiting how fast probabilities can change
 * 
 * @param {Object} previousProbabilities - Previous month's regime probabilities
 * @param {Object} currentRawProbabilities - Current raw calculated probabilities
 * @param {number} monthsSinceLastTransition - Months since last regime change
 * @returns {Object} Smoothed probabilities
 */
export function calculateRegimeDecay(previousProbabilities, currentRawProbabilities, monthsSinceLastTransition = 0) {
    if (!previousProbabilities) {
        return currentRawProbabilities; // First calculation, no decay
    }

    const decayedProbabilities = {};
    const monthsInQuarter = 3;

    // Max decay per quarter: 25%, so per month: ~8.3%
    const maxDecayPerMonth = TRANSITION_CONFIG.MAX_DECAY_PER_QUARTER / monthsInQuarter;

    for (const regime of ['REGIME_A', 'REGIME_B', 'REGIME_C', 'REGIME_D']) {
        const prevProb = previousProbabilities[regime] || 0;
        const rawProb = currentRawProbabilities[regime] || 0;
        const diff = rawProb - prevProb;

        // Limit how much the probability can change in one month
        const cappedDiff = Math.sign(diff) * Math.min(Math.abs(diff), maxDecayPerMonth);
        decayedProbabilities[regime] = Math.max(0, Math.min(1, prevProb + cappedDiff));
    }

    // Normalize to sum to 1.0
    const total = Object.values(decayedProbabilities).reduce((sum, p) => sum + p, 0);
    if (total > 0) {
        for (const regime in decayedProbabilities) {
            decayedProbabilities[regime] /= total;
        }
    }

    return decayedProbabilities;
}

/**
 * Check if a regime transition should be allowed
 * Enforces minimum transition periods and confidence thresholds
 * 
 * @param {string} currentRegime - Current regime ID
 * @param {string} proposedRegime - Proposed new regime ID
 * @param {Array} regimeHistory - Array of {date, regime, probabilities, confidence}
 * @param {number} newConfidence - Confidence in proposed regime
 * @returns {Object} { allowed: boolean, reason: string, monthsSince: number }
 */
export function shouldAllowRegimeTransition(currentRegime, proposedRegime, regimeHistory = [], newConfidence = 0) {
    // If same regime, always allow (no transition)
    if (currentRegime === proposedRegime) {
        return { allowed: true, reason: 'Same regime', monthsSince: 0 };
    }

    // Find months since last regime change
    let monthsSinceChange = 0;
    for (let i = regimeHistory.length - 1; i >= 0; i--) {
        if (regimeHistory[i].regime !== currentRegime) {
            break;
        }
        monthsSinceChange++;
    }

    // Enforce minimum transition period
    if (monthsSinceChange < TRANSITION_CONFIG.MIN_TRANSITION_MONTHS) {
        return {
            allowed: false,
            reason: `Minimum ${TRANSITION_CONFIG.MIN_TRANSITION_MONTHS} months not met (${monthsSinceChange} months)`,
            monthsSince: monthsSinceChange
        };
    }

    // Check confidence thresholds based on transition duration
    if (monthsSinceChange < 9) {
        // Early transition (6-9 months): require high confidence
        if (newConfidence < TRANSITION_CONFIG.EARLY_TRANSITION_CONFIDENCE) {
            return {
                allowed: false,
                reason: `Early transition requires ${(TRANSITION_CONFIG.EARLY_TRANSITION_CONFIDENCE * 100).toFixed(0)}% confidence (${(newConfidence * 100).toFixed(0)}% given)`,
                monthsSince: monthsSinceChange
            };
        }
    } else {
        // Normal transition (9-12 months): lower threshold
        if (newConfidence < TRANSITION_CONFIG.NORMAL_TRANSITION_CONFIDENCE) {
            return {
                allowed: false,
                reason: `Transition requires ${(TRANSITION_CONFIG.NORMAL_TRANSITION_CONFIDENCE * 100).toFixed(0)}% confidence (${(newConfidence * 100).toFixed(0)}% given)`,
                monthsSince: monthsSinceChange
            };
        }
    }

    // Regime D (Crisis) special rule: Should decay fast, allow quicker exit
    if (currentRegime === 'REGIME_D') {
        return {
            allowed: true,
            reason: 'Crisis regime exit allowed',
            monthsSince: monthsSinceChange
        };
    }

    return {
        allowed: true,
        reason: 'Transition criteria met',
        monthsSince: monthsSinceChange
    };
}

/**
 * Get interpolated allocation bands during a regime transition
 * Smoothly blends from old regime to new regime over the transition period
 * 
 * Special rules for Regime C → B:
 * - Gold: Linear decay over full transition
 * - Bonds: Duration penalty until 75% progress
 * - Equities: Beta cap until 80% progress
 * 
 * @param {string} fromRegime - Starting regime ID
 * @param {string} toRegime - Target regime ID
 * @param {number} transitionProgress - 0.0 (start) to 1.0 (complete)
 * @returns {Object} Interpolated allocation bands
 */
export function getTransitionAllocationBands(fromRegime, toRegime, transitionProgress, REGIMES) {
    const fromBands = REGIMES[fromRegime]?.allocationBands;
    const toBands = REGIMES[toRegime]?.allocationBands;

    if (!fromBands || !toBands) {
        return toBands || fromBands || {}; // Fallback
    }

    const interpolated = {};
    const assetClasses = new Set([...Object.keys(fromBands), ...Object.keys(toBands)]);

    for (const assetClass of assetClasses) {
        const fromBand = fromBands[assetClass] || { min: 0, max: 0, target: 0 };
        const toBand = toBands[assetClass] || { min: 0, max: 0, target: 0 };

        let progress = transitionProgress;

        // Special handling for Regime C → B transitions
        if (fromRegime === 'REGIME_C' && toRegime === 'REGIME_B') {
            if (assetClass === 'GOLD') {
                // Gold floor decays linearly over full transition
                progress = transitionProgress;
            } else if (assetClass === 'DEBT_MEDIUM') {
                // Duration penalty until month 9 (progress > 0.75)
                if (transitionProgress < 0.75) {
                    progress = transitionProgress * 0.5;
                } else {
                    progress = transitionProgress;
                }
            } else if (assetClass === 'EQUITY') {
                // Beta increases last (after progress > 0.8, month 10+)
                if (transitionProgress < 0.8) {
                    progress = transitionProgress * 0.5;
                } else {
                    // Accelerate in final phase
                    progress = 0.4 + (transitionProgress - 0.8) * 3;
                    progress = Math.min(1, progress);
                }
            }
        }

        interpolated[assetClass] = {
            min: fromBand.min + (toBand.min - fromBand.min) * progress,
            max: fromBand.max + (toBand.max - fromBand.max) * progress,
            target: fromBand.target + (toBand.target - fromBand.target) * progress
        };
    }

    return interpolated;
}
