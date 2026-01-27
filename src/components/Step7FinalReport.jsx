import { useState, useMemo } from 'react'
import { Download, RotateCcw, TrendingUp, Activity, Award, CheckCircle, Info, Database, Save, ArrowRight, ShieldCheck, PieChart, TrendingDown } from 'lucide-react'
import { downloadReport } from '../utils/export.js'
import { supabase } from '../utils/supabase'
import BacktestingPanel from './BacktestingPanel'
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
    customWeights
}) {
    const handleDownload = (method) => {
        try {
            downloadReport(method, returns, allData, mvpResults, blResult)
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
                funds: returns.codes.map(c => allData[c].name),
                state: {
                    selectedFunds,
                    allData,
                    aligned,
                    returns,
                    mvpResults,
                    blResult,
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
            const portfolioRegime = inferRegimeFromWeights(blResult.weights, returns, allData)

            if (currentRegime !== portfolioRegime) {
                setRegimeMismatch({
                    currentRegime,
                    portfolioRegime,
                    suggestions: generateRegimeSuggestions(currentRegime, blResult.weights, returns, allData)
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
            const n = weights.length
            let expectedReturn = 0
            for (let i = 0; i < n; i++) {
                const code = returns.codes[i]
                const avgReturn = returns.dates.reduce((sum, date) => sum + (returns.returns[code][date] || 0), 0) / returns.dates.length
                expectedReturn += weights[i] * avgReturn
            }

            let variance = 0
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    const codeI = returns.codes[i]
                    const codeJ = returns.codes[j]
                    let cov = 0
                    const meanI = returns.dates.reduce((sum, date) => sum + (returns.returns[codeI][date] || 0), 0) / returns.dates.length
                    const meanJ = returns.dates.reduce((sum, date) => sum + (returns.returns[codeJ][date] || 0), 0) / returns.dates.length
                    returns.dates.forEach(date => {
                        cov += ((returns.returns[codeI][date] || 0) - meanI) * ((returns.returns[codeJ][date] || 0) - meanJ)
                    })
                    cov /= (returns.dates.length - 1)
                    variance += weights[i] * weights[j] * cov
                }
            }

            const volatility = Math.sqrt(variance)
            return {
                annReturn: expectedReturn * 252,
                annVol: volatility * Math.sqrt(252),
                sharpe: (expectedReturn * 252) / (volatility * Math.sqrt(252))
            }
        }

        return {
            sqp: calc(mvpResults?.sqp?.weights),
            convex: calc(mvpResults?.convex?.weights),
            critical: calc(mvpResults?.critical?.weights),
            bl: calc(blResult?.weights),
            regime: calc(regimeResult?.weights) // NEW
        }
    }, [returns, mvpResults, blResult])

    // Calculate Asset Class Weights for selected regime validation
    const assetClassWeights = useMemo(() => {
        if (!blResult || !selectedFunds || !returns) return null

        const fundAssetMap = mapFundsToAssetClasses(selectedFunds)
        const weightsMap = {}
        returns.codes.forEach((code, i) => {
            weightsMap[code] = blResult.weights[i]
        })

        return calculateAssetClassWeights(weightsMap, fundAssetMap)
    }, [blResult, selectedFunds, returns])

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
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-48 -mt-48"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <CheckCircle className="text-white" size={40} />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black tracking-tighter">Final Portfolio Report</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Optimization Complete • {returns?.codes.length} Funds Analyzed</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                        <ActionButton onClick={saveAnalysis} icon={<Save size={20} />} label="Save to History" color="indigo" />
                        <ActionButton onClick={startOver} icon={<RotateCcw size={20} />} label="New Analysis" color="slate" />
                    </div>
                </div>

                <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 pt-10 border-t border-white/10">
                    <DownloadBtn onClick={() => handleDownload('sqp')} label="SQP Weights" active={!!mvpResults?.sqp} color="blue" />
                    <DownloadBtn onClick={() => handleDownload('convex')} label="Convex Weights" active={!!mvpResults?.convex} color="emerald" />
                    <DownloadBtn onClick={() => handleDownload('critical')} label="Critical Weights" active={!!mvpResults?.critical} color="purple" />
                    <DownloadBtn onClick={() => handleDownload('regime')} label="Regime Weights" active={!!regimeResult} color="orange" />
                    <DownloadBtn onClick={() => handleDownload('blacklitterman')} label="Black-Litterman" active={!!blResult} color="pink" />
                </div>
            </div>

            {blResult && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <BLSummaryCard blResult={blResult} returns={returns} />
                    </div>
                    <div className="lg:col-span-1">
                        <RegimeAllocationChart
                            selectedRegime={selectedRegimeId}
                            assetClassWeights={assetClassWeights}
                        />
                    </div>
                </div>
            )}

            {/* Backtesting - Priority View */}
            <BacktestingPanel
                returns={returns}
                allData={allData}
                mvpResults={mvpResults}
                blResult={blResult}
            />

            {/* Performance Comparison Table */}
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
                                <th className="px-8 py-5 text-center text-sm font-black text-orange-600">Regime</th>
                                <th className="px-8 py-5 text-center text-sm font-black text-pink-600">B-L</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            <ComparisonRow label="Exp. Annual Return"
                                v1={metrics.sqp?.annReturn}
                                v2={metrics.convex?.annReturn}
                                v3={metrics.critical?.annReturn}
                                v4={metrics.regime?.annReturn}
                                v5={metrics.bl?.annReturn}
                                isPct
                            />
                            <ComparisonRow label="Annual Volatility"
                                v1={metrics.sqp?.annVol}
                                v2={metrics.convex?.annVol}
                                v3={metrics.critical?.annVol}
                                v4={metrics.regime?.annVol}
                                v5={metrics.bl?.annVol}
                                isPct
                                inverse
                            />
                            <ComparisonRow label="Sharpe Ratio"
                                v1={metrics.sqp?.sharpe}
                                v2={metrics.convex?.sharpe}
                                v3={metrics.critical?.sharpe}
                                v4={metrics.regime?.sharpe}
                                v5={metrics.bl?.sharpe}
                            />
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Diversification Insight */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] p-10 text-white shadow-xl">
                    <div className="flex items-center gap-4 mb-6">
                        <PieChart size={32} />
                        <h3 className="text-2xl font-black tracking-tight">Allocation Insights</h3>
                    </div>
                    <p className="text-indigo-100 font-medium leading-relaxed mb-8">
                        The Black-Litterman model adjusted the weights to favor your subjective views.
                        Compared to the SQP Minimum Variance method, this portfolio is more {blResult?.weights?.every(w => w < 0.5) ? 'diversified' : 'targeted'}
                        towards specific high-conviction assets.
                    </p>
                    <div className="bg-white/10 rounded-3xl p-6 border border-white/20">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Effective Diversification</span>
                            <span className="text-xl font-black">Medium-High</span>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 w-3/4 rounded-full"></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 flex flex-col justify-center">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                            <ShieldCheck size={28} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800">Next Steps</h3>
                    </div>
                    <ul className="space-y-4">
                        <StepItem icon={<ArrowRight size={14} />} text="Review the Daily Returns CSV to audit alignment." />
                        <StepItem icon={<ArrowRight size={14} />} text="Use Backtesting metrics to validate risk appetite." />
                        <StepItem icon={<ArrowRight size={14} />} text="Monitor monthly for views drift." />
                    </ul>
                </div>
            </div>
        </div>
    )
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

