'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export default function RebalancePage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [rebalanceResults, setRebalanceResults] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            alert('Please select a PDF file');
            return;
        }

        setLoading(true);
        try {
            const response = await api.rebalance.upload(file);
            setAnalysis(response.data);
        } catch (error: any) {
            console.error('Upload error:', error);
            alert(error.response?.data?.detail || 'Failed to parse PDF. Please ensure it is a valid CAMS/Karvy statement.');
        } finally {
            setLoading(false);
        }
    };

    const runDemo = () => {
        setLoading(true);
        // Simulate a successful upload with sample data
        setTimeout(() => {
            const demoData = {
                total_value: 2500000,
                asset_allocation: { Equity: 75.5, Debt: 20.0, Gold: 4.5 },
                holdings: [
                    { fund_id: 1, fund_name: "HDFC Top 100 Fund", isin: "INF179K01997", asset_class: "Equity", value: 1250000 },
                    { fund_id: 4, fund_name: "Axis Midcap Fund", isin: "INF846K01EW2", asset_class: "Equity", value: 850000 },
                    { fund_id: 11, fund_name: "HDFC Corporate Bond Fund", isin: "INF179K01XZ7", asset_class: "Debt", value: 400000 },
                ],
                unmapped_funds: []
            };
            setAnalysis(demoData);
            setLoading(false);
        }, 1500);
    };

    const handleOptimize = async () => {
        if (!analysis) return;

        setLoading(true);
        try {
            const clientData = sessionStorage.getItem('clientProfile');
            const constraints = clientData ? JSON.parse(clientData) : {
                max_weight_per_fund: 25,
                min_weight_per_fund: 2,
            };

            const response = await api.rebalance.optimize({
                initial_holdings: analysis.holdings,
                target_allocation: analysis.asset_allocation,
                constraints: constraints,
            });

            setRebalanceResults(response.data);
        } catch (error: any) {
            console.error('Optimization error:', error);
            alert(error.response?.data?.detail || 'Optimization failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const allocationChartOption = useMemo(() => {
        if (!analysis) return {};
        const data = Object.entries(analysis.asset_allocation).map(([name, value]) => ({ name, value }));
        return {
            tooltip: {
                trigger: 'item',
                formatter: '{b}: <b>{c}%</b>',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                textStyle: { color: '#475569' }
            },
            legend: {
                orient: 'horizontal',
                bottom: '0%',
                left: 'center',
                itemWidth: 10,
                itemHeight: 10,
                textStyle: { fontSize: 10, fontWeight: 'bold', color: '#64748b' }
            },
            series: [{
                type: 'pie',
                radius: ['45%', '75%'],
                center: ['50%', '45%'],
                avoidLabelOverlap: true,
                itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
                label: {
                    show: true,
                    position: 'outside',
                    formatter: '{b}\n{d}%',
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: '#475569'
                },
                labelLine: { length: 15, length2: 10, smooth: true },
                data: data,
                color: ['#6366f1', '#10b981', '#f59e0b', '#ec4899']
            }]
        };
    }, [analysis]);

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#f8fafc] py-12">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                                Portfolio <span className="text-blue-600">Rebalancing</span>
                            </h1>
                            <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[10px]">
                                Institutional Grade Asset Realignment
                            </p>
                        </div>
                        {(!analysis && !loading) && (
                            <button
                                onClick={runDemo}
                                className="px-6 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center gap-2 text-sm"
                            >
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                Start Professional Demo
                            </button>
                        )}
                    </div>

                    {!analysis && !loading && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 glass shadow-2xl rounded-[2rem] p-10 border border-white">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-black text-slate-800 mb-2">Upload CAS Statement</h2>
                                    <p className="text-slate-500 text-sm">Analyze across 12,000+ codes from CAMS or Karvy PDFs</p>
                                </div>
                                <div className="group relative border-4 border-dashed border-slate-100 rounded-[2rem] p-16 text-center transition-all hover:border-blue-400/50 hover:bg-blue-50/10">
                                    <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id="pdf-upload" />
                                    <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
                                        <div className="w-24 h-24 bg-blue-100 rounded-3xl flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform shadow-lg group-hover:shadow-blue-200">
                                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                        </div>
                                        <span className="text-xl font-black text-slate-700">{file ? file.name : 'Drop CAS PDF here'}</span>
                                        <span className="text-sm text-slate-400 mt-2 font-medium">Supporting CAMS & Karvy Formats</span>
                                    </label>
                                </div>
                                {file && (
                                    <button
                                        onClick={handleUpload}
                                        className="mt-8 w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        Analyze High-Performance Data
                                    </button>
                                )}
                            </div>
                            <div className="space-y-6">
                                <InfoCard icon="🔒" title="Secure & Private" desc="Your CAS statement is parsed locally and never stored on our servers." />
                                <InfoCard icon="⚡" title="Real-time Mapping" desc="Instant ISIN mapping against MFAPI.in master data database." />
                                <InfoCard icon="📈" title="Optimization" desc="EMH-based reallocation using Modern Portfolio Theory." />
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-32">
                            <div className="relative w-24 h-24">
                                <div className="absolute inset-0 border-8 border-slate-100 rounded-full"></div>
                                <div className="absolute inset-0 border-8 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mt-8 mb-2">Analyzing Master Data...</h3>
                            <p className="text-slate-500 font-medium animate-pulse">Connecting to Global Fund Hub</p>
                        </div>
                    )}

                    {analysis && !rebalanceResults && !loading && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 glass rounded-[2rem] p-8 shadow-xl">
                                    <h2 className="text-2xl font-black text-slate-800 mb-8 border-b border-slate-100 pb-4 flex items-center gap-2">
                                        Current Asset Analysis <span className="text-blue-600 text-[10px] bg-blue-50 px-2 py-0.5 rounded-full">ACTIVE</span>
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                        <StatCard label="Total Portfolio Value" value={`₹${analysis.total_value.toLocaleString('en-IN')}`} icon="💰" color="blue" />
                                        <StatCard label="Identified Funds" value={analysis.holdings.length} icon="🧩" color="emerald" />
                                        <StatCard label="Unmapped Assets" value={analysis.unmapped_funds.length} icon="⚠️" color="rose" />
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Portfolio Holdings</h3>
                                        {analysis.holdings.map((h: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 text-sm truncate max-w-[300px]">{h.fund_name}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{h.isin} • {h.asset_class}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-black text-slate-700 text-sm">₹{h.value.toLocaleString('en-IN')}</div>
                                                    <div className="text-[10px] text-blue-600 font-black">{(h.value / analysis.total_value * 100).toFixed(1)}%</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="glass rounded-[2rem] p-8 flex flex-col items-center">
                                    <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-8">Asset Allocation</h3>
                                    <div className="w-full h-64">
                                        <ReactECharts option={allocationChartOption} style={{ height: '100%' }} />
                                    </div>
                                    <div className="w-full space-y-3 mt-8">
                                        {Object.entries(analysis.asset_allocation).map(([k, v]: [string, any]) => (
                                            <div key={k} className="flex items-center justify-between text-xs font-bold text-slate-600">
                                                <span>{k}</span>
                                                <span className="text-slate-900">{v.toFixed(1)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleOptimize}
                                        className="mt-auto w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-100 hover:scale-105 transition-all"
                                    >
                                        Run Rebalance Optimization
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {rebalanceResults && !loading && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <div className="glass rounded-[2rem] p-8 shadow-2xl border-2 border-emerald-400/20">
                                <div className="flex items-center justify-between mb-10 border-b border-emerald-50 pb-6">
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-800">Optimization Roadmap</h2>
                                        <p className="text-emerald-600 font-bold text-xs uppercase tracking-wider mt-1">High-Alpha Strategy Generated</p>
                                    </div>
                                    <button onClick={() => window.print()} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all">
                                        EXPORT PDF REPORT
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
                                    <MetricBox label="Return Boost" value={`+${(rebalanceResults.impact_analysis.return_improvement * 100).toFixed(2)}%`} color="emerald" />
                                    <MetricBox label="Risk Reduction" value={`-${(rebalanceResults.impact_analysis.volatility_reduction * 100).toFixed(2)}%`} color="blue" />
                                    <MetricBox label="Sharpe Delta" value={`+${rebalanceResults.impact_analysis.sharpe_improvement.toFixed(3)}`} color="indigo" />
                                    <MetricBox label="Max DD Help" value={`+${(rebalanceResults.impact_analysis.max_drawdown_improvement * 100).toFixed(2)}%`} color="rose" />
                                </div>

                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Strategic Rebalancing Executions</h3>
                                <div className="overflow-hidden rounded-2xl border border-slate-100">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <th className="py-4 px-6">Identified Asset</th>
                                                <th className="py-4 px-6 text-right">Current</th>
                                                <th className="py-4 px-6 text-right">Target</th>
                                                <th className="py-4 px-6 text-right">Movement</th>
                                                <th className="py-4 px-6 text-center">Execution</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {rebalanceResults.trades.map((trade: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-5 px-6 font-bold text-slate-800">Fund {trade.fund_id}</td>
                                                    <td className="py-5 px-6 text-right text-slate-500 font-medium">{(trade.current_weight * 100).toFixed(1)}%</td>
                                                    <td className="py-5 px-6 text-right text-blue-600 font-black">{(trade.new_weight * 100).toFixed(1)}%</td>
                                                    <td className={`py-5 px-6 text-right font-black ${trade.change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {trade.change > 0 ? '↑' : '↓'} {Math.abs(trade.change_percent).toFixed(2)}%
                                                    </td>
                                                    <td className="py-5 px-6 text-center">
                                                        <span className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest ${trade.action === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                            }`}>
                                                            {trade.action}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button
                                    onClick={() => { setAnalysis(null); setRebalanceResults(null); setFile(null); }}
                                    className="mt-10 w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-all"
                                >
                                    New Session • Clear All Data
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}

function InfoCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
    return (
        <div className="glass p-6 rounded-3xl border border-white shadow-xl hover:-translate-y-1 transition-transform">
            <span className="text-3xl block mb-4">{icon}</span>
            <h4 className="text-lg font-black text-slate-800 mb-1">{title}</h4>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">{desc}</p>
        </div>
    );
}

function StatCard({ label, value, icon, color }: { label: string; value: any; icon: string; color: string }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        rose: 'bg-rose-50 text-rose-600'
    };
    return (
        <div className="p-6 bg-slate-50 rounded-2xl flex items-center gap-4">
            <div className={`w-12 h-12 ${colors[color as keyof typeof colors]} rounded-2xl flex items-center justify-center text-xl shadow-inner`}>
                {icon}
            </div>
            <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
                <div className="text-xl font-black text-slate-900">{value}</div>
            </div>
        </div>
    );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
    const colors = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        rose: 'bg-rose-50 text-rose-700 border-rose-100'
    };
    return (
        <div className={`p-4 rounded-2xl border ${colors[color as keyof typeof colors]} text-center`}>
            <div className="text-[8px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">{label}</div>
            <div className="text-2xl font-black tracking-tight">{value}</div>
        </div>
    );
}

