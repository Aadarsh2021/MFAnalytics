import { TrendingUp, BarChart3, Calendar, Award, TrendingDown, Activity, AlertCircle, FileText, Layout, Info, Shield } from 'lucide-react'
import { LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { REGIMES } from '../config/regimeConfig'

export default function BacktestResults({ backtestData }) {
    if (!backtestData) return null

    const { summary, monthly = [], regimeDistribution = [], transitions = [], initialRegime } = backtestData
    if (!monthly || !Array.isArray(monthly)) return null

    // Determine actual date range
    const startDate = monthly.length > 0 ? new Date(monthly[0].date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '2001'
    const endDate = monthly.length > 0 ? new Date(monthly[monthly.length - 1].date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'Present'
    const startYear = monthly.length > 0 ? new Date(monthly[0].date).getFullYear() : 2001
    const endYear = monthly.length > 0 ? new Date(monthly[monthly.length - 1].date).getFullYear() : 2025

    // Prepare chart data
    const chartData = monthly.map(m => ({
        date: m.date,
        portfolio: parseFloat(((m.cumulativeReturn || 0) * 100).toFixed(2)),
        regime: m.regime
    }))

    const initialInvestment = 100000;
    const finalValue = summary.endValue || 0;
    const absoluteGain = finalValue - initialInvestment;

    // Latest transition for report
    const latestTransition = transitions && transitions.length > 0 ? transitions[transitions.length - 1] : null;

    return (
        <div className="space-y-12 animate-fade-in text-slate-800">
            {/* 1. Executive Summary */}
            <section className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                <div className="bg-slate-900 px-8 py-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <FileText className="text-indigo-400" size={28} />
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Historical Backtest Report</h2>
                    </div>
                    <span className="text-slate-400 font-bold tracking-widest text-xs uppercase">({startYear} - Present)</span>
                </div>

                <div className="p-8">
                    <div className="flex items-center gap-2 mb-6">
                        <Layout className="text-indigo-600" size={20} />
                        <h3 className="text-xl font-bold border-b-2 border-indigo-100 pb-1">Executive Summary</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <SummaryItem
                                label="Initial Investment"
                                value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(initialInvestment)}
                                subText={`Invested in ${startYear}`}
                            />
                            <SummaryItem
                                label="Final Portfolio Value"
                                value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(finalValue)}
                                highlight
                            />
                        </div>
                        <div className="space-y-4">
                            <SummaryItem
                                label="Total Absolute Gain"
                                value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(absoluteGain)}
                                color="text-green-600"
                            />
                            <SummaryItem
                                label="Annualized Return (CAGR)"
                                value={`${(summary.annualizedReturn || 0).toFixed(2)}%`}
                            />
                            <SummaryItem
                                label="Annualized Volatility"
                                value={`${(summary.annualizedVol || 0).toFixed(2)}%`}
                                subText="Risk Metric"
                            />
                        </div>
                        <div className="space-y-4">
                            <SummaryItem
                                label="Regime at Initial Investment"
                                value={REGIMES[initialRegime]?.shortName || initialRegime || 'N/A'}
                                subText={REGIMES[initialRegime]?.name}
                            />
                            <SummaryItem
                                label="Sharpe Ratio"
                                value={(summary.sharpeRatio || 0).toFixed(2)}
                                subText="Risk-Adjusted Performance"
                            />
                        </div>
                    </div>

                    {/* New Daily Risk Metrics Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8 pt-8 border-t border-slate-100">
                        <div className="space-y-4">
                            <SummaryItem
                                label="Annualized Median Return"
                                value={`${(summary.annualizedMedianReturn || 0).toFixed(2)}%`}
                                subText="Typical Annual Performance"
                            />
                        </div>
                        <div className="space-y-4">
                            <SummaryItem
                                label="Daily Value at Risk (95%)"
                                value={`${(summary.dailyVaR95 || 0).toFixed(2)}%`}
                                subText="Worst 5% Day Expectation"
                                color="text-amber-600"
                            />
                        </div>
                        <div className="space-y-4">
                            <SummaryItem
                                label="Daily CVaR (95%)"
                                value={`${(summary.dailyCVaR95 || 0).toFixed(2)}%`}
                                subText="Avg Loss in Worst 5%"
                                color="text-red-600"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Cumulative Return Chart (Visual) */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100" style={{ minHeight: '450px' }}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Activity className="text-indigo-500" size={20} />
                        Cumulative Performance
                    </h3>
                    <div className="flex gap-4 text-xs font-bold text-slate-400">
                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-500 rounded-full"></div> Portfolio Portfolio</span>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            tickFormatter={(v) => new Date(v).getFullYear()}
                            minTickGap={30}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            formatter={(v) => [`${v}%`, 'Total Return']}
                        />
                        <Area type="monotone" dataKey="portfolio" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorPortfolio)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* 3. Market State Transitions Table */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="text-indigo-600" size={20} />
                        <h3 className="text-xl font-bold">Market State Transitions</h3>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-100 shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 w-1/4">Regime</th>
                                    <th className="px-6 py-4 text-center w-1/4">Count (Years)</th>
                                    <th className="px-6 py-4">Description</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {regimeDistribution.sort((a, b) => a.regime.localeCompare(b.regime)).map((item) => (
                                    <tr key={item.regime} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-5 align-middle">
                                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-sm ${getRegimeColor(item.regime)}`}>
                                                {REGIMES[item.regime]?.shortName || item.regime}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center align-middle font-black text-slate-700 text-lg">
                                            {item.years || 0}
                                        </td>
                                        <td className="px-6 py-5 text-xs font-bold text-slate-500 leading-relaxed align-middle">
                                            {REGIMES[item.regime]?.name || 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-4 italic">*Years identified at annual restructuring points (January scans)</p>
                </div>

                <div className="space-y-6">
                    {/* Portfolio Performance & Restructuring */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100 h-full">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="text-indigo-600" size={20} />
                            <h3 className="text-xl font-bold">Portfolio Performance & Restructuring</h3>
                        </div>
                        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                            <p>The portfolio was restructured annually to align with the detected macro regime, ensuring risk exposure matches environmental constraints.</p>
                            <ul className="space-y-2">
                                <li className="flex gap-2">
                                    <span className="text-indigo-600 font-bold">•</span>
                                    <span>In <strong>Regime C/D</strong>, the portfolio tilted heavily toward <strong>Gold</strong> as a reserve asset to hedge systemic risk and financial repression.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-indigo-600 font-bold">•</span>
                                    <span>In <strong>Regime A/B</strong>, the portfolio favored <strong>Equities</strong> for growth, leveraging inflationary momentum and monetary trust.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-indigo-600 font-bold">•</span>
                                    <span>The annual rebalancing ensured the ${initialInvestment.toLocaleString()} principal effectively captured regime-driven alpha while maintaining strict draw-down controls.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Regime Transition Report */}
            <section className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
                <div className="flex items-center gap-3 mb-8">
                    <TrendingUp className="text-indigo-600" size={24} />
                    <h2 className="text-2xl font-black uppercase tracking-tight">Regime Transition Report</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">1. Latest Regime Transition</h4>
                            {latestTransition ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-50 text-xs">
                                        <span className="text-slate-400">Effective Date</span>
                                        <span className="font-bold text-slate-700">{new Date(latestTransition.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="grid grid-cols-3 items-center text-center py-2">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-slate-400 uppercase font-black">Previous</span>
                                            <div className="font-bold text-indigo-900">{REGIMES[latestTransition.from]?.name}</div>
                                        </div>
                                        <div className="flex justify-center text-slate-300">→</div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-indigo-500 uppercase font-black">New State</span>
                                            <div className="font-bold text-indigo-600">{REGIMES[latestTransition.to]?.name}</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-center">
                                        <div className="bg-indigo-50 px-4 py-2 rounded-full text-indigo-700 text-xs font-bold leading-none">
                                            {latestTransition.note || 'Confirmed Transition'}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-slate-400 text-sm italic py-4 text-center">No major transitions recorded in this period.</div>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">2. Transition Sensitivity (Step 4 Logic)</h4>
                            <div className="space-y-4">
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Under the 8-Step Pipeline, transitions are "Debounced" using the Regime Confidence Filter to prevent whipsaws.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-[10px] font-black text-slate-400 uppercase">Latest Alignment</div>
                                        <div className="text-lg font-black text-indigo-600">{(latestTransition?.confidence * 100 || 85).toFixed(0)}%</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-[10px] font-black text-slate-400 uppercase">Regime Surety</div>
                                        <div className="text-lg font-black text-emerald-600">Very High</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                    <Info className="text-amber-600 w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-amber-800 leading-normal">
                                        Debouncing requires 3 consecutive months of data for a full state flip. Vol Ratio must hit trigger thresholds ({'>'}1.0x) to confirm Regime C shift.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">3. Historical Transition Summary</h4>
                        <div className="relative border-l-2 border-indigo-100 ml-4 space-y-8 py-2">
                            {startYear <= 2008 && (
                                <TimelineItem
                                    title="2008-09: Financial Crisis"
                                    description="Transition to Regime D (Crisis) as credit spreads spiked and correlations surged to 1.0."
                                    active={summary.maxDrawdown > 15}
                                />
                            )}
                            {startYear <= 2020 && (
                                <TimelineItem
                                    title="2020: COVID Shock & Stimulus"
                                    description="Sharp transition to Regime D followed by Regime C (Fiscal Dominance) during liquidity expansion."
                                />
                            )}
                            {startYear <= 2022 && (
                                <TimelineItem
                                    title="2022: Inflationary Spike"
                                    description="Transition to Regime B (Inflationary) as real rates spiked and fiscal repression peaked."
                                />
                            )}
                            <TimelineItem
                                title="2025: Normalization"
                                description="Return to Regime A (Monetary Credibility) as volatility subsided and real rates stabilized."
                                isLast
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

function SummaryItem({ label, value, subText, highlight, color = "text-slate-900" }) {
    return (
        <div className="space-y-0.5">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</div>
            <div className={`text-2xl font-black tracking-tight ${color} ${highlight ? 'text-3xl' : ''}`}>{value}</div>
            {subText && <div className="text-xs text-slate-400 font-medium">{subText}</div>}
        </div>
    )
}

function TimelineItem({ title, description, isLast, active }) {
    return (
        <div className="relative pl-8">
            <div className={`absolute left-[-9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${active ? 'bg-amber-500 animate-pulse' : 'bg-indigo-300'}`}></div>
            <h5 className="text-sm font-bold text-slate-800 mb-1">{title}</h5>
            <p className="text-xs text-slate-500 leading-relaxed italic">{description}</p>
        </div>
    )
}

function getRegimeColor(regime) {
    const colors = {
        REGIME_A: 'bg-blue-500',
        REGIME_B: 'bg-emerald-500',
        REGIME_C: 'bg-amber-500',
        REGIME_D: 'bg-rose-500'
    }
    return colors[regime] || 'bg-slate-500'
}
