import { useState, useMemo } from 'react'
import { Download, RotateCcw, TrendingUp, Activity, Award, CheckCircle, Info, Database, Save, ArrowRight, ShieldCheck, PieChart, TrendingDown } from 'lucide-react'
import { downloadReport } from '../utils/export.js'
import { supabase } from '../utils/supabase'
import BacktestingPanel from './BacktestingPanel'
import BacktestResults from './BacktestResults'
import RegimeAllocationChart from './RegimeAllocationChart'
import RegimeAlertModal from './RegimeAlertModal'
import { REGIMES } from '../config/regimeConfig'
import { mapFundsToAssetClasses, calculateAssetClassWeights } from '../utils/assetClassUtils'
import { detectRegime } from '../utils/regimeDetector'

export default function Step7FinalReport({
    selectedFunds,
    returns,
    allData,
    mvpResults,
    blResult,
    showMessage,
    aligned,
    dataQuality,
    selectedRegimeId,
    goToStep,
    optimizationPath,
    macroData,
    currentRegime,
    backtestResults,
    regimeContext,
    weightMethod,
    customWeights,
    regimeResult
}) {
    // Error Fallback UI State
    const [renderError, setRenderError] = useState(null)

    try {
        const handleDownload = (method) => {
            try {
                downloadReport(method, returns, allData, mvpResults, blResult, regimeResult)
                showMessage('success', `Downloaded ${method.toUpperCase()} Report + Returns CSV!`)
            } catch (e) {
                showMessage('error', 'Download failed: ' + e.message)
            }
        }

        const startOver = () => {
            if (window.confirm('Start a new analysis? This will clear all current data.')) {
                window.location.reload()
            }
        }



        const saveAnalysis = async () => {
            try {
                const entry = {
                    created_at: new Date().toISOString(),
                    funds: returns.codes.map(c => allData[c]?.name || c),
                    state: {
                        selectedFunds,
                        allData,
                        aligned,
                        returns,
                        mvpResults,
                        blResult,
                        regimeResult, // Added
                        dataQuality,
                        selectedRegimeId,
                        optimizationPath,
                        macroData,
                        currentRegime,
                        backtestResults,
                        regimeContext,
                        weightMethod,
                        customWeights
                    }
                }

                const { error } = await supabase
                    .from('analyses')
                    .insert([entry])

                if (error) throw error

                // Dispatch event for Sidebar to pick up (if we implement generic refresh)
                window.dispatchEvent(new Event('mfp-history-update'))

                showMessage('success', 'Analysis saved to Supabase Cloud!')
            } catch (e) {
                console.error(e)
                showMessage('error', 'Failed to save to Cloud: ' + e.message)
            }
        }

        // Regime Alert Detection (for BL path)
        const [showRegimeAlert, setShowRegimeAlert] = useState(false)
        const [regimeMismatch, setRegimeMismatch] = useState(null)

        useMemo(() => {
            // Check if BL result has regime context
            if (blResult?.regimeContext?.detection) {
                const currentRegime = blResult.regimeContext.detection.dominant

                // Infer portfolio regime from weights
                const weightsArray = blResult?.weights || []
                const portfolioRegime = weightsArray.length > 0 ? inferRegimeFromWeights(weightsArray, returns, allData || {}) : null

                if (portfolioRegime && currentRegime !== portfolioRegime) {
                    setRegimeMismatch({
                        currentRegime,
                        portfolioRegime,
                        suggestions: generateRegimeSuggestions(currentRegime, weightsArray, returns, allData || {})
                    })
                    // Auto-show alert on load
                    setTimeout(() => setShowRegimeAlert(true), 1000)
                }
            }
        }, [blResult])

        // Performance Metrics Calculation
        const metrics = useMemo(() => {
            if (!returns) return {}

            const calc = (weights) => {
                if (!weights) return null
                if (weights.length !== returns.codes.length) {
                    console.warn('Weight/Return count mismatch. Likely fund selection changed without re-running optimization.')
                    return null
                }

                // Calculate portfolio returns series
                const series = returns.dates.map(date => {
                    return returns.codes.reduce((sum, code, i) => {
                        return sum + weights[i] * (returns.returns[code][date] || 0)
                    }, 0)
                })

                // Basic statistics
                const mean = series.reduce((a, b) => a + b, 0) / series.length
                const variance = series.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (series.length - 1)
                const stdDev = Math.sqrt(variance)

                // Downside deviation (only negative returns)
                const downsideReturns = series.filter(r => r < 0)
                const downsideVariance = downsideReturns.length > 0
                    ? downsideReturns.reduce((sum, val) => sum + Math.pow(val, 2), 0) / downsideReturns.length
                    : 0
                const downsideDev = Math.sqrt(downsideVariance)

                // Max Drawdown
                let maxDrawdown = 0
                let peak = -Infinity
                let cumulative = 1.0
                series.forEach(ret => {
                    cumulative *= (1 + ret)
                    if (cumulative > peak) peak = cumulative
                    const drawdown = (peak - cumulative) / peak
                    if (drawdown > maxDrawdown) maxDrawdown = drawdown
                })

                // Skewness and Kurtosis
                const skewness = stdDev > 0
                    ? series.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / series.length
                    : 0
                const kurtosis = stdDev > 0
                    ? series.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0) / series.length - 3
                    : 0

                // VaR and CVaR (5% confidence)
                const sorted = [...series].sort((a, b) => a - b)
                const var95Index = Math.floor(series.length * 0.05)
                const var95Historical = sorted[var95Index] || 0
                const cvar95 = var95Index > 0
                    ? sorted.slice(0, var95Index + 1).reduce((a, b) => a + b, 0) / (var95Index + 1)
                    : sorted[0] || 0
                const var95Analytical = mean - 1.645 * stdDev // Parametric VaR

                // Beta (vs equal-weight benchmark)
                const benchmarkReturns = returns.dates.map(date => {
                    return returns.codes.reduce((sum, code) => sum + (returns.returns[code][date] || 0), 0) / returns.codes.length
                })
                const benchmarkMean = benchmarkReturns.reduce((a, b) => a + b, 0) / benchmarkReturns.length
                const covariance = series.reduce((sum, val, i) => {
                    return sum + (val - mean) * (benchmarkReturns[i] - benchmarkMean)
                }, 0) / (series.length - 1)
                const benchmarkVariance = benchmarkReturns.reduce((sum, val) => {
                    return sum + Math.pow(val - benchmarkMean, 2)
                }, 0) / (benchmarkReturns.length - 1)
                const beta = benchmarkVariance > 0 ? covariance / benchmarkVariance : 1

                // Capture Ratios
                const upsidePortfolio = series.filter((r, i) => benchmarkReturns[i] > 0)
                const downsidePortfolio = series.filter((r, i) => benchmarkReturns[i] < 0)
                const upsideBenchmark = benchmarkReturns.filter(r => r > 0)
                const downsideBenchmark = benchmarkReturns.filter(r => r < 0)

                const upsideCapture = upsidePortfolio.length > 0 && upsideBenchmark.length > 0
                    ? (upsidePortfolio.reduce((a, b) => a + b, 0) / upsidePortfolio.length) /
                    (upsideBenchmark.reduce((a, b) => a + b, 0) / upsideBenchmark.length)
                    : 0

                const downsideCapture = downsidePortfolio.length > 0 && downsideBenchmark.length > 0
                    ? (downsidePortfolio.reduce((a, b) => a + b, 0) / downsidePortfolio.length) /
                    (downsideBenchmark.reduce((a, b) => a + b, 0) / downsideBenchmark.length)
                    : 0

                // Diversification Ratio
                const weightedVols = weights.reduce((sum, w, i) => {
                    const code = returns.codes[i]
                    const fundReturns = returns.dates.map(d => returns.returns[code][d] || 0)
                    const fundMean = fundReturns.reduce((a, b) => a + b, 0) / fundReturns.length
                    const fundVar = fundReturns.reduce((s, v) => s + Math.pow(v - fundMean, 2), 0) / (fundReturns.length - 1)
                    return sum + w * Math.sqrt(fundVar)
                }, 0)
                const diversificationRatio = stdDev > 0 ? weightedVols / stdDev : 1

                // Detect frequency (approximate)
                // If mean is very small (< 0.1%), likely daily. If > 0.1%, likely monthly. 
                // Better: check dates difference, but we only have returns values here easily.
                // Standard approach: assume daily if N > 60 and mean is small.
                const isDaily = series.length > 60 && Math.abs(mean) < 0.01;
                const annualizationFactor = isDaily ? 252 : 12;
                const volFactor = Math.sqrt(annualizationFactor);

                return {
                    meanMonthly: mean,
                    meanAnnual: mean * annualizationFactor,
                    volMonthly: stdDev,
                    volAnnual: stdDev * volFactor,
                    downsideDevMonthly: downsideDev,
                    maxDrawdown,
                    beta,
                    sharpe: stdDev > 0 ? (mean * annualizationFactor) / (stdDev * volFactor) : 0,
                    sortino: downsideDev > 0 ? (mean * annualizationFactor) / (downsideDev * volFactor) : 0,
                    treynor: beta !== 0 ? ((mean * annualizationFactor) / beta) * 100 : 0,
                    diversificationRatio,
                    skewness,
                    kurtosis,
                    var95Historical,
                    var95Analytical,
                    cvar95,
                    upsideCapture: upsideCapture * 100,
                    downsideCapture: downsideCapture * 100
                }
            }

            return {
                sqp: calc(mvpResults?.sqp?.weights),
                convex: calc(mvpResults?.convex?.weights),
                critical: calc(mvpResults?.critical?.weights),
                bl: calc(blResult?.weights),
                regime: calc(regimeResult?.weights ? returns.codes.map(c => regimeResult.weights[c] || 0) : null)
            }
        }, [returns, mvpResults, blResult, regimeResult])

        // Integrated Stats - Use Backtest Results when available
        const stats = useMemo(() => {
            // Priority 1: Use backtest results if available (most accurate)
            if (backtestResults?.summary) {
                const summary = backtestResults.summary
                return {
                    annReturn: summary.annualizedReturn / 100, // Convert from percentage
                    annVol: summary.annualizedVol / 100,
                    medianAnn: summary.annualizedMedianReturn / 100,
                    var95: summary.dailyVaR95 / 100,
                    cvar95: summary.dailyCVaR95 / 100
                }
            }

            // Priority 2: Calculate from portfolio returns (fallback)
            const activeResult = optimizationPath === 'regime' ? regimeResult : blResult
            if (!activeResult?.weights || !returns) return null

            const series = []
            returns.dates.forEach(date => {
                let sum = 0
                returns.codes.forEach((code, i) => {
                    const weight = optimizationPath === 'regime' ? (activeResult.weights[code] || 0) : activeResult.weights[i]
                    sum += weight * (returns.returns[code][date] || 0)
                })
                series.push(sum)
            })

            if (!series.length) return null

            const meanDaily = series.reduce((a, b) => a + b, 0) / series.length
            const annReturn = meanDaily * 252

            const variance = series.reduce((sum, val) => sum + Math.pow(val - meanDaily, 2), 0) / (series.length - 1)
            const stdDevDaily = Math.sqrt(variance)
            const annVol = stdDevDaily * Math.sqrt(252)

            const sorted = [...series].sort((a, b) => a - b)
            const mid = Math.floor(sorted.length / 2)
            const medianDaily = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
            const medianAnn = medianDaily * 252

            const idx5 = Math.floor(sorted.length * 0.05)
            const var95 = sorted[idx5]

            const worst5 = sorted.slice(0, idx5 + 1)
            const cvar95 = worst5.reduce((a, b) => a + b, 0) / worst5.length

            return { annReturn, annVol, medianAnn, var95, cvar95 }
        }, [optimizationPath, regimeResult, blResult, returns, backtestResults])

        // Calculate Asset Class Weights for selected regime validation
        const assetClassWeights = useMemo(() => {
            const activeResult = optimizationPath === 'regime' ? regimeResult : blResult
            if (!activeResult || !selectedFunds || !returns) return null

            const fundAssetMap = mapFundsToAssetClasses(selectedFunds)
            const weightsMap = {}

            if (optimizationPath === 'regime') {
                // Regime result uses code mapping
                returns.codes.forEach(code => {
                    weightsMap[code] = activeResult.weights[code] || 0
                })
            } else {
                // BL result uses index array
                returns.codes.forEach((code, i) => {
                    weightsMap[code] = activeResult.weights[i] || 0
                })
            }

            return calculateAssetClassWeights(weightsMap, fundAssetMap)
        }, [blResult, regimeResult, selectedFunds, returns, optimizationPath])

        return (
            <div className="space-y-8 animate-fade-in pb-20">
                {/* Regime Alert Modal (for BL path) */}
                {regimeMismatch && (
                    <RegimeAlertModal
                        isOpen={showRegimeAlert}
                        onClose={() => setShowRegimeAlert(false)}
                        currentRegime={regimeMismatch.currentRegime}
                        portfolioRegime={regimeMismatch.portfolioRegime}
                        suggestions={regimeMismatch.suggestions}
                        onRestructure={() => {
                            // Navigate back to Path Selection
                            goToStep(4)
                        }}
                    />
                )}

                {/* Header / Actions */}
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden mb-8">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-48 -mt-48"></div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <CheckCircle className="text-white" size={40} />
                            </div>
                            <div>
                                <h2 className="text-4xl font-black tracking-tighter">Analysis Results</h2>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Optimization Complete • {returns?.codes.length} Funds Analyzed</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-3">
                            <ActionButton
                                onClick={() => goToStep(6)}
                                icon={<RotateCcw size={20} />}
                                label="Back to Simulations"
                                color="slate"
                            />
                            <ActionButton onClick={saveAnalysis} icon={<Save size={20} />} label="Save to History" color="indigo" />
                            <ActionButton onClick={startOver} icon={<RotateCcw size={20} />} label="New Analysis" color="slate" />
                        </div>
                    </div>

                    <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 pt-10 border-t border-white/10">
                        <DownloadBtn onClick={() => handleDownload('sqp')} label="SQP Weights" active={!!mvpResults?.sqp} color="blue" />
                        <DownloadBtn onClick={() => handleDownload('convex')} label="Convex Weights" active={!!mvpResults?.convex} color="emerald" />
                        <DownloadBtn onClick={() => handleDownload('critical')} label="Critical Weights" active={!!mvpResults?.critical} color="purple" />
                        {optimizationPath === 'regime' ? (
                            <DownloadBtn onClick={() => handleDownload('regime')} label="Regime Weights" active={!!regimeResult} color="orange" />
                        ) : (
                            <DownloadBtn onClick={() => handleDownload('blacklitterman')} label="Black-Litterman" active={!!blResult} color="pink" />
                        )}
                    </div>
                </div>

                {/* Top Metrics Banner */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                        <MetricCard title="Expected Return" value={stats.annReturn} sub="Annualized" color="blue" />
                        <MetricCard title="Volatility" value={stats.annVol} sub="Annualized" color="purple" />
                        <MetricCard title="Median Return" value={stats.medianAnn} sub="Projected" color="emerald" />
                        <MetricCard title="VaR 95%" value={stats.var95} sub="Daily Risk" color="orange" />
                        <MetricCard title="CVaR 95%" value={stats.cvar95} sub="Expected Tail Loss" color="red" />
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Content Column / 8 portion */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Comparison Table */}
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <Activity size={24} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800">Methods Comparison</h3>
                            </div>

                            <div className="overflow-hidden border border-slate-100 rounded-3xl">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Parameter</th>
                                            <th className="px-8 py-5 text-center text-sm font-black text-blue-600">SQP</th>
                                            <th className="px-8 py-5 text-center text-sm font-black text-emerald-600">Convex</th>
                                            <th className="px-8 py-5 text-center text-sm font-black text-purple-600">Critical</th>
                                            <th className="px-8 py-5 text-center text-sm font-black text-indigo-700 bg-indigo-50/50">
                                                {optimizationPath === 'regime' ? 'Regime' : 'Black-Litterman'}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        <ComparisonRow label="Arithmetic Mean (monthly)"
                                            v1={metrics.sqp?.meanMonthly}
                                            v2={metrics.convex?.meanMonthly}
                                            v3={metrics.critical?.meanMonthly}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.meanMonthly : metrics.bl?.meanMonthly}
                                            isPct
                                        />
                                        <ComparisonRow label="Arithmetic Mean (annualised)"
                                            v1={metrics.sqp?.meanAnnual}
                                            v2={metrics.convex?.meanAnnual}
                                            v3={metrics.critical?.meanAnnual}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.meanAnnual : metrics.bl?.meanAnnual}
                                            isPct
                                        />
                                        <ComparisonRow label="Volatility (monthly)"
                                            v1={metrics.sqp?.volMonthly}
                                            v2={metrics.convex?.volMonthly}
                                            v3={metrics.critical?.volMonthly}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.volMonthly : metrics.bl?.volMonthly}
                                            isPct
                                            inverse
                                        />
                                        <ComparisonRow label="Volatility (annualised)"
                                            v1={metrics.sqp?.volAnnual}
                                            v2={metrics.convex?.volAnnual}
                                            v3={metrics.critical?.volAnnual}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.volAnnual : metrics.bl?.volAnnual}
                                            isPct
                                            inverse
                                        />
                                        <ComparisonRow label="Downside Deviation (monthly)"
                                            v1={metrics.sqp?.downsideDevMonthly}
                                            v2={metrics.convex?.downsideDevMonthly}
                                            v3={metrics.critical?.downsideDevMonthly}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.downsideDevMonthly : metrics.bl?.downsideDevMonthly}
                                            isPct
                                            inverse
                                        />
                                        <ComparisonRow label="Max. Drawdown"
                                            v1={metrics.sqp?.maxDrawdown}
                                            v2={metrics.convex?.maxDrawdown}
                                            v3={metrics.critical?.maxDrawdown}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.maxDrawdown : metrics.bl?.maxDrawdown}
                                            isPct
                                            inverse
                                        />
                                        <ComparisonRow label="Beta(*)"
                                            v1={metrics.sqp?.beta}
                                            v2={metrics.convex?.beta}
                                            v3={metrics.critical?.beta}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.beta : metrics.bl?.beta}
                                        />
                                        <ComparisonRow label="Sharpe Ratio"
                                            v1={metrics.sqp?.sharpe}
                                            v2={metrics.convex?.sharpe}
                                            v3={metrics.critical?.sharpe}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.sharpe : metrics.bl?.sharpe}
                                        />
                                        <ComparisonRow label="Sortino Ratio"
                                            v1={metrics.sqp?.sortino}
                                            v2={metrics.convex?.sortino}
                                            v3={metrics.critical?.sortino}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.sortino : metrics.bl?.sortino}
                                        />
                                        <ComparisonRow label="Treynor Ratio (%)"
                                            v1={metrics.sqp?.treynor}
                                            v2={metrics.convex?.treynor}
                                            v3={metrics.critical?.treynor}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.treynor : metrics.bl?.treynor}
                                        />
                                        <ComparisonRow label="Diversification Ratio"
                                            v1={metrics.sqp?.diversificationRatio}
                                            v2={metrics.convex?.diversificationRatio}
                                            v3={metrics.critical?.diversificationRatio}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.diversificationRatio : metrics.bl?.diversificationRatio}
                                        />
                                        <ComparisonRow label="Skewness"
                                            v1={metrics.sqp?.skewness}
                                            v2={metrics.convex?.skewness}
                                            v3={metrics.critical?.skewness}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.skewness : metrics.bl?.skewness}
                                        />
                                        <ComparisonRow label="Excess Kurtosis"
                                            v1={metrics.sqp?.kurtosis}
                                            v2={metrics.convex?.kurtosis}
                                            v3={metrics.critical?.kurtosis}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.kurtosis : metrics.bl?.kurtosis}
                                        />
                                        <ComparisonRow label="Historical Value-at-Risk (5%)"
                                            v1={metrics.sqp?.var95Historical}
                                            v2={metrics.convex?.var95Historical}
                                            v3={metrics.critical?.var95Historical}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.var95Historical : metrics.bl?.var95Historical}
                                            isPct
                                            inverse
                                        />
                                        <ComparisonRow label="Analytical Value-at-Risk (5%)"
                                            v1={metrics.sqp?.var95Analytical}
                                            v2={metrics.convex?.var95Analytical}
                                            v3={metrics.critical?.var95Analytical}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.var95Analytical : metrics.bl?.var95Analytical}
                                            isPct
                                            inverse
                                        />
                                        <ComparisonRow label="Conditional Value-at-Risk (5%)"
                                            v1={metrics.sqp?.cvar95}
                                            v2={metrics.convex?.cvar95}
                                            v3={metrics.critical?.cvar95}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.cvar95 : metrics.bl?.cvar95}
                                            isPct
                                            inverse
                                        />
                                        <ComparisonRow label="Upside Capture Ratio (%)"
                                            v1={metrics.sqp?.upsideCapture}
                                            v2={metrics.convex?.upsideCapture}
                                            v3={metrics.critical?.upsideCapture}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.upsideCapture : metrics.bl?.upsideCapture}
                                        />
                                        <ComparisonRow label="Downside Capture Ratio (%)"
                                            v1={metrics.sqp?.downsideCapture}
                                            v2={metrics.convex?.downsideCapture}
                                            v3={metrics.critical?.downsideCapture}
                                            v4={optimizationPath === 'regime' ? metrics.regime?.downsideCapture : metrics.bl?.downsideCapture}
                                            inverse
                                        />
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Historical Backtest Section */}
                        {backtestResults ? (
                            <div className="bg-white rounded-[2.5rem] p-1 shadow-xl border border-slate-100 overflow-hidden">
                                <BacktestResults backtestData={backtestResults} />
                            </div>
                        ) : (
                            <BacktestingPanel
                                returns={returns}
                                allData={allData}
                                mvpResults={mvpResults}
                                blResult={blResult}
                            />
                        )}
                    </div>

                    {/* Sidebar Column / 4 portion */}
                    <div className="lg:col-span-4 space-y-8">
                        {(optimizationPath === 'regime' ? regimeResult : blResult) && (
                            <RegimeAllocationChart
                                regimeId={optimizationPath === 'regime' ? (currentRegime || selectedRegimeId) : selectedRegimeId}
                                assetClassWeights={assetClassWeights}
                            />
                        )}

                        {stats && (
                            <KeyInsights stats={stats} path={optimizationPath} />
                        )}

                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] p-8 text-white shadow-xl">
                            <div className="flex items-center gap-4 mb-6">
                                <PieChart size={24} />
                                <h3 className="text-xl font-black tracking-tight">Allocation Insights</h3>
                            </div>
                            <p className="text-indigo-100 text-sm font-medium leading-relaxed mb-6">
                                {optimizationPath === 'regime'
                                    ? 'The Regime-Optimized model balanced weights to strictly respect market allocation bands.'
                                    : 'The Black-Litterman model adjusted the weights to favor your subjective views.'
                                }
                                {(() => {
                                    const weightsObj = optimizationPath === 'regime' ? (regimeResult?.weights || {}) : (blResult?.weights || {})
                                    const weights = Object.values(weightsObj)
                                    if (weights.length === 0) return null
                                    const isDiversified = weights.every(w => w < 0.5)
                                    return ` This portfolio is more ${isDiversified ? 'diversified' : 'targeted'} towards high-conviction assets.`
                                })()}
                            </p>
                            <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Diversification Score</span>
                                    <span className="text-sm font-black">Medium-High</span>
                                </div>
                                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-400 w-3/4 rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                                    <ShieldCheck size={24} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800">Next Steps</h3>
                            </div>
                            <ul className="space-y-3">
                                <StepItem icon={<ArrowRight size={12} />} text="Review CSV reports for auditing." />
                                <StepItem icon={<ArrowRight size={12} />} text="Validate with risk appetite." />
                                <StepItem icon={<ArrowRight size={12} />} text="Monitor for views drift." />
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        )
    } catch (err) {
        console.error("Critical error in Step7FinalReport:", err)
        return (
            <div className="bg-white rounded-[2.5rem] p-12 shadow-xl border border-red-100 text-center space-y-6 animate-fade-in">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto animate-pulse">
                    <Activity size={40} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-800">Something went wrong</h3>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto">We encountered an error while generating your final report. This usually happens if some historical data is missing or corrupted.</p>
                    <div className="mt-4 p-4 bg-red-50 rounded-xl text-xs font-mono text-red-700 break-words">
                        {err.message}
                    </div>
                </div>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => goToStep(6)}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
                    >
                        <RotateCcw size={18} />
                        Go Back to Simulations
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                    >
                        Reset App
                    </button>
                </div>
            </div>
        )
    }
}

