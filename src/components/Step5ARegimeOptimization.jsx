import { useState, useEffect } from 'react'
import { CheckCircle, TrendingUp, Shield, AlertTriangle, BarChart3, Download } from 'lucide-react'
import { getRegimeAllocationBands, validateRegimeConstraints } from '../utils/regimeDetector'
import { mapFundsToAssetClasses, calculateAssetClassWeights } from '../utils/assetClassUtils'
import { backtestRegimePortfolio, generateBacktestReport } from '../utils/backtestEngine'
import { REGIMES } from '../config/regimeConfig'
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

    const [rebalanceMode, setRebalanceMode] = useState('annual') // 'monthly' | 'annual'

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

            // Optimize with regime constraints
            const weights = optimizeWithRegimeBands(
                adjustedReturns,
                returns.covariance,
                bands,
                fundAssetMap
            )

            setOptimizedWeights(weights)

            // Validate constraints
            const validation = validateRegimeConstraints(weights, fundAssetMap, currentRegime)
            setConstraintViolations(validation.violations)

            // Store for next step
            // Store for next step
            const resultPayload = {
                weights: returns.codes.map(code => weights[code] || 0),
                expectedReturn: calculateExpectedReturn(weights, adjustedReturns),
                volatility: calculateVolatility(weights, returns.covariance),
                sharpeRatio: 0, // Calculate if needed
                regime: currentRegime,
                regimeContext: regimeContext,
                optimizationPath: 'regime'
            }

            setBlResult(resultPayload)
            setRegimeResult(resultPayload)

        } catch (error) {
            console.error('Optimization error:', error)
            alert('Optimization failed: ' + error.message)
        } finally {
            setOptimizing(false)
        }
    }

    const runBacktest = async () => {
        if (!macroData || !optimizedWeights) return

        setShowBacktest(true)

        // Determine dates from macro data
        if (!macroData || macroData.length === 0) return;
        const startDate = macroData[0].date;
        const endDate = macroData[macroData.length - 1].date;

        // Run historical backtest
        const results = backtestRegimePortfolio(
            selectedFunds,
            returns,
            macroData,
            startDate,
            endDate,
            rebalanceMode,
            100000
        )

        const report = generateBacktestReport(results)
        setBacktestData(report)
        setBacktestResults(results)
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
                        <p className="text-gray-500">Portfolio optimized for {REGIMES[currentRegime]?.name}</p>
                    </div>
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

                        {/* Asset Class Summary */}
                        <AssetClassSummary
                            weights={optimizedWeights}
                            selectedFunds={selectedFunds}
                            currentRegime={currentRegime}
                        />
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
                            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setRebalanceMode('monthly')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${rebalanceMode === 'monthly' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setRebalanceMode('annual')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${rebalanceMode === 'annual' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Annual
                                </button>
                            </div>
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
                        ← Back to Views
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
    const adjusted = { ...returns.means }

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

    // 4. Normalize asset class weights to ensure they sum correctly within constraints
    // (Scaling preserves relative tilts while satisfying budget)
    const classSum = Object.values(classWeights).reduce((a, b) => a + b, 0)
    for (const ac of activeClasses) {
        classWeights[ac] /= classSum
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
