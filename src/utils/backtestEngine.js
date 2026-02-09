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
export function backtestRegimePortfolio(selectedFunds, returns, macroData, startDate, endDate, rebalanceMode = 'annual', initialInvestment = 100000) {
    const results = {
        monthly: [],
        summary: {},
        regimePerformance: {},
        transitions: []
    };

    // Map funds to asset classes
    const fundAssetMap = mapFundsToAssetClasses(selectedFunds);

    // Filter macro data to date range
    // Helper to robustly parse start/end inputs which might be YYYY-MM-DD or DD-MM-YYYY
    const parseInputDate = (d) => {
        if (!d) return new Date();
        if (d instanceof Date) return d;
        // Check if DD-MM-YYYY
        if (d.match(/^\d{2}-\d{2}-\d{4}$/)) {
            const parts = d.split('-');
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return new Date(d); // Assume YYYY-MM-DD or standard format
    };

    const sDate = parseInputDate(startDate);
    const eDate = parseInputDate(endDate);

    const filteredMacro = macroData.filter(d => {
        const date = new Date(d.date);
        return date >= sDate && date <= eDate;
    });

    let cumulativeReturn = 1.0;
    let portfolioValue = initialInvestment;

    // Engine State for Consistency
    let previousProbs = null;
    let previousDominant = null;
    let historicalDetections = [];
    let currentWeights = null;

    for (let i = 0; i < filteredMacro.length; i++) {
        const macroPoint = filteredMacro[i];
        const nextMacroPoint = filteredMacro[i + 1];
        const date = macroPoint.date;
        const nextDate = nextMacroPoint ? nextMacroPoint.date : null;
        const monthFilter = new Date(date).getMonth();

        // Detect regime with UNIFIED engine (Bayesian + Sticky Lock)
        const regimeDetection = detectRegime(
            macroPoint,
            previousProbs,
            previousDominant,
            historicalDetections,
            0.3
        );

        const currentRegime = regimeDetection.dominant;
        const bands = getRegimeAllocationBands(currentRegime);

        // Update history for next iteration
        historicalDetections.push(regimeDetection);
        previousProbs = regimeDetection.probabilities;
        previousDominant = currentRegime;

        let shouldRebalance = false;
        if (i === 0) shouldRebalance = true;

        // Use previousDominant from outer scope for transition check
        const prevRegime = i > 0 ? historicalDetections[i - 1].dominant : null;
        if (prevRegime && prevRegime !== currentRegime) {
            results.transitions.push({
                date,
                from: prevRegime,
                to: currentRegime,
                confidence: regimeDetection.confidence,
                note: 'Smoothed switch (3-month confirmation)'
            });
            shouldRebalance = true;
        }
        if (rebalanceMode === 'monthly') {
            shouldRebalance = true;
        } else if (monthFilter === 0) {
            shouldRebalance = true;
        }

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
            nextDate || date,
            fundAssetMap,
            macroPoint,
            filteredMacro[i - 1] || null
        );

        // Collect daily returns for risk metrics
        if (!results.dailyReturns) results.dailyReturns = [];
        if (fundReturns.dailyReturns) {
            results.dailyReturns.push(...fundReturns.dailyReturns);
        }

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
        currentWeights = nextWeights;
    }

    // Capture Regime at Start
    if (results.monthly.length > 0) {
        results.initialRegime = results.monthly[0].regime;
    }


    // Calculate summary statistics
    results.summary = calculateBacktestSummary(results.monthly, results.dailyReturns || []);

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
* FALLS BACK TO MACRO PROXIES if fund data is missing!
* @param {Object} weights - Portfolio weights
* @param {Object} returns - Aligned returns data
* @param {string} startDate - Period start date (YYYY-MM-DD)
* @param {string} endDate - Period end date (YYYY-MM-DD)
* @param {Object} fundAssetMap - Mapping of fund code to asset class
* @param {Object} macroPoint - Current month macro data
* @param {Object} prevMacroPoint - Previous month macro data
*/
function calculatePortfolioReturnForPeriod(weights, returns, startDate, endDate, fundAssetMap, macroPoint, prevMacroPoint) {
    let portfolioReturnForPeriod = 0;
    const fundReturnsForPeriod = {};
    const dailyPortfolioReturns = [];

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(start.getFullYear(), start.getMonth() + 1, 1);

    // Initial fund compounded returns (set to 1.0)
    for (const fundCode of Object.keys(weights)) {
        fundReturnsForPeriod[fundCode] = 1.0;
    }

    // Iterate through all daily returns available in returns.dates
    const periodDates = returns.dates.filter(dStr => {
        const d = parseMFDate(dStr);
        return d >= start && d < end;
    });

    if (periodDates.length > 0) {
        // We have real fund data! Use it.
        for (const dStr of periodDates) {
            let dailySum = 0;
            for (const [fundCode, weight] of Object.entries(weights)) {
                const dailyRet = returns.returns?.[fundCode]?.[dStr] || 0;
                dailySum += weight * dailyRet;
                fundReturnsForPeriod[fundCode] *= (1 + dailyRet);
            }
            dailyPortfolioReturns.push(dailySum);
        }
        // Convert compounded values back to periodic returns
        for (const fundCode of Object.keys(weights)) {
            fundReturnsForPeriod[fundCode] -= 1.0;
            portfolioReturnForPeriod += (weights[fundCode] || 0) * fundReturnsForPeriod[fundCode];
        }
    } else {
        // PROXY LOGIC: No fund data available for this range.
        // Use macro benchmarks as proxies.
        for (const [fundCode, weight] of Object.entries(weights)) {
            const assetClass = fundAssetMap[fundCode];
            let proxyReturn = 0;

            if (macroPoint && prevMacroPoint && assetClass) {
                if (assetClass === 'EQUITY') {
                    // Use Nifty (India) or S&P 500 (US) % change
                    if (macroPoint.nifty && prevMacroPoint.nifty) {
                        proxyReturn = (macroPoint.nifty / prevMacroPoint.nifty) - 1;
                    } else if (macroPoint.sp500 && prevMacroPoint.sp500) {
                        proxyReturn = (macroPoint.sp500 / prevMacroPoint.sp500) - 1;
                    }
                } else if (assetClass === 'GOLD') {
                    // Use Gold Price % change
                    if (macroPoint.goldPrice && prevMacroPoint.goldPrice) {
                        proxyReturn = (macroPoint.goldPrice / prevMacroPoint.goldPrice) - 1;
                    }
                } else if (assetClass.includes('DEBT')) {
                    // Constant proxy return for Debt if missing
                    // Use Yield-based total return approximation: (Yield_prev - Yield_cur) * Duration + Yield_prev/12
                    const duration = assetClass.includes('LONG') ? 7.0 : 2.0;
                    const y1 = prevMacroPoint.gSecYield || 5.0;
                    const y2 = macroPoint.gSecYield || 5.0;
                    proxyReturn = ((y1 - y2) / 100) * duration + (y1 / 100 / 12);
                }
            } else {
                // Default fallback
                proxyReturn = assetClass === 'EQUITY' ? 0.008 : 0.004;
            }

            fundReturnsForPeriod[fundCode] = proxyReturn;
            portfolioReturnForPeriod += (weights[fundCode] || 0) * proxyReturn;
        }
    }

    return { portfolioReturn: portfolioReturnForPeriod, fundReturns: fundReturnsForPeriod, dailyReturns: dailyPortfolioReturns };
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
function calculateBacktestSummary(monthlyResults, dailyReturns = []) {
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

    // Check if initial investment was higher than first month end (rare but possible drawndown in month 1)
    if (100000 > peak) {
        peak = 100000;
        maxDrawdown = (100000 - monthlyResults[0].portfolioValue) / 100000;
    } else {
        peak = 100000;
    }

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

    // DAILY METRICS (VaR, CVaR, Median)
    let dailyVaR95 = 0;
    let dailyCVaR95 = 0;
    let medianReturn = 0;

    if (dailyReturns && dailyReturns.length > 0) {
        const sortedDaily = [...dailyReturns].sort((a, b) => a - b);
        const idxDaily95 = Math.floor(0.05 * sortedDaily.length);
        dailyVaR95 = sortedDaily[idxDaily95];

        const tailDaily = sortedDaily.slice(0, idxDaily95);
        dailyCVaR95 = tailDaily.length > 0
            ? tailDaily.reduce((sum, r) => sum + r, 0) / tailDaily.length
            : dailyVaR95;

        // Median
        const mid = Math.floor(sortedDaily.length / 2);
        medianReturn = sortedDaily.length % 2 !== 0
            ? sortedDaily[mid]
            : (sortedDaily[mid - 1] + sortedDaily[mid]) / 2;
    } else {
        // Fallback to Monthly Proxies if no daily data (legacy mode)
        // Sort returns ascending (worst to best)
        const sortedReturns = [...returns].sort((a, b) => a - b);
        const index95 = Math.floor(0.05 * n);
        const monthlyVaR95 = sortedReturns[index95]; // Monthly VaR

        const tailReturns = sortedReturns.slice(0, index95);
        const monthlyCVaR95 = tailReturns.length > 0
            ? tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length
            : monthlyVaR95;

        // Convert Monthly to Daily approximation (Parametric scaling)
        // Daily ~ Monthly / sqrt(21)
        dailyVaR95 = monthlyVaR95 / Math.sqrt(21);
        dailyCVaR95 = monthlyCVaR95 / Math.sqrt(21);

        // Monthly Median fallback
        const mid = Math.floor(sortedReturns.length / 2);
        medianReturn = sortedReturns.length % 2 !== 0
            ? sortedReturns[mid]
            : (sortedReturns[mid - 1] + sortedReturns[mid]) / 2;
    }

    // Annualize Median (Compound Daily Median 252 times)
    // If we only have monthly data (legacy fallback), we compound 12 times
    const isDaily = dailyReturns && dailyReturns.length > 0;
    const annualizedMedianReturn = isDaily
        ? Math.pow(1 + medianReturn, 252) - 1
        : Math.pow(1 + medianReturn, 12) - 1;

    // Final Value
    const endValue = monthlyResults[n - 1].portfolioValue;

    return {
        totalReturn,
        annualizedReturn,
        annualizedVol,
        sharpeRatio,
        maxDrawdown,
        winRate,
        dailyVaR95,     // Now explicitly Daily if dailyReturns provided
        dailyCVaR95,    // Now explicitly Daily if dailyReturns provided
        medianReturn,   // Raw periodic median
        annualizedMedianReturn, // New Metric
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

        // Full monthly data for charts and stats (Component expects 'monthly' key)
        monthly: backtestResults.monthly.map(m => ({
            date: m.date,
            regime: m.regime,
            cumulativeReturn: m.cumulativeReturn, // Raw decimal (Component multiplies by 100)
            portfolioValue: m.portfolioValue
        })),

        // Regime distribution
        regimeDistribution: Object.entries(backtestResults.regimePerformance).map(([regime, data]) => ({
            regime,
            months: data.months,
            years: data.januaryCount,
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
            dailyVaR95: backtestResults.summary.dailyVaR95 * 100,
            dailyCVaR95: backtestResults.summary.dailyCVaR95 * 100,
            annualizedMedianReturn: backtestResults.summary.annualizedMedianReturn * 100, // Format as percentage
            endValue: backtestResults.summary.endValue // Ensure this is explicitly passed through
        }
    };
}

export default {
    backtestRegimePortfolio,
    compareVsBenchmark,
    generateBacktestReport
};
