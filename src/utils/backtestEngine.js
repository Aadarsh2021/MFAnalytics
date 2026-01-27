/**
 * Backtesting Engine
 * Simulates portfolio performance through historical macro regimes
 */

import { detectRegime, getRegimeAllocationBands } from './regimeDetector.js';
import { mapFundsToAssetClasses, calculateAssetClassWeights } from './assetClassUtils.js';
import {
    calculateRegimeDecay,
    shouldAllowRegimeTransition,
    getTransitionAllocationBands
} from './regimeTransitions.js';
import { REGIMES } from '../config/regimeConfig.js';

/**
 * Run historical backtest of regime-based portfolio
 * @param {Array} selectedFunds - User's selected funds
 * @param {Object} returns - Historical returns data
 * @param {Array} macroData - Historical macro indicators
 * @param {string} startDate - Backtest start date
 * @param {string} endDate - Backtest end date
 * @returns {Object} Backtest results
 */
export function backtestRegimePortfolio(selectedFunds, returns, macroData, startDate, endDate, initialInvestment = 100000) {
    const results = {
        monthly: [],
        summary: {},
        regimePerformance: {},
        transitions: []
    };

    // Map funds to asset classes
    const fundAssetMap = mapFundsToAssetClasses(selectedFunds);

    // Filter macro data to date range
    const filteredMacro = macroData.filter(d => {
        const date = new Date(d.date);
        return date >= new Date(startDate) && date <= new Date(endDate);
    });

    let cumulativeReturn = 1.0;
    let portfolioValue = initialInvestment;
    // Initial weights calculation
    let currentWeights = null;
    let currentRegimeAllocation = null;
    let previousRegime = null; // Fix: Initialize previousRegime

    // Hysteresis State
    let activeRegime = null;
    let candidateRegime = null;
    let candidateMonths = 0;
    const HYSTERESIS_THRESHOLD = 3;

    for (let i = 0; i < filteredMacro.length; i++) {
        const macroPoint = filteredMacro[i];
        const nextMacroPoint = filteredMacro[i + 1];
        const date = macroPoint.date;
        const nextDate = nextMacroPoint ? nextMacroPoint.date : null;
        const monthFilter = new Date(date).getMonth();

        // Detect raw regime for this month
        const regimeDetection = detectRegime(macroPoint);
        const detectedRegime = regimeDetection.dominant;

        // ... Hysteresis Logic ...
        if (!activeRegime) {
            activeRegime = detectedRegime;
        } else if (detectedRegime !== activeRegime) {
            if (detectedRegime === candidateRegime) {
                candidateMonths++;
            } else {
                candidateRegime = detectedRegime;
                candidateMonths = 1;
            }
            if (candidateMonths >= HYSTERESIS_THRESHOLD) {
                activeRegime = candidateRegime;
                candidateRegime = null;
                candidateMonths = 0;
            }
        } else {
            candidateRegime = null;
            candidateMonths = 0;
        }

        const currentRegime = activeRegime;
        const bands = getRegimeAllocationBands(currentRegime);

        let shouldRebalance = false;
        if (i === 0) shouldRebalance = true;
        if (previousRegime && previousRegime !== currentRegime) {
            results.transitions.push({
                date,
                from: previousRegime,
                to: currentRegime,
                confidence: regimeDetection.confidence,
                note: 'Smoothed switch (3-month confirmation)'
            });
            shouldRebalance = true;
        }
        if (monthFilter === 0) shouldRebalance = true;

        if (!shouldRebalance && currentWeights && bands) {
            const assetWeights = calculateAssetClassWeights(currentWeights, fundAssetMap);
            for (const [assetClass, weight] of Object.entries(assetWeights)) {
                const band = bands[assetClass];
                if (band && (weight < band.min || weight > band.max)) {
                    shouldRebalance = true;
                    break;
                }
            }
        }

        if (shouldRebalance) {
            currentWeights = rebalanceToRegimeBands(selectedFunds, fundAssetMap, bands);
        }

        // Calculate portfolio return for the PERIOD (until next month)
        const { portfolioReturn: monthReturn, fundReturns } = calculatePortfolioReturnForPeriod(
            currentWeights,
            returns,
            date,
            nextDate || date // If last month, just use that month
        );

        // Simulate Weight Drift for NEXT month
        // NewWeight = OldWeight * (1 + FundReturn) / (1 + PortfolioReturn)
        const nextWeights = {};
        for (const [code, weight] of Object.entries(currentWeights)) {
            const fundRet = fundReturns[code] || 0;
            nextWeights[code] = weight * (1 + fundRet) / (1 + monthReturn);
        }

        // Update cumulative metrics
        cumulativeReturn *= (1 + monthReturn);
        portfolioValue *= (1 + monthReturn);

        // Track regime performance
        if (!results.regimePerformance[currentRegime]) {
            results.regimePerformance[currentRegime] = {
                months: 0,
                returns: [],
                januaryCount: 0
            };
        }
        results.regimePerformance[currentRegime].months++;
        results.regimePerformance[currentRegime].returns.push(monthReturn);
        if (monthFilter === 0) {
            results.regimePerformance[currentRegime].januaryCount++;
        }

        // Store monthly result
        results.monthly.push({
            date,
            regime: currentRegime,
            regimeConfidence: regimeDetection.confidence,
            weights: { ...currentWeights },
            monthReturn,
            cumulativeReturn: cumulativeReturn - 1,
            portfolioValue,
            rebalanced: shouldRebalance
        });

        // Prepare for next iteration
        previousRegime = currentRegime;
        currentWeights = nextWeights;
    }

    // Capture Regime at Start
    if (results.monthly.length > 0) {
        results.initialRegime = results.monthly[0].regime;
    }


    // Calculate summary statistics
    results.summary = calculateBacktestSummary(results.monthly);

    // Calculate regime-specific performance
    for (const [regime, data] of Object.entries(results.regimePerformance)) {
        const avgReturn = data.returns.reduce((a, b) => a + b, 0) / data.returns.length;
        const annualizedReturn = Math.pow(1 + avgReturn, 12) - 1;

        data.avgMonthlyReturn = avgReturn;
        data.annualizedReturn = annualizedReturn;
        data.totalReturn = data.returns.reduce((cum, r) => cum * (1 + r), 1) - 1;
    }

    return results;
}