function ActionButton({ onClick, icon, label, color }) {
    const colors = {
        indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        slate: 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
    }
    return (
        <button onClick={onClick} className={`px-6 py-4 rounded-2xl flex items-center gap-3 font-bold text-sm transition-all hover-lift ${colors[color]}`}>
            {icon} {label}
        </button>
    )
}

function DownloadBtn({ onClick, label, active, color }) {
    const colors = {
        blue: 'bg-blue-600 shadow-blue-500/20',
        emerald: 'bg-emerald-600 shadow-emerald-500/20',
        purple: 'bg-purple-600 shadow-purple-500/20',
        orange: 'bg-orange-600 shadow-orange-500/20',
        pink: 'bg-pink-600 shadow-pink-500/20'
    }
    return (
        <button
            disabled={!active}
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all shadow-lg text-white border border-white/10 ${active ? colors[color] : 'bg-white/5 opacity-30 cursor-not-allowed'} hover-lift`}
        >
            <Download size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </button>
    )
}

function ComparisonRow({ label, v1, v2, v3, v4, isPct = false, inverse = false }) {
    const format = (v) => {
        if (v === undefined || v === null) return '-'
        return isPct ? (v * 100).toFixed(2) + '%' : v.toFixed(3)
    }
    return (
        <tr className="hover:bg-slate-50/50 transition border-b border-slate-50">
            <td className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-tighter">{label}</td>
            <td className="px-8 py-4 text-center font-black text-slate-800 text-sm">{format(v1)}</td>
            <td className="px-8 py-4 text-center font-black text-slate-800 text-sm">{format(v2)}</td>
            <td className="px-8 py-4 text-center font-black text-slate-800 text-sm">{format(v3)}</td>
            <td className="px-8 py-4 text-center font-black text-indigo-700 bg-indigo-50/20 text-sm">{format(v4)}</td>
        </tr>
    )
}

function StepItem({ icon, text }) {
    return (
        <li className="flex gap-4 items-center">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                {icon}
            </div>
            <span className="text-sm font-bold text-slate-600 leading-tight">{text}</span>
        </li>
    )
}


function KeyInsights({ stats, path }) {
    if (!stats) return null

    // Helper for currency
    const fmtMoney = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
    const fmtPct = (n) => (n * 100).toFixed(2) + '%'

    // 1. Return
    const totalReturn = stats.annReturn

    // 2. Confidence Interval (95%)
    // Mean +/- 1.96 * Sigma
    const lowerBound = stats.annReturn - 1.96 * stats.annVol
    const upperBound = stats.annReturn + 1.96 * stats.annVol

    // 3. Project Value (Start with $100k)
    const startVal = 100000
    // Use median for "median projected value"
    const endVal = startVal * (1 + stats.medianAnn)

    // 5. Risk Level
    const getRiskLabel = (vol) => {
        if (vol < 0.10) return 'low risk'
        if (vol < 0.20) return 'moderate risk'
        return 'high risk'
    }

    return (
        <div className="bg-indigo-50/30 border border-indigo-100 rounded-3xl p-8 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">💡</span>
                <h4 className="text-xl font-black text-slate-800">Key Insights</h4>
            </div>

            <ul className="space-y-4">
                <InsightItem text={
                    <span>
                        Based on <span className="font-bold">historical analysis</span> over 1 year, your {path === 'regime' ? 'Regime Optimized' : 'Black-Litterman'} portfolio return is <span className="font-black text-slate-900">{fmtPct(totalReturn)}</span>
                    </span>
                } />
                <InsightItem text={
                    <span>
                        There's a 95% confidence that your return will be between <span className="font-black text-slate-900">{fmtPct(lowerBound)}</span> and <span className="font-black text-slate-900">{fmtPct(upperBound)}</span>
                    </span>
                } />
                <InsightItem text={
                    <span>
                        Your initial $100,000 investment has a median projected value of <span className="font-black text-slate-900">{fmtMoney(endVal)}</span>
                    </span>
                } />
                <InsightItem text={
                    <span>
                        <span className="font-black text-slate-800">Daily Risk (VaR 95%):</span> In the worst 5% of days, you could lose up to <span className="font-black text-slate-900">{fmtPct(stats.var95)}</span> in a single day
                    </span>
                } />
                <InsightItem text={
                    <span>
                        The portfolio volatility is <span className="font-black text-slate-900">{fmtPct(stats.annVol)}</span>, indicating <span className="font-bold text-indigo-700">{getRiskLabel(stats.annVol)}</span>
                    </span>
                } />
            </ul>
        </div>
    )
}

function InsightItem({ text }) {
    return (
        <li className="flex items-start gap-3 text-slate-600 font-medium leading-relaxed">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2.5 shrink-0"></div>
            <div>{text}</div>
        </li>
    )
}

function MetricCard({ title, value, sub, color }) {
    const themes = {
        blue: 'text-blue-600 border-blue-100 bg-white/50',
        purple: 'text-purple-600 border-purple-100 bg-white/50',
        emerald: 'text-emerald-600 border-emerald-100 bg-white/50',
        orange: 'text-orange-600 border-orange-100 bg-white/50',
        red: 'text-red-500 border-red-100 bg-white/50'
    }
    const valStr = value !== undefined && value !== null ? (value * 100).toFixed(2) + '%' : '-'
    const themeClass = themes[color]

    return (
        <div className={`backdrop-blur-md border ${themeClass} rounded-3xl p-6 shadow-sm transition-all hover:shadow-md`}>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</div>
            <div className={`text-2xl font-black mb-1 tracking-tight`}>{valStr}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider opacity-60">{sub}</div>
        </div>
    )
}

// Helper Functions for Regime Alert

function inferRegimeFromWeights(weights, returns, allData) {
    // Simplified: check gold allocation
    let goldWeight = 0
    let debtWeight = 0

    weights.forEach((w, idx) => {
        const code = returns.codes[idx]
        const name = allData[code]?.name?.toLowerCase() || ''

        if (name.includes('gold')) {
            goldWeight += w
        }
        if (name.includes('debt') || name.includes('bond') || name.includes('gilt')) {
            debtWeight += w
        }
    })

    // If gold > 8%, likely Regime C
    if (goldWeight > 0.08) return 'REGIME_C'

    // If debt > 50%, likely Regime A (normal)
    if (debtWeight > 0.50) return 'REGIME_A'

    // Default to Regime B
    return 'REGIME_B'
}

function generateRegimeSuggestions(currentRegime, weights, returns, allData) {
    const suggestions = []

    if (currentRegime === 'REGIME_C') {
        // Calculate current gold allocation
        let goldWeight = 0
        weights.forEach((w, idx) => {
            const code = returns.codes[idx]
            const name = allData[code]?.name?.toLowerCase() || ''
            if (name.includes('gold')) goldWeight += w
        })

        const targetGold = 0.10 // 10%
        if (goldWeight < targetGold) {
            suggestions.push(`Increase gold allocation from ${(goldWeight * 100).toFixed(1)}% to ${(targetGold * 100).toFixed(0)}%`)
        }

        suggestions.push('Reduce long-term bond exposure to 20-25% (bonds may not hedge in this regime)')
        suggestions.push('Add short-term debt (liquid/overnight funds) for 15-20% allocation')
        suggestions.push('Consider hybrid funds for 10-12% allocation')
    }

    return suggestions
}
