import { useState } from 'react'
import { Calculator, CheckCircle, Settings, Info, TrendingUp, ShieldAlert, Zap, ArrowRight } from 'lucide-react'
import { calculateBlackLitterman } from '../utils/optimization.js'

export default function Step5BlackLitterman({
    returns,
    allData,
    views,
    setBlResult,
    blResult,
    showMessage,
    goToStep,
    selectedFunds,
    regimeContext,  // NEW: For regime alerts in final report
    weightMethod,   // NEW: Market Cap / Equal / Custom
    customWeights   // NEW: Custom weights if selected
}) {
    const [isCalculating, setIsCalculating] = useState(false)
    const [params, setParams] = useState({
        riskFreeRate: 0.04,
        riskAversion: 2.5,
        tau: 0.025
    })
    const [showAdvanced, setShowAdvanced] = useState(false)

    const handleCalculate = () => {
        setIsCalculating(true)
        // Give UI time to show spinner
        setTimeout(() => {
            try {
                // Check if Neutral view is active (Equal Weight requested)
                const hasNeutralView = views.some(v => v.type === 'neutral' && v.useEqualWeight)

                let marketWeights = null

                if (!hasNeutralView) {
                    console.log("Calculating Market Weights from:", selectedFunds)
                    // Calculate Market Weights from Market Cap
                    const caps = returns.codes.map(code => {
                        // Improved matching with string coercion
                        const fund = selectedFunds.find(f => String(f.code) === String(code))

                        if (!fund) {
                            console.warn(`Fund ${code} not found in selectedFunds during weight calc`)
                            return 0
                        }

                        // Try to get market cap from various potential keys
                        const rawVal = fund.marketCap || fund.aum || fund.mCap

                        // Parse safely
                        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
                            const cap = parseFloat(rawVal)
                            return !isNaN(cap) && cap > 0 ? cap : 0
                        }
                        return 0
                    })

                    const totalCap = caps.reduce((a, b) => a + b, 0)

                    if (totalCap > 0) {
                        marketWeights = caps.map(c => c / totalCap)
                        console.log("✓ Using Market Cap-based Weights:", caps, "→ Weights:", marketWeights)
                    } else {
                        console.warn("⚠️ Total Market Cap is 0. Caps array:", caps)
                        console.warn("Falling back to Equal Weight")
                    }
                } else {
                    console.log("Neutral view selected - using Equal Weight allocation")
                }

                const result = calculateBlackLitterman(returns, views, {
                    tau: params.tau,
                    riskAversion: params.riskAversion,
                    marketWeights: marketWeights
                })
                result.params = params
                result.regimeContext = regimeContext  // Store for alerts
                result.weightMethod = weightMethod    // Store weight method used
                setBlResult(result)
                showMessage('success', 'Black-Litterman optimization complete!')
            } catch (e) {
                showMessage('error', 'Black-Litterman failed: ' + e.message)
            } finally {
                setIsCalculating(false)
            }
        }, 100)
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-8 animate-fade-in border border-slate-100">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Zap className="text-purple-600" size={28} />
                            Step 5: Black-Litterman Engine
                        </h2>
                        <p className="text-gray-500 mt-1">Merging market equilibrium with your subjective views for an optimized portfolio.</p>
                    </div>
                </div>

                {/* Parameter Settings */}
                <div className="mb-8 bg-slate-50 border-2 border-slate-100 rounded-3xl p-6">
                    <div className="flex justify-between items-center cursor-pointer group" onClick={() => setShowAdvanced(!showAdvanced)}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-xl shadow-sm group-hover:bg-purple-50 transition">
                                <Settings className="text-slate-400 group-hover:text-purple-600" size={20} />
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

                <button
                    onClick={handleCalculate}
                    disabled={isCalculating}
                    className="w-full px-8 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl hover:from-purple-700 hover:to-indigo-700 font-bold text-xl flex items-center justify-center gap-3 transition-all hover-lift shadow-xl shadow-purple-100 disabled:opacity-50"
                >
                    {isCalculating ? (
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Calculator size={24} />
                    )}
                    {isCalculating ? 'Computing Bayes Posterior...' : 'Generate Optimized Portfolio'}
                </button>
            </div>

            {blResult && (
                <div className="animate-fade-in-up space-y-6">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>

                        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                                    <TrendingUp className="text-purple-400" size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white">Black-Litterman Result</h3>
                                    <p className="text-slate-400 text-sm">Post-View Optimized Allocations</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center min-w-[140px]">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Expected Return</p>
                                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                        {(blResult.expectedReturn * 100).toFixed(2)}%
                                    </p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center min-w-[140px]">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Portfolio Risk</p>
                                    <p className="text-3xl font-black text-white">
                                        {(blResult.vol * 100).toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {blResult.weights.map((w, i) => (w > 0.005) && (
                                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition">
                                    <div className="flex flex-col max-w-[70%]">
                                        <span className="text-slate-300 font-bold text-xs truncate" title={allData[returns.codes[i]].name}>
                                            {allData[returns.codes[i]].name}
                                        </span>
                                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">Weight Allocation</span>
                                    </div>
                                    <span className="text-xl font-black text-purple-400">
                                        {(w * 100).toFixed(1)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => goToStep(6)}
                        className="w-full px-8 py-5 bg-white border-2 border-slate-200 text-slate-800 rounded-2xl hover:bg-slate-50 hover:border-slate-300 font-black text-xl flex items-center justify-center gap-3 transition-all hover-lift"
                    >
                        Proceed to Monte Carlo Simulation
                        <ArrowRight size={24} />
                    </button>
                </div>
            )}
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
                className="w-full bg-slate-50 border-none p-2 rounded-lg text-lg font-black text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
            />
        </div>
    )
}