/**
 * Rebalance portfolio to regime allocation bands
 */
function rebalanceToRegimeBands(selectedFunds, fundAssetMap, bands) {
    if (!bands) {
        // Equal weight if no bands
        const equalWeight = 1.0 / selectedFunds.length;
        return Object.fromEntries(
            selectedFunds.map(f => [f.code || f.schemeCode, equalWeight])
        );
    }

    // Group funds by asset class
    const assetClassFunds = {};
    for (const fund of selectedFunds) {
        const code = fund.code || fund.schemeCode;
        const assetClass = fundAssetMap[code];
        if (!assetClassFunds[assetClass]) {
            assetClassFunds[assetClass] = [];
        }
        assetClassFunds[assetClass].push(code);
    }

    // Allocate to each asset class based on regime bands
    const weights = {};
    for (const [assetClass, band] of Object.entries(bands)) {
        const funds = assetClassFunds[assetClass] || [];
        if (funds.length === 0) continue;

        // Use target allocation
        const targetWeight = band.target;
        const weightPerFund = targetWeight / funds.length;

        for (const fundCode of funds) {
            weights[fundCode] = weightPerFund;
        }
    }

    // Normalize to sum to 1.0
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    if (totalWeight > 0) {
        for (const code of Object.keys(weights)) {
            weights[code] /= totalWeight;
        }
    }

    return weights;
}

/**
* Calculate portfolio return for a period by compounding daily returns
* @param {Object} weights - Portfolio weights
* @param {Object} returns - Aligned returns data
* @param {string} startDate - Period start date (YYYY-MM-DD)
* @param {string} endDate - Period end date (YYYY-MM-DD)
*/
function calculatePortfolioReturnForPeriod(weights, returns, startDate, endDate) {
    let portfolioReturnForPeriod = 0;
    const fundReturnsForPeriod = {};

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(start.getFullYear(), start.getMonth() + 1, 1);

    // Initial fund compounded returns (set to 1.0)
    for (const fundCode of Object.keys(weights)) {
        fundReturnsForPeriod[fundCode] = 1.0;
    }

    // Iterate through all daily returns available in returns.dates
    // Filter to those within the period [startDate, endDate)
    const periodDates = returns.dates.filter(dStr => {
        const d = parseMFDate(dStr);
        return d >= start && d < end;
    });

    if (periodDates.length === 0) {
        return { portfolioReturn: 0, fundReturns: Object.fromEntries(Object.keys(weights).map(c => [c, 0])) };
    }

    for (const dStr of periodDates) {
        for (const [fundCode, weight] of Object.entries(weights)) {
            const dailyRet = returns.returns?.[fundCode]?.[dStr] || 0;
            fundReturnsForPeriod[fundCode] *= (1 + dailyRet);
        }
    }

    // Convert compounded values back to periodic returns
    for (const fundCode of Object.keys(weights)) {
        fundReturnsForPeriod[fundCode] -= 1.0;
        portfolioReturnForPeriod += weights[fundCode] * fundReturnsForPeriod[fundCode];
    }

    return { portfolioReturn: portfolioReturnForPeriod, fundReturns: fundReturnsForPeriod };
}

/**
 * Helper to parse DD-MM-YYYY to Date
 */
function parseMFDate(s) {
    const parts = s.split('-');
    return new Date(parts[2], parts[1] - 1, parts[0]);
}

/**
 * Convert YYYY-MM-DD to DD-MM-YYYY
 */
