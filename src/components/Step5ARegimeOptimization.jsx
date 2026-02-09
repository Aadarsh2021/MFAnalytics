import { useState, useEffect } from 'react'
import { CheckCircle, TrendingUp, Shield, AlertTriangle, BarChart3, Download, Settings, Info } from 'lucide-react'
import { getRegimeAllocationBands, validateRegimeConstraints } from '../utils/regimeDetector'
import { mapFundsToAssetClasses, calculateAssetClassWeights } from '../utils/assetClassUtils'
import { backtestRegimePortfolio, generateBacktestReport } from '../utils/backtestEngine'
import { REGIMES } from '../config/regimeConfig'
import { calculateBlackLitterman } from '../utils/optimization.js'
import BacktestResults from './BacktestResults'

export default function Step5ARegimeOptimization({
    selectedFunds,
    returns,
    allData,
    views,
    currentRegime,
    macroData,
    goToStep,
    setBlResult,
    setRegimeResult,
    setBacktestResults,
    regimeContext
}) {
    const [optimizing, setOptimizing] = useState(false)
    const [optimizedWeights, setOptimizedWeights] = useState(null)
    const [constraintViolations, setConstraintViolations] = useState([])
    const [showBacktest, setShowBacktest] = useState(false)
    const [backtestData, setBacktestData] = useState(null)
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [params, setParams] = useState({
        riskFreeRate: 0.04,
        riskAversion: 2.5,
        tau: 0.025
    })


    useEffect(() => {
        // Auto-run optimization on mount
        runOptimization()
    }, [])

    const runOptimization = async () => {
        setOptimizing(true)

        try {
            // Get regime allocation bands
            const bands = getRegimeAllocationBands(currentRegime)
            if (!bands) {
                throw new Error('No allocation bands found for current regime')
            }

            // Map funds to asset classes
            const fundAssetMap = mapFundsToAssetClasses(selectedFunds)

            // Apply views to expected returns
            const adjustedReturns = applyViewsToReturns(returns, views)

            // 1. Strict Regime Allocation (Direct from Config)
            // Removed confidence-based blending to ensure strict adherence to detected regime rules
            const weights = optimizeWithRegimeBands(
                adjustedReturns,
                returns.covariance,
                bands,
                fundAssetMap
            )

            setOptimizedWeights(weights)

            // Validate constraints
            const validation = validateRegimeConstraints(weights, fundAssetMap, currentRegime, bands)
            setConstraintViolations(validation.violations)

            // 2. Standard Black-Litterman (For Comparison in Final Report)
            try {
                const blComparison = calculateBlackLitterman(returns, views, {
                    tau: params.tau,
                    riskAversion: params.riskAversion
                })
                setBlResult(blComparison)
            } catch (blError) {
                console.error('BL Comparison failed:', blError)
                // Fallback: Don't block if comparison fails
            }
            const vol = calculateVolatility(weights, returns.covariance)
            const ret = calculateExpectedReturn(weights, adjustedReturns)

            const regimePayload = {
                weights: weights,
                expectedReturn: ret,
                volatility: vol,
                sharpeRatio: vol > 0 ? ret / vol : 0,
                regime: currentRegime,
                regimeContext: regimeContext,
                optimizationPath: 'regime'
            }

            setRegimeResult(regimePayload)

        } catch (error) {
            console.error('Optimization error details:', error)
            alert(`Optimization failed: ${error.message}\n\nPlease check console for technical details.`)
        } finally {
            setOptimizing(false)
        }
    }

    const runBacktest = async () => {
        if (!macroData || !optimizedWeights) return

        setShowBacktest(true)

        // Use setTimeout to prevent blocking the click handler
        setTimeout(() => {
            // Determine earliest common date from funds data
            let commonStartDate = null;
            if (returns && returns.dates && returns.returns) {
                // Find the list of fund codes we are optimizing
                const codes = Object.keys(optimizedWeights).filter(c => optimizedWeights[c] > 0);

                // returns.dates is in DD-MM-YYYY format (from dataProcessing.js)
                // Sort dates ascending to find earliest using proper Date comparison
                const sortedFundDates = [...returns.dates].sort((a, b) => {
                    const dA = a.split('-').reverse().join('-');
                    const dB = b.split('-').reverse().join('-');
                    return new Date(dA) - new Date(dB);
                });

                // Find the first date where ALL selected funds have return data
                for (const d of sortedFundDates) {
                    const allHaveData = codes.every(c => returns.returns[c] && returns.returns[c][d] !== undefined);
                    if (allHaveData) {
                        // Convert DD-MM-YYYY to YYYY-MM-DD for comparison with Macro
                        const parts = d.split('-');
                        const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

                        const macroExists = macroData.some(m => m.date >= isoDate);
                        if (macroExists) {
                            commonStartDate = isoDate;
                            break;
                        }
                    }
                }
            }

            // Fallback to purely macro range if no fund data (shouldn't happen in real app)
            const macroStart = macroData && macroData.length > 0 ? macroData[0].date : '2002-01-01';
            const startDate = commonStartDate || macroStart;
            const endDate = macroData && macroData.length > 0 ? macroData[macroData.length - 1].date : '2025-01-01';

            console.log("Running Backtest from:", startDate);

            // Run historical backtest
            const results = backtestRegimePortfolio(
                selectedFunds,
                returns,
                macroData,
                startDate,
                endDate,
                'annual',
                100000
            )

            const report = generateBacktestReport(results)
            setBacktestData(report)
            setBacktestResults(report)
        }, 50) // Small delay to allow UI to update first
    }

    const proceedToMonteCarlo = () => {
        if (constraintViolations.length > 0) {
            const confirm = window.confirm(
                'Warning: Some constraints are violated. Proceed anyway?'
            )
            if (!confirm) return
        }

        goToStep(6) // Monte Carlo
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <Shield className="text-indigo-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Step 5A: Regime-Constrained Optimization</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-gray-500">Portfolio optimized for {REGIMES[currentRegime]?.name}</p>
                            <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full uppercase">
                                Confidence Blend: {(regimeContext?.detection?.confidence * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Parameter Settings */}
                <div className="mb-8 bg-slate-50 border-2 border-slate-100 rounded-3xl p-6">
                    <div className="flex justify-between items-center cursor-pointer group" onClick={() => setShowAdvanced(!showAdvanced)}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-xl shadow-sm group-hover:bg-indigo-50 transition">
                                <Settings className="text-slate-400 group-hover:text-indigo-600" size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-700">Model Parameters</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configure risk aversion & uncertainty</p>
                            </div>
                        </div>
                        <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white px-4 py-2 rounded-full shadow-sm">
                            {showAdvanced ? 'Simple View' : 'Advanced Configuration'}
                        </button>
                    </div>

                    {showAdvanced && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-200 animate-fade-in">
                            <ParamBox
                                label="Risk-Free Rate"
                                value={params.riskFreeRate}
                                step="0.001"
                                suffix=" (RF)"
                                info="Annual risk-free rate (e.g., 10Y G-Sec yield)."
                                onChange={(v) => setParams({ ...params, riskFreeRate: v })}
                            />
                            <ParamBox
                                label="Risk Aversion"
                                value={params.riskAversion}
                                step="0.1"
                                suffix=" (δ)"
                                info="Market risk aversion. Higher = more conservative."
                                onChange={(v) => setParams({ ...params, riskAversion: v })}
                            />
                            <ParamBox
                                label="Tau (τ)"
                                value={params.tau}
                                step="0.005"
                                suffix=" (τ)"
                                info="Confidence in market equilibrium vs. views."
                                onChange={(v) => setParams({ ...params, tau: v })}
                            />
                        </div>
                    )}
                </div>

                {optimizing ? (
                    <div className="text-center py-12">
                        <div className="animate-spin w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-600 font-semibold">Optimizing portfolio with regime constraints...</p>
                    </div>
                ) : optimizedWeights ? (
                    <div className="space-y-6">
                        {/* Constraint Validation */}
                        {constraintViolations.length > 0 ? (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
                                    <div>
                                        <h4 className="font-bold text-red-900 mb-2">Constraint Violations Detected</h4>
                                        <ul className="space-y-1 text-sm text-red-700">
                                            {constraintViolations.map((v, idx) => (
                                                <li key={idx}>
                                                    {v.assetClass}: {(v.actual * 100).toFixed(1)}%
                                                    {v.type === 'below_min' ? ' < ' : ' > '}
                                                    {(v.required * 100).toFixed(1)}% (target: {(v.target * 100).toFixed(1)}%)
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="text-green-600" size={20} />
                                    <span className="font-bold text-green-900">All regime constraints satisfied ✓</span>
                                </div>
                            </div>
                        )}

                        {/* Optimized Weights */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Optimized Allocation</h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {returns.codes.map((code, idx) => {
                                    const weight = optimizedWeights[code] || 0
                                    if (weight < 0.001) return null

                                    return (
                                        <div key={code} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                                            <div className="flex-1">
                                                <div className="font-semibold text-gray-800 text-sm">
                                                    {allData[code].name}
                                                </div>
                                                <div className="text-xs text-gray-500">{code}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-indigo-600 h-2 rounded-full transition-all"
                                                        style={{ width: `${weight * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-lg font-black text-indigo-600 w-16 text-right">
                                                    {(weight * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
                            <AssetClassSummary
                                weights={optimizedWeights}
                                selectedFunds={selectedFunds}
                                currentRegime={currentRegime}
                            />
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Historical Backtesting */}
            {optimizedWeights && macroData && (
                <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <BarChart3 className="text-purple-600" size={24} />
                                Historical Backtesting
                            </h3>
                            <p className="text-sm text-gray-500">See how this strategy performed through different regimes</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={runBacktest}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-sm"
                            >
                                {showBacktest ? 'Refresh' : 'Run'} Backtest
                            </button>
                        </div>
                    </div>

                    {showBacktest && backtestData && (
                        <BacktestResults backtestData={backtestData} />
                    )}
                </div>
            )}

            {/* Navigation */}
            {optimizedWeights && (
                <div className="flex justify-between items-center pt-6">
                    <button
                        onClick={() => goToStep('4A')}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold"
                    >
                        ← Back to Regime Views (4A)
                    </button>
                    <button
                        onClick={proceedToMonteCarlo}
                        className="px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-lg flex items-center gap-3 shadow-xl"
                    >
                        Continue to Monte Carlo
                        <CheckCircle size={22} />
                    </button>
                </div>
            )}
        </div>
    )
}

// Helper Functions

function applyViewsToReturns(returns, views) {
    // Robustly handle missing means by calculating them on the fly
    const means = returns.means || {}
    const codes = returns.codes || []

    // Fallback mean calculation if missing
    if (Object.keys(means).length === 0 && returns.returns) {
        codes.forEach(code => {
            const vals = Object.values(returns.returns[code] || {})
            means[code] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
        })
    }

    const adjusted = { ...means }

    for (const view of views) {
        if (view.type === 'absolute') {
            const code = returns.codes[view.assetIdx]
            adjusted[code] = view.return
        } else if (view.type === 'relative') {
            const code1 = returns.codes[view.asset1Idx]
            const code2 = returns.codes[view.asset2Idx]
            const diff = view.return
            adjusted[code1] = (adjusted[code1] || 0) + diff / 2
            adjusted[code2] = (adjusted[code2] || 0) - diff / 2
        }
    }

    return adjusted
}

function optimizeWithRegimeBands(returns, covariance, bands, fundAssetMap) {
    const weights = {}
    const assetClassFunds = {}

    // 1. Group funds by asset class
    for (const [code, assetClass] of Object.entries(fundAssetMap)) {
        if (!assetClassFunds[assetClass]) {
            assetClassFunds[assetClass] = []
        }
        assetClassFunds[assetClass].push(code)
    }

    // 2. Calculate aggregate return/view for each asset class
    const assetClassReturns = {}
    const activeClasses = []

    for (const [assetClass, band] of Object.entries(bands)) {
        const funds = assetClassFunds[assetClass] || []
        if (funds.length > 0) {
            assetClassReturns[assetClass] = funds.reduce((sum, f) => sum + (returns[f] || 0), 0) / funds.length
            activeClasses.push(assetClass)
        }
    }

    if (activeClasses.length === 0) return weights

    const avgClassReturn = activeClasses.reduce((sum, ac) => sum + assetClassReturns[ac], 0) / activeClasses.length

    // 3. Tilt asset class weights between min and max based on views
    const classWeights = {}
    const classSensitivity = 2.0 // How much views move the asset class allocation

    for (const ac of activeClasses) {
        const band = bands[ac]
        const relRet = assetClassReturns[ac] - avgClassReturn

        // Tilt: Start at target, move towards min/max based on relative return
        let weight = band.target + (relRet * classSensitivity)
        classWeights[ac] = Math.max(band.min, Math.min(band.max, weight))
    }

    // 4. Constrained Proportional Distribution (Institutional Normalization)
    // Ensures sum is exactly 1.0 AND all min/max bands are strictly respected.
    let currentSum = Object.values(classWeights).reduce((a, b) => a + b, 0)
    let gap = 1.0 - currentSum

    // If gap is not zero, distribute it proportionally based on available headroom
    if (Math.abs(gap) > 0.0001) {
        if (gap > 0) {
            // Under-allocated: Add to classes that aren't at 'max'
            const headroom = {}
            let totalHeadroom = 0
            for (const ac of activeClasses) {
                const room = Math.max(0, bands[ac].max - classWeights[ac])
                headroom[ac] = room
                totalHeadroom += room
            }
            if (totalHeadroom > 0) {
                for (const ac of activeClasses) {
                    classWeights[ac] += gap * (headroom[ac] / totalHeadroom)
                }
            }
        } else {
            // Over-allocated: Subtract from classes that aren't at 'min'
            const reductionRoom = {}
            let totalReductionRoom = 0
            for (const ac of activeClasses) {
                const room = Math.max(0, classWeights[ac] - bands[ac].min)
                reductionRoom[ac] = room
                totalReductionRoom += room
            }
            if (totalReductionRoom > 0) {
                for (const ac of activeClasses) {
                    classWeights[ac] += gap * (reductionRoom[ac] / totalReductionRoom) // gap is negative
                }
            }
        }
    }

    // 5. Distribute weights to individual funds within each asset class (Internal Tilt)
    for (const ac of activeClasses) {
        const funds = assetClassFunds[ac]
        const targetWeight = classWeights[ac]

        if (funds.length === 1) {
            weights[funds[0]] = targetWeight
        } else {
            const fundReturns = funds.map(f => returns[f] || 0)
            const avgFundRet = fundReturns.reduce((a, b) => a + b, 0) / funds.length
            const fundSensitivity = 5.0 // Stronger tilt for individual funds

            let internalWeights = funds.map(f => {
                const relRet = (returns[f] || 0) - avgFundRet
                // Ensure base weight (1/N) is adjusted by views, with a floor
                return Math.max(0.01, (1 / funds.length) + (relRet * fundSensitivity))
            })

            const internalSum = internalWeights.reduce((a, b) => a + b, 0)
            funds.forEach((f, i) => {
                weights[f] = (internalWeights[i] / internalSum) * targetWeight
            })
        }
    }

    return weights
}

function calculateExpectedReturn(weights, returns) {
    let expectedReturn = 0
    for (const [code, weight] of Object.entries(weights)) {
        expectedReturn += weight * (returns[code] || 0)
    }
    return expectedReturn
}

function calculateVolatility(weights, covariance) {
    // Portfolio Variance = w^T * Sigma * w
    let variance = 0
    const codes = Object.keys(weights)

    // Convert weights object to ordered array for matrix math
    const wArray = codes.map(c => weights[c])

    for (let i = 0; i < codes.length; i++) {
        for (let j = 0; j < codes.length; j++) {
            const cov = covariance?.[codes[i]]?.[codes[j]] || 0
            variance += wArray[i] * wArray[j] * cov
        }
    }

    return Math.sqrt(Math.max(0, variance))
}

function AssetClassSummary({ weights, selectedFunds, currentRegime }) {
    const fundAssetMap = mapFundsToAssetClasses(selectedFunds)
    const assetClassWeights = calculateAssetClassWeights(weights, fundAssetMap)
    const bands = getRegimeAllocationBands(currentRegime)

    return (
        <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Asset Class Allocation</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(assetClassWeights).map(([assetClass, weight]) => {
                    const band = bands[assetClass]
                    const inRange = band && weight >= band.min && weight <= band.max

                    return (
                        <div
                            key={assetClass}
                            className={`p-4 rounded-lg border-2 ${inRange ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                                }`}
                        >
                            <div className="text-xs font-bold uppercase tracking-wider mb-1 text-gray-600">
                                {assetClass.replace('_', ' ')}
                            </div>
                            <div className={`text-2xl font-black ${inRange ? 'text-green-700' : 'text-red-700'}`}>
                                {(weight * 100).toFixed(1)}%
                            </div>
                            {band && (
                                <div className="text-xs text-gray-500 mt-1">
                                    Target: {(band.target * 100).toFixed(0)}%
                                    ({(band.min * 100).toFixed(0)}-{(band.max * 100).toFixed(0)}%)
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function ParamBox({ label, value, step, suffix, info, onChange }) {
    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                {label} {suffix}
                <div className="group relative">
                    <Info size={12} className="text-slate-300 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg z-20 shadow-xl leading-relaxed">
                        {info}
                    </div>
                </div>
            </label>
            <input
                type="number"
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full bg-slate-50 border-none p-2 rounded-lg text-lg font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
        </div>
    )
}