function ComparisonRow({ label, v1, v2, v3, v4, v5, isPct = false, inverse = false }) {
    const format = (v) => {
        if (v === undefined || v === null) return '-'
        return isPct ? (v * 100).toFixed(2) + '%' : v.toFixed(3)
    }
    return (
        <tr className="hover:bg-slate-50/50 transition">
            <td className="px-8 py-5 text-sm font-bold text-slate-500">{label}</td>
            <td className="px-8 py-5 text-center font-black text-slate-800">{format(v1)}</td>
            <td className="px-8 py-5 text-center font-black text-slate-800">{format(v2)}</td>
            <td className="px-8 py-5 text-center font-black text-slate-800">{format(v3)}</td>
            <td className="px-8 py-5 text-center font-black text-slate-800">{format(v4)}</td>
            <td className="px-8 py-5 text-center font-black text-slate-800">{format(v5)}</td>
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

function BLSummaryCard({ blResult, returns }) {
    const stats = useMemo(() => {
        if (!blResult?.weights || !returns) return null

        // Calculate series
        const series = []
        returns.dates.forEach(date => {
            let sum = 0
            returns.codes.forEach((code, i) => {
                sum += blResult.weights[i] * (returns.returns[code][date] || 0)
            })
            series.push(sum)
        })

        if (!series.length) return null

        // Stats
        const meanDaily = series.reduce((a, b) => a + b, 0) / series.length
        const annReturn = meanDaily * 252

        const variance = series.reduce((sum, val) => sum + Math.pow(val - meanDaily, 2), 0) / (series.length - 1)
        const stdDevDaily = Math.sqrt(variance)
        const annVol = stdDevDaily * Math.sqrt(252)

        // Median - Sorted
        const sorted = [...series].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        const medianDaily = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
        const medianAnn = medianDaily * 252

        // VaR 95% (Daily) - 5th percentile
        const idx5 = Math.floor(sorted.length * 0.05)
        const var95 = sorted[idx5]

        // CVaR 95% (Daily) - Avg of worst 5%
        const worst5 = sorted.slice(0, idx5 + 1)
        const cvar95 = worst5.reduce((a, b) => a + b, 0) / worst5.length

        return { annReturn, annVol, medianAnn, var95, cvar95 }
    }, [blResult, returns])

    if (!stats) return null

    return (
        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 mb-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-black text-slate-900">
                    {blResult?.optimizationPath === 'regime' ? 'Regime Optimized' : 'Black-Litterman'} Results Summary
                </h3>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-8 text-indigo-900/70 text-xs font-bold flex items-center gap-2">
                <Info size={16} />
                Note: All metrics below are displayed in annualized terms (converted from daily data)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricCard title="Expected Return (Annual)" value={stats.annReturn} sub="Over 1 year" color="blue" />
                <MetricCard title="Volatility (Annual)" value={stats.annVol} sub="Annualized standard deviation" color="purple" />
                <MetricCard title="Median Return" value={stats.medianAnn} sub="Over 1 year" color="emerald" />
                <MetricCard title="VaR 95% (Daily)" value={stats.var95} sub="Worst-case single-day loss" color="orange" />
                <MetricCard title="CVaR 95% (Daily)" value={stats.cvar95} sub="Avg loss in worst 5% of days" color="red" />
            </div>

            <div className="mt-8">
                <KeyInsights stats={stats} />
            </div>
        </div>
    )
}

function KeyInsights({ stats }) {
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
                        With <span className="font-bold">10,000 simulations</span> over 1 year, your Black-Litterman portfolio return is <span className="font-black text-slate-900">{fmtPct(totalReturn)}</span>
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
        blue: 'text-blue-600 bg-blue-50',
        purple: 'text-purple-600 bg-purple-50',
        emerald: 'text-emerald-600 bg-emerald-50',
        orange: 'text-orange-600 bg-orange-50',
        red: 'text-red-500 bg-red-50' // Use red-500 for better contrast
    }
    const valStr = (value * 100).toFixed(2) + '%'
    const [textColor, bgColor] = themes[color].split(' ')

    return (
        <div className={`${bgColor} rounded-2xl p-6 transition-all hover:scale-[1.02]`}>
            <div className="text-sm font-bold text-slate-600 mb-1">{title}</div>
            <div className={`text-3xl font-black ${textColor} mb-2 tracking-tight`}>{valStr}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{sub}</div>
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