function formatToMFDate(isoDate) {
    if (!isoDate || typeof isoDate !== 'string') return isoDate;
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * Calculate backtest summary statistics
 */
function calculateBacktestSummary(monthlyResults) {
    const returns = monthlyResults.map(m => m.monthReturn);
    const n = returns.length;

    if (n === 0) return {};

    // Total and annualized return
    const totalReturn = monthlyResults[n - 1].cumulativeReturn;
    const years = n / 12;
    const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1;

    // Volatility
    const meanReturn = returns.reduce((a, b) => a + b, 0) / n;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (n - 1);
    const monthlyVol = Math.sqrt(variance);
    const annualizedVol = monthlyVol * Math.sqrt(12);

    // Sharpe ratio (assuming 0% risk-free rate)
    const sharpeRatio = annualizedReturn / annualizedVol;

    // Max drawdown
    let maxDrawdown = 0;
    let peak = monthlyResults[0].portfolioValue;

    for (const result of monthlyResults) {
        if (result.portfolioValue > peak) {
            peak = result.portfolioValue;
        }
        const drawdown = (peak - result.portfolioValue) / peak;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }

    // Win rate
    const positiveMonths = returns.filter(r => r > 0).length;
    const winRate = positiveMonths / n;

    // Value at Risk (VaR) - Historical 95%
    // Sort returns ascending (worst to best)
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index95 = Math.floor(0.05 * n);
    const monthlyVaR95 = sortedReturns[index95];

    // Conditional Value at Risk (CVaR) - Expected Shortfall at 95%
    // Average of returns strictly worse than VaR
    const tailReturns = sortedReturns.slice(0, index95);
    const monthlyCVaR95 = tailReturns.length > 0
        ? tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length
        : monthlyVaR95;

    // Final Value
    const endValue = monthlyResults[n - 1].portfolioValue;

    return {
        totalReturn,
        annualizedReturn,
        annualizedVol,
        sharpeRatio,
        maxDrawdown,
        winRate,
        monthlyVaR95,
        monthlyCVaR95,
        endValue
    };
}

/**
 * Compare regime portfolio vs benchmark
 */
export function compareVsBenchmark(regimeResults, benchmarkReturns, macroData) {
    const comparison = {
        regime: regimeResults.summary,
        benchmark: {},
        outperformance: {}
    };

    // Calculate benchmark performance
    let benchmarkCumulative = 1.0;
    let benchmarkValue = 100000;
    const benchmarkMonthly = [];

    for (const macroPoint of macroData) {
        const date = macroPoint.date;
        const benchmarkReturn = benchmarkReturns[date] || 0;

        benchmarkCumulative *= (1 + benchmarkReturn);
        benchmarkValue *= (1 + benchmarkReturn);

        benchmarkMonthly.push({
            date,
            monthReturn: benchmarkReturn,
            cumulativeReturn: benchmarkCumulative - 1,
            value: benchmarkValue
        });
    }

    comparison.benchmark = calculateBacktestSummary(benchmarkMonthly);

    // Calculate outperformance
    comparison.outperformance = {
        totalReturn: regimeResults.summary.totalReturn - comparison.benchmark.totalReturn,
        annualizedReturn: regimeResults.summary.annualizedReturn - comparison.benchmark.annualizedReturn,
        sharpeRatio: regimeResults.summary.sharpeRatio - comparison.benchmark.sharpeRatio,
        maxDrawdown: comparison.benchmark.maxDrawdown - regimeResults.summary.maxDrawdown // Lower is better
    };

    return comparison;
}

/**
 * Generate backtest report data for visualization
 */
export function generateBacktestReport(backtestResults) {
    return {
        // Regime at Start
        initialRegime: backtestResults.initialRegime,

        // Cumulative return chart data
        cumulativeReturns: backtestResults.monthly.map(m => ({
            date: m.date,
            value: m.cumulativeReturn * 100
        })),

        // Regime distribution
        regimeDistribution: Object.entries(backtestResults.regimePerformance).map(([regime, data]) => ({
            regime,
            months: data.months,
            years: data.januaryCount, // Years scanner identified state at annual restructuring
            percentage: (data.months / backtestResults.monthly.length) * 100,
            annualizedReturn: data.annualizedReturn * 100
        })),

        // Regime transitions
        transitions: backtestResults.transitions,

        // Summary metrics
        summary: {
            ...backtestResults.summary,
            totalReturn: backtestResults.summary.totalReturn * 100,
            annualizedReturn: backtestResults.summary.annualizedReturn * 100,
            annualizedVol: backtestResults.summary.annualizedVol * 100,
            maxDrawdown: backtestResults.summary.maxDrawdown * 100,
            winRate: backtestResults.summary.winRate * 100,
            monthlyVaR95: backtestResults.summary.monthlyVaR95 * 100,
            monthlyCVaR95: backtestResults.summary.monthlyCVaR95 * 100
        }
    };
}

export default {
    backtestRegimePortfolio,
    compareVsBenchmark,
    generateBacktestReport
};
