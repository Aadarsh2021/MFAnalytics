import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts'
import { TrendingUp, RefreshCw, Calendar, IndianRupee, ShieldCheck, ArrowRight, TrendingDown } from 'lucide-react'

export default function BacktestingPanel({
    returns,
    allData,
    mvpResults,
    blResult
}) {
    const [initialCapital, setInitialCapital] = useState(100000)
    const [backtestData, setBacktestData] = useState(null)
    const [performanceMetrics, setPerformanceMetrics] = useState(null)
    const [activeMethod, setActiveMethod] = useState('sqp')

    // Strategies configuration
    const strategies = useMemo(() => {
        const strats = []
        if (mvpResults?.sqp) strats.push({ id: 'sqp', name: 'SQP Method', color: '#2563eb', weights: mvpResults.sqp.weights })
        if (mvpResults?.convex) strats.push({ id: 'convex', name: 'Convex Solver', color: '#16a34a', weights: mvpResults.convex.weights })
        if (mvpResults?.critical) strats.push({ id: 'critical', name: 'Critical Line', color: '#9333ea', weights: mvpResults.critical.weights })
        if (blResult) strats.push({ id: 'bl', name: 'Black-Litterman', color: '#db2777', weights: blResult.weights })
        return strats
    }, [mvpResults, blResult])

    useEffect(() => {
        if (!returns || strategies.length === 0) return

        const runBacktest = () => {
            const dates = returns.dates
            const codes = returns.codes
            const n = codes.length

            // Strategy we are currently examining
            const strat = strategies.find(s => s.id === activeMethod) || strategies[0]
            const weights = strat.weights

            // Asset Price Paths (Normalized to 100)
            const prices = {}
            codes.forEach(code => {
                let p = 100
                const assetPrices = [p]
                // Correct loop: oldest to newest
                // returns.dates is Newest to Oldest. We need Oldest to Newest.
                const chronoReturns = [...returns.dates].reverse()
                chronoReturns.forEach(date => {
                    const r = returns.returns[code][date] || 0
                    p = p * (1 + r)
                    assetPrices.push(p)
                })
                prices[code] = assetPrices
            })

            const numDays = returns.dates.length
            const daysPerYear = 252

            // 1. Simulation WITH Annual Rebalancing (Restructuring)
            const seriesWith = []
            let sharesWith = new Array(n).fill(0)
            let currentValWith = initialCapital

            // Initial Buy
            for (let i = 0; i < n; i++) {
                sharesWith[i] = (initialCapital * weights[i]) / prices[codes[i]][0]
            }

            for (let t = 0; t <= numDays; t++) {
                let v = 0
                for (let i = 0; i < n; i++) v += sharesWith[i] * prices[codes[i]][t]
                currentValWith = v
                seriesWith.push(v)

                // Rebalance every year
                if (t > 0 && t % daysPerYear === 0 && t < numDays) {
                    for (let i = 0; i < n; i++) {
                        sharesWith[i] = (currentValWith * weights[i]) / prices[codes[i]][t]
                    }
                }
            }

            // 2. Simulation WITHOUT Rebalancing (Buy & Hold)
            const seriesWithout = []
            let sharesWithout = new Array(n).fill(0)
            for (let i = 0; i < n; i++) {
                sharesWithout[i] = (initialCapital * weights[i]) / prices[codes[i]][0]
            }

            for (let t = 0; t <= numDays; t++) {
                let v = 0
                for (let i = 0; i < n; i++) v += sharesWithout[i] * prices[codes[i]][t]
                seriesWithout.push(v)
            }

            // 3. Format Chart Data
            const chronoDates = ['Start', ...[...returns.dates].reverse()]
            const chartData = chronoDates.map((date, t) => ({
                date,
                withRebalance: seriesWith[t],
                noRebalance: seriesWithout[t]
            }))

            // 4. Metrics
            const finalWith = seriesWith[numDays]
            const finalWithout = seriesWithout[numDays]
            const totalGainWith = finalWith - initialCapital
            const totalGainWithout = finalWithout - initialCapital
            const restructuringAlpha = totalGainWith - totalGainWithout

            const years = numDays / daysPerYear
            const cagrWith = Math.pow(finalWith / initialCapital, 1 / years) - 1

            // Max Drawdown (With Rebalance)
            let peak = seriesWith[0]
            let mdd = 0
            seriesWith.forEach(v => {
                if (v > peak) peak = v
                const dd = (peak - v) / peak
                if (dd > mdd) mdd = dd
            })

            setBacktestData(chartData)
            setPerformanceMetrics({
                finalValue: finalWith,
                totalProfit: totalGainWith,
                cagr: cagrWith,
                mdd: mdd,
                alpha: restructuringAlpha,
                returnPct: (totalGainWith / initialCapital) * 100
            })
        }

        runBacktest()
    }, [returns, strategies, initialCapital, activeMethod])

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)
    }

    if (!returns || strategies.length === 0) return null

    return (
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100 animate-fade-in mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                        <TrendingUp className="text-white" size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">Backtesting Simulation</h3>
                        <p className="text-slate-500 font-medium">Historical Returns if BL Weights Were Applied (Base: ₹{initialCapital.toLocaleString()})</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    {strategies.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setActiveMethod(s.id)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeMethod === s.id ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
            </div>

            {performanceMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <MetricCard title="Final Value" value={formatCurrency(performanceMetrics.finalValue)} icon={<IndianRupee className="text-green-500" />} color="emerald" />
                    <MetricCard title="Net Profit" value={formatCurrency(performanceMetrics.totalProfit)} icon={<TrendingUp className="text-blue-500" />} color="blue" subtitle={`${performanceMetrics.returnPct.toFixed(1)}% Total Return`} />
                    <MetricCard title="CAGR" value={`${(performanceMetrics.cagr * 100).toFixed(2)}%`} icon={<Calendar className="text-purple-500" />} color="purple" subtitle="Annualized growth" />
                    <MetricCard
                        title="Restructuring Gain"
                        value={formatCurrency(performanceMetrics.alpha)}
                        icon={<RefreshCw className={performanceMetrics.alpha >= 0 ? "text-indigo-500" : "text-orange-500"} />}
                        color={performanceMetrics.alpha >= 0 ? "indigo" : "orange"}
                        subtitle="Value added by Rebalancing"
                    />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 h-[450px] bg-slate-50 rounded-3xl p-6 border border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Growth Comparison</h4>
                        <div className="flex gap-4">
                            <LegendItem color="#4f46e5" label="With Restructuring" />
                            <LegendItem color="#94a3b8" label="No Rebalancing" />
                        </div>
                    </div>
                    {backtestData && (
                        <ResponsiveContainer width="100%" height="85%">
                            <AreaChart data={backtestData}>
                                <defs>
                                    <linearGradient id="colorWith" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(t) => t === 'Start' ? t : t.split('-')[2]} // Show Year
                                    minTickGap={60}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    axisLine={false}
                                />
                                <YAxis
                                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    axisLine={false}
                                />
                                <Tooltip
                                    content={<CustomTooltip />}
                                />
                                <Area type="monotone" dataKey="withRebalance" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorWith)" />
                                <Area type="monotone" dataKey="noRebalance" stroke="#94a3b8" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100">
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldCheck size={24} />
                            <h4 className="font-bold">Portfolio Health</h4>
                        </div>
                        <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                            Annual restructuring keeps your risk consistent. {performanceMetrics?.alpha > 0 ?
                                `It added ${formatCurrency(performanceMetrics.alpha)} to your portfolio compared to a simple buy-and-hold strategy.` :
                                `During this specific period, the rebalancing cost around ${formatCurrency(Math.abs(performanceMetrics?.alpha))} but ensured your asset mix never deviated from the optimized model.`}
                        </p>
                        <div className="space-y-4">
                            <HealthMetric label="Max Drawdown" value={`${(performanceMetrics?.mdd * 100).toFixed(1)}%`} />
                            <HealthMetric label="Time Horizon" value={`${(returns.dates.length / 252).toFixed(1)} Years`} />
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Initial Allocation Input</h4>
                        <div className="relative">
                            <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="number"
                                value={initialCapital}
                                onChange={(e) => setInitialCapital(Number(e.target.value))}
                                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-3 font-medium">
                            Adjust capital to see how it scales. The system simulates daily movements from inception.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function MetricCard({ title, value, icon, color, subtitle }) {
    const bgColors = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        orange: 'bg-orange-50 text-orange-700 border-orange-100'
    }
    return (
        <div className={`p-6 rounded-3xl border-2 transition-all hover:shadow-lg ${bgColors[color]}`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</span>
                {icon}
            </div>
            <p className="text-xl font-black">{value}</p>
            {subtitle && <p className="text-[10px] font-bold mt-1 opacity-60 uppercase">{subtitle}</p>}
        </div>
    )
}

function HealthMetric({ label, value }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-indigo-500/30">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">{label}</span>
            <span className="font-black text-white">{value}</span>
        </div>
    )
}

function LegendItem({ color, label }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{label}</span>
        </div>
    )
}

function CustomTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 blur-backdrop">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                <div className="space-y-2">
                    <div className="flex justify-between gap-6">
                        <span className="text-xs font-bold text-indigo-300">Restructured:</span>
                        <span className="text-xs font-black">₹{payload[0].value.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                        <span className="text-xs font-bold text-slate-400">Buy & Hold:</span>
                        <span className="text-xs font-black">₹{payload[1].value.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-white/10 flex justify-between gap-6">
                        <span className="text-[10px] font-black text-emerald-400 uppercase">Difference:</span>
                        <span className="text-[10px] font-black text-emerald-400">₹{(payload[0].value - payload[1].value).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        )
    }
    return null
}
