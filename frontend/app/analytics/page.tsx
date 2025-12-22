'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/ProtectedRoute';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export default function AnalyticsPage() {
    const [results, setResults] = useState<any>(null);
    const [constraints, setConstraints] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [initialResults, setInitialResults] = useState<any>(null);

    useEffect(() => {
        const storedResults = sessionStorage.getItem('optimizationResults');
        const storedInitial = sessionStorage.getItem('initialOptimizationResults');
        const storedProfile = sessionStorage.getItem('clientProfile');

        if (storedResults) {
            setResults(JSON.parse(storedResults));
        }

        if (storedInitial) {
            setInitialResults(JSON.parse(storedInitial));
        }

        if (storedProfile) {
            const parsedProfile = JSON.parse(storedProfile);
            setProfile(parsedProfile);
            setConstraints(parsedProfile.constraints || {
                return_expectation: 12,
                volatility_tolerance: 15
            });
        }
    }, []);

    if (!results) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-gray-700">No Analysis Available</h2>
                        <p className="text-gray-500 mt-2">Please run an optimization first to generate analytics.</p>
                        <button
                            onClick={() => window.location.href = '/funds'}
                            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Go to Portfolio Creator
                        </button>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    const currentMetrics = results.max_sharpe_metrics;

    // Determine baseline metrics: use Initial Results if available, otherwise fallback to Constraints logic
    const baselineMetrics = initialResults?.max_sharpe_metrics || {
        expected_return: (constraints?.return_expectation || 12) / 100,
        volatility: (constraints?.volatility_tolerance || 15) / 100,
        sharpe_ratio: 0
    };

    // Label for baseline
    const baselineLabel = initialResults ? "First Optimization" : "Client Constraint";

    // Projection Chart Data
    const projectionYears = [0, 1, 2, 3, 4, 5];
    const initialInvestment = 1000000;

    const projectedValue = projectionYears.map(year =>
        initialInvestment * Math.pow(1 + (currentMetrics?.expected_return || 0.12), year)
    );

    const baselineValue = projectionYears.map(year =>
        initialInvestment * Math.pow(1 + (baselineMetrics?.expected_return || 0.10), year)
    );

    const projectionOption = {
        title: { text: 'Wealth Projection (5 Years)', left: 'center' },
        tooltip: { trigger: 'axis', formatter: (params: any) => `Year ${params[0].name}: ₹${Math.round(params[0].value).toLocaleString()}` },
        legend: { top: 'bottom' },
        xAxis: { type: 'category', data: projectionYears.map(y => `Year ${y}`) },
        yAxis: { type: 'value', name: 'Portfolio Value', axisLabel: { formatter: (v: number) => `₹${v / 100000}L` } },
        series: [
            {
                name: 'Advisor Optimization',
                type: 'line',
                data: projectedValue,
                smooth: true,
                lineStyle: { width: 4, color: '#2563eb' },
                areaStyle: { color: 'rgba(37, 99, 235, 0.1)' }
            },
            {
                name: baselineLabel,
                type: 'line',
                data: baselineValue,
                smooth: true,
                lineStyle: { width: 2, type: 'dashed', color: '#94a3b8' }
            }
        ],
        grid: { left: '10%', right: '10%', bottom: '15%', top: '15%' }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-slate-50 py-12">
                <div className="max-w-7xl mx-auto px-4">

                    {/* Header */}
                    <div className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold text-slate-800">Advisor Analytics</h1>
                            <p className="text-slate-600 mt-2 text-lg">Detailed breakdown of optimization value-add</p>
                        </div>
                        <button
                            onClick={() => window.location.href = '/results'}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center gap-2"
                        >
                            <span>←</span> Back to Results
                        </button>
                    </div>

                    {/* Impact Analysis Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8"></div>
                            <p className="text-sm font-bold text-emerald-800 uppercase tracking-wider relative z-10">Return Enhancement</p>
                            <h3 className="text-3xl font-black text-emerald-600 mt-2 relative z-10">
                                {((currentMetrics?.expected_return || 0) * 100 - (baselineMetrics?.expected_return || 0) * 100).toFixed(2)}%
                            </h3>
                            <p className="text-xs text-emerald-600/80 mt-1 relative z-10">vs {baselineLabel}</p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8"></div>
                            <p className="text-sm font-bold text-blue-800 uppercase tracking-wider relative z-10">Risk Usage</p>
                            <h3 className="text-3xl font-black text-blue-600 mt-2 relative z-10">
                                {((currentMetrics?.volatility || 0) * 100).toFixed(2)}%
                            </h3>
                            <p className="text-xs text-blue-600/80 mt-1 relative z-10">
                                vs {(baselineMetrics?.volatility * 100).toFixed(2)}% ({baselineLabel})
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-8 -mt-8"></div>
                            <p className="text-sm font-bold text-purple-800 uppercase tracking-wider relative z-10">Projected 5Y Gain</p>
                            <h3 className="text-3xl font-black text-purple-600 mt-2 relative z-10">
                                ₹{((projectedValue[5] - baselineValue[5]) / 100000).toFixed(2)}L
                            </h3>
                            <p className="text-xs text-purple-600/80 mt-1 relative z-10">Above {baselineLabel}</p>
                        </div>
                    </div>


                    {/* Comparison Table */}
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-8">
                        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">⚖️</span>
                                <h2 className="text-xl font-bold text-slate-800">Plan Comparison</h2>
                            </div>
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold uppercase rounded-full">Advisor vs {baselineLabel}</span>
                        </div>

                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-4 px-6 text-sm font-bold text-slate-500 uppercase">Metric</th>
                                    <th className="py-4 px-6 text-sm font-bold text-slate-400 uppercase bg-slate-50/50">{baselineLabel}</th>
                                    <th className="py-4 px-6 text-sm font-bold text-blue-600 uppercase bg-blue-50/50">Advisor Optimization</th>
                                    <th className="py-4 px-6 text-sm font-bold text-purple-600 uppercase bg-purple-50/50">Delta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr className="hover:bg-slate-50">
                                    <td className="py-4 px-6 font-semibold text-slate-700">Expected Return</td>
                                    <td className="py-4 px-6 text-slate-400 bg-slate-50/30">{((baselineMetrics?.expected_return || 0) * 100).toFixed(2)}%</td>
                                    <td className="py-4 px-6 text-blue-700 font-bold bg-blue-50/30">{((currentMetrics?.expected_return || 0) * 100).toFixed(2)}%</td>
                                    <td className={`py-4 px-6 font-bold ${((currentMetrics?.expected_return || 0) * 100) >= ((baselineMetrics?.expected_return || 0) * 100) ? 'text-green-600' : 'text-red-500'}`}>
                                        {(((currentMetrics?.expected_return || 0) * 100) - ((baselineMetrics?.expected_return || 0) * 100)).toFixed(2)}%
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="py-4 px-6 font-semibold text-slate-700">Annual Volatility</td>
                                    <td className="py-4 px-6 text-slate-400 bg-slate-50/30">{((baselineMetrics?.volatility || 0) * 100).toFixed(2)}%</td>
                                    <td className="py-4 px-6 text-blue-700 font-bold bg-blue-50/30">{((currentMetrics?.volatility || 0) * 100).toFixed(2)}%</td>
                                    <td className={`py-4 px-6 font-bold ${((currentMetrics?.volatility || 0) * 100) <= ((baselineMetrics?.volatility || 0) * 100) ? 'text-green-600' : 'text-orange-500'}`}>
                                        {(((currentMetrics?.volatility || 0) * 100) - ((baselineMetrics?.volatility || 0) * 100)).toFixed(2)}%
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="py-4 px-6 font-semibold text-slate-700">Sharpe Ratio</td>
                                    <td className="py-4 px-6 text-slate-400 bg-slate-50/30">{(baselineMetrics?.sharpe_ratio || 0).toFixed(2)}</td>
                                    <td className="py-4 px-6 text-blue-700 font-bold bg-blue-50/30">{(currentMetrics?.sharpe_ratio || 0).toFixed(2)}</td>
                                    <td className={`py-4 px-6 font-bold ${(currentMetrics?.sharpe_ratio || 0) >= (baselineMetrics?.sharpe_ratio || 0) ? 'text-green-600' : 'text-orange-500'}`}>
                                        {((currentMetrics?.sharpe_ratio || 0) - (baselineMetrics?.sharpe_ratio || 0)).toFixed(2)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Deep Dive Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <ReactECharts option={projectionOption} style={{ height: '400px' }} />
                        </div>
                    </div>

                </div>
            </div>
        </ProtectedRoute>
    );
}
