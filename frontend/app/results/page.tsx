'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/ProtectedRoute';

// Dynamically import ECharts to avoid SSR issues
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface OptimizationResults {
    mvp_weights: Record<number, number>;
    max_sharpe_weights: Record<number, number>;
    mvp_metrics: any;
    max_sharpe_metrics: any;
    efficient_frontier: Array<{
        return: number;
        volatility: number;
        sharpe: number;
        weights: number[];
    }>;
    monte_carlo_portfolios?: Array<{
        return: number;
        volatility: number;
        sharpe: number;
        weights: number[];
    }>;
    simulation_stats?: {
        return_min: number;
        return_max: number;
        volatility_min: number;
        volatility_max: number;
        sharpe_min: number;
        sharpe_max: number;
    };
    max_sharpe_portfolio?: {
        allocations: Array<{ fund_id: number; fund_name: string; weight: number }>;
    };
    min_volatility_portfolio?: {
        allocations: Array<{ fund_id: number; fund_name: string; weight: number }>;
    };
    benchmark_metrics?: any;
    benchmark_name?: string;
}

export default function ResultsPage() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<OptimizationResults | null>(null);
    const [selectedPortfolio, setSelectedPortfolio] = useState<'mvp' | 'max_sharpe' | 'custom'>('max_sharpe');
    const [customWeights, setCustomWeights] = useState<Record<number, number>>({});
    const [customMetrics, setCustomMetrics] = useState<any>(null);
    const [adjusting, setAdjusting] = useState(false);
    const [fundDetails, setFundDetails] = useState<any[]>([]);
    const [showFundInfo, setShowFundInfo] = useState(false);
    const [customBenchmarkMetrics, setCustomBenchmarkMetrics] = useState<any>(null);
    const [constraints, setConstraints] = useState<any>(null);
    const [isReoptimizing, setIsReoptimizing] = useState(false);
    const [showConstraints, setShowConstraints] = useState(true);

    useEffect(() => {
        const storedResults = sessionStorage.getItem('optimizationResults');
        const storedFunds = sessionStorage.getItem('selectedFunds');
        const storedProfile = sessionStorage.getItem('clientProfile');

        // Check for initial results (baseline), if not set, set it from current results
        const existingInitial = sessionStorage.getItem('initialOptimizationResults');
        if (storedResults && !existingInitial) {
            sessionStorage.setItem('initialOptimizationResults', storedResults);
        }

        if (storedResults) {
            const data = JSON.parse(storedResults);
            setResults(data);
            setCustomWeights(data.max_sharpe_weights);
        }

        if (storedFunds) {
            const funds = JSON.parse(storedFunds);
            setFundDetails(funds);
        }

        if (storedProfile) {
            setConstraints(JSON.parse(storedProfile));
        } else {
            // Default constraints if none found
            setConstraints({
                risk_level: 'moderate',
                investment_horizon: 5,
                volatility_tolerance: 15,
                return_expectation: 12,
                max_weight_per_fund: 20,
                min_weight_per_fund: 0,
                asset_allocation: { equity: 60, debt: 30, gold: 5, alt: 5 }
            });
        }
        setLoading(false);
    }, []);

    // Helper function to get fund name by ID
    const getFundName = useCallback((fundId: number | string): string => {
        const fund = fundDetails.find(f => f.fund_id === Number(fundId));
        return fund?.name || `Fund ${fundId}`;
    }, [fundDetails]);

    const handleWeightChange = useCallback((fundId: number, newWeight: number) => {
        setCustomWeights(prev => ({
            ...prev,
            [fundId]: newWeight / 100
        }));
    }, []);

    const recalculateMetrics = useCallback(async () => {
        setAdjusting(true);
        try {
            const response = await api.optimize.recalculate(customWeights);
            setCustomMetrics(response.data.metrics);
            setCustomBenchmarkMetrics(response.data.benchmark_metrics);
            setSelectedPortfolio('custom');
        } catch (error) {
            console.error('Recalculation error:', error);
            alert('Failed to recalculate metrics');
        } finally {
            setAdjusting(false);
        }
    }, [customWeights]);

    const handleReoptimize = async () => {
        if (!constraints || !fundDetails.length) return;
        setIsReoptimizing(true);
        try {
            const payload = {
                client_id: Number(sessionStorage.getItem('clientId') || 0),
                fund_ids: fundDetails.map(f => f.fund_id),
                constraints: {
                    ...constraints,
                    asset_allocation: {
                        equity_min: 0, equity_max: 100,
                        debt_min: 0, debt_max: 100,
                        gold_min: 0, gold_max: 100,
                        alt_min: 0, alt_max: 100
                    } // Simplified allocation constraints for now
                }
            };
            const response = await api.optimize.run(payload);
            setResults(response.data);
            setCustomWeights(response.data.max_sharpe_weights);

            // Save new results
            sessionStorage.setItem('optimizationResults', JSON.stringify(response.data));
        } catch (error) {
            console.error('Re-optimization failed:', error);
            alert('Optimization failed. Please try softer constraints.');
        } finally {
            setIsReoptimizing(false);
        }
    };

    const exportToPDF = useCallback(async () => {
        // ... (rest of function)
        const jsPDF = (await import('jspdf')).default;
        const html2canvas = (await import('html2canvas')).default;

        const element = document.getElementById('results-content');
        if (!element) return;

        setLoading(true);
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#f8fafc'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Portfolio_Report_${new Date().toLocaleDateString()}.pdf`);
        } catch (error) {
            console.error('PDF Export error:', error);
            alert('Failed to export PDF');
        } finally {
            setLoading(false);
        }
    }, []);

    const exportToCSV = useCallback(() => {
        if (!results) return;

        // Get current active portfolio data
        const weights = selectedPortfolio === 'mvp' ? results.mvp_weights :
            selectedPortfolio === 'max_sharpe' ? results.max_sharpe_weights :
                customWeights;

        const metrics = selectedPortfolio === 'mvp' ? results.mvp_metrics :
            selectedPortfolio === 'max_sharpe' ? results.max_sharpe_metrics :
                customMetrics || results.max_sharpe_metrics;

        // Section 1: Portfolio Allocation
        const csvRows = [];
        csvRows.push(['PORTFOLIO ALLOCATION']);
        csvRows.push(['Fund ID', 'Fund Name', 'Category', 'Weight', 'Percentage']);

        Object.entries(weights).forEach(([id, weight]) => {
            if ((weight as number) > 0.001) {
                const fund = fundDetails.find(f => f.fund_id === Number(id));
                csvRows.push([
                    id,
                    fund ? `"${fund.name}"` : `Fund ${id}`,
                    fund?.category || 'N/A',
                    (weight as number).toFixed(6),
                    ((weight as number) * 100).toFixed(2) + '%'
                ]);
            }
        });

        csvRows.push([]); // Empty line

        // Section 2: Portfolio Metrics
        csvRows.push(['PORTFOLIO RISK METRICS']);
        csvRows.push(['Metric', 'Value', 'Annualized']);
        csvRows.push(['Expected Return', ((metrics?.expected_return || 0) * 100).toFixed(2) + '%', 'Yes']);
        csvRows.push(['Volatility (Risk)', ((metrics?.volatility || 0) * 100).toFixed(2) + '%', 'Yes']);
        csvRows.push(['Sharpe Ratio', (metrics?.sharpe_ratio || 0).toFixed(4), 'N/A']);
        csvRows.push(['Sortino Ratio', (metrics?.sortino_ratio || 0).toFixed(4), 'N/A']);
        csvRows.push(['Beta', (metrics?.beta || 0).toFixed(3), 'N/A']);
        csvRows.push(['Alpha', ((metrics?.alpha || 0) * 100).toFixed(2) + '%', 'Yes']);
        csvRows.push(['Max Drawdown', ((metrics?.max_drawdown || 0) * 100).toFixed(2) + '%', 'N/A']);

        csvRows.push([]); // Empty line

        // Section 3: Simulation Stats (if available)
        if (results.simulation_stats) {
            csvRows.push(['MARKET SIMULATION STATS (Monte Carlo)']);
            csvRows.push(['Metric', 'Min', 'Max']);
            csvRows.push(['Possible Volatility', (results.simulation_stats.volatility_min * 100).toFixed(2) + '%', (results.simulation_stats.volatility_max * 100).toFixed(2) + '%']);
            csvRows.push(['Possible Return', (results.simulation_stats.return_min * 100).toFixed(2) + '%', (results.simulation_stats.return_max * 100).toFixed(2) + '%']);
        }

        const csvString = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Portfolio_Analysis_${selectedPortfolio}_${new Date().toLocaleDateString()}.csv`;
        a.click();
    }, [results, selectedPortfolio, customWeights, customMetrics, fundDetails]);

    // Memoize current weights and metrics
    const currentWeights = useMemo(() => {
        return selectedPortfolio === 'mvp' ? results?.mvp_weights :
            selectedPortfolio === 'max_sharpe' ? results?.max_sharpe_weights :
                customWeights;
    }, [selectedPortfolio, results, customWeights]);

    const currentMetrics = useMemo(() => {
        return selectedPortfolio === 'mvp' ? results?.mvp_metrics :
            selectedPortfolio === 'max_sharpe' ? results?.max_sharpe_metrics :
                customMetrics || results?.max_sharpe_metrics;
    }, [selectedPortfolio, results, customMetrics]);

    const currentBenchmarkMetrics = useMemo(() => {
        return selectedPortfolio === 'custom'
            ? customBenchmarkMetrics || results?.benchmark_metrics
            : results?.benchmark_metrics;
    }, [selectedPortfolio, results, customBenchmarkMetrics]);

    // Memoize chart options
    const frontierOption = useMemo(() => {
        if (!results) return {};

        const frontier = results.efficient_frontier || [];

        // Prepare data for the curved frontier line
        // Sort by volatility to ensure a clean line
        const sortedFrontier = [...frontier].sort((a, b) => a.volatility - b.volatility);
        const lineData = sortedFrontier.map(point => [
            point.volatility * 100,
            point.return * 100
        ]);

        const frontierData = frontier.map(point => [
            point.volatility * 100,
            point.return * 100,
            point.sharpe
        ]);

        return {
            title: {
                text: 'Efficient Frontier',
                left: 'center',
                textStyle: { fontSize: 16, fontWeight: 'bold' }
            },
            tooltip: {
                trigger: 'axis',
                formatter: (params: any) => {
                    const data = params[0].value;
                    return `Volatility: ${data[0].toFixed(2)}%<br/>Return: ${data[1].toFixed(2)}%`;
                }
            },
            legend: {
                data: ['Efficient Frontier', 'Max Sharpe', 'MVP', 'Benchmark'],
                bottom: 0
            },
            grid: { top: '15%', bottom: '15%', left: '10%', right: '10%' },
            xAxis: {
                type: 'value',
                name: 'Risk (Volatility %)',
                nameLocation: 'middle',
                nameGap: 30,
                axisLabel: { formatter: '{value}%' }
            },
            yAxis: {
                type: 'value',
                name: 'Return (Annual %)',
                nameLocation: 'middle',
                nameGap: 40,
                axisLabel: { formatter: '{value}%' }
            },
            visualMap: {
                min: 0,
                max: results.max_sharpe_metrics.sharpe_ratio * 1.1,
                calculable: true,
                orient: 'vertical',
                right: 'right',
                top: 'center',
                inRange: {
                    color: ['#3b0764', '#7e22ce', '#2563eb', '#10b981', '#fbbf24'] // Deep purple -> Blue -> Green -> Yellow
                },
                dimension: 2, // Color based on Sharpe Ratio (3rd dimension)
                formatter: 'Sharpe: {value}'
            },
            series: [
                {
                    name: 'Monte Carlo Portfolios',
                    type: 'scatter',
                    symbolSize: 3,
                    data: (results.monte_carlo_portfolios || []).map(p => [
                        p.volatility * 100,
                        p.return * 100,
                        p.sharpe
                    ]),
                    itemStyle: { opacity: 0.6 },
                    z: 1 // Layer at bottom
                },
                {
                    name: 'Efficient Frontier',
                    type: 'line',
                    smooth: true,
                    data: lineData,
                    symbol: 'none',
                    lineStyle: {
                        width: 4,
                        color: '#dc2626' // Distinct Red line like reference
                    },
                    z: 5 // Layer above cloud
                },
                {
                    name: 'Max Sharpe',
                    type: 'scatter',
                    data: [[results.max_sharpe_metrics.volatility * 100, results.max_sharpe_metrics.expected_return * 100]],
                    symbolSize: 22,
                    label: { show: true, position: 'top', formatter: 'MAX SHARPE', fontSize: 10, fontWeight: 'black', color: '#854d0e', distance: 10 },
                    itemStyle: { color: '#fbbf24', borderColor: '#fff', borderWidth: 3, shadowBlur: 15, shadowColor: 'rgba(251, 191, 36, 0.6)' }
                },
                {
                    name: 'MVP',
                    type: 'scatter',
                    data: [[results.mvp_metrics.volatility * 100, results.mvp_metrics.expected_return * 100]],
                    symbolSize: 22,
                    label: { show: true, position: 'bottom', formatter: 'MIN VARIANCE (MVP)', fontSize: 10, fontWeight: 'black', color: '#991b1b', distance: 10 },
                    itemStyle: { color: '#ef4444', borderColor: '#fff', borderWidth: 3, shadowBlur: 15, shadowColor: 'rgba(239, 68, 68, 0.6)' }
                },
                currentBenchmarkMetrics && {
                    name: 'Benchmark',
                    type: 'scatter',
                    data: [[currentBenchmarkMetrics.volatility * 100, currentBenchmarkMetrics.expected_return * 100]],
                    symbolSize: 22,
                    label: { show: true, position: 'right', formatter: 'BENCHMARK', fontSize: 10, fontWeight: 'black', color: '#065f46', distance: 10 },
                    itemStyle: { color: '#10b981', borderColor: '#fff', borderWidth: 3, shadowBlur: 15, shadowColor: 'rgba(16, 185, 129, 0.6)' }
                },
                // Dynamic 'Selected' point
                currentMetrics && {
                    name: 'Selected Strategy',
                    type: 'effectScatter',
                    rippleEffect: { brushType: 'stroke', scale: 4 },
                    data: [[currentMetrics.volatility * 100, currentMetrics.expected_return * 100]],
                    symbolSize: 24,
                    z: 10,
                    label: {
                        show: true,
                        position: 'top',
                        formatter: '🎯 SELECTED',
                        fontSize: 12,
                        fontWeight: 'black',
                        color: '#6366f1',
                        backgroundColor: '#fff',
                        padding: [4, 8],
                        borderRadius: 4,
                        shadowColor: 'rgba(0,0,0,0.1)',
                        shadowBlur: 5
                    },
                    itemStyle: { color: '#6366f1', borderColor: '#fff', borderWidth: 3, shadowBlur: 20, shadowColor: 'rgba(99, 102, 241, 0.8)' }
                }
            ].filter(Boolean)
        };
    }, [results, currentBenchmarkMetrics, currentMetrics]);

    // Memoize asset allocation chart with REAL data
    const assetAllocationOption = useMemo(() => {
        if (!currentWeights || !fundDetails.length) return {};

        const allocationMap: Record<string, number> = {};
        Object.entries(currentWeights).forEach(([fundId, weight]) => {
            const fund = fundDetails.find(f => f.fund_id === Number(fundId));
            const assetClass = fund?.asset_class || 'Other';
            allocationMap[assetClass] = (allocationMap[assetClass] || 0) + (weight as number);
        });

        const data = Object.entries(allocationMap).map(([name, value]) => ({
            name,
            value: Number((value * 100).toFixed(2))
        })).sort((a, b) => b.value - a.value);

        return {
            title: { text: 'Strategic Asset Allocation', left: 'center', top: 0, textStyle: { fontSize: 18, fontWeight: 'black', color: '#0f172a' } },
            tooltip: {
                trigger: 'item',
                formatter: '{b}: <b>{c}%</b>',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                textStyle: { color: '#475569' },
                padding: [10, 15]
            },
            legend: {
                orient: 'horizontal',
                bottom: '2%',
                left: 'center',
                itemWidth: 12,
                itemHeight: 12,
                padding: [10, 0],
                textStyle: { fontSize: 11, fontWeight: 'bold', color: '#64748b' }
            },
            series: [{
                type: 'pie',
                radius: ['45%', '72%'],
                center: ['50%', '52%'],
                avoidLabelOverlap: true,
                itemStyle: { borderRadius: 12, borderColor: '#fff', borderWidth: 2 },
                label: {
                    show: true,
                    position: 'outside',
                    formatter: '{b|{b}}\n{d|{d}%}',
                    rich: {
                        b: { fontSize: 13, fontWeight: 'black', color: '#334155', lineHeight: 22 },
                        d: { fontSize: 12, fontWeight: 'black', color: '#6366f1' }
                    }
                },
                labelLine: { length: 20, length2: 15, smooth: true },
                emphasis: {
                    label: { show: true, fontSize: '18', fontWeight: 'bold' }
                },
                data: data,
                color: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#64748b']
            }]
        };
    }, [currentWeights, fundDetails]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading optimization results...</p>
                </div>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">No optimization results found</p>
                    <button
                        onClick={() => window.location.href = '/funds'} /* Redirect to funds page, intake is deprecated/skipped */
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:scale-105 transition-all"
                    >
                        Start New Optimization
                    </button>
                </div>
            </div>
        );
    }

    if (!currentWeights || !currentMetrics) {
        return null;
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-slate-50 py-12" id="results-content">
                <div className="max-w-7xl mx-auto px-4">
                    {/* Enhanced Header */}
                    <div className="mb-8">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                            Portfolio Optimization Results
                                        </h1>
                                        <p className="text-gray-600 mt-1 text-lg">
                                            Scientifically optimized portfolios using Modern Portfolio Theory (MPT)
                                        </p>
                                    </div>
                                </div>


                            </div>
                        </div>

                        {/* Constraints & Re-Optimization Panel */}
                        {constraints && (
                            <div className="mb-6 glass border border-amber-200 bg-amber-50/50 rounded-xl overflow-hidden shadow-lg shadow-amber-100/50">
                                <button
                                    onClick={() => setShowConstraints(!showConstraints)}
                                    className="w-full px-6 py-4 flex items-center justify-between bg-white/50 hover:bg-white transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">Strategy Constraints</h3>
                                            <p className="text-xs text-slate-500">Tune parameters and Re-Optimize</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full bg-slate-200 text-slate-600 transition-transform ${showConstraints ? 'rotate-180' : ''}`}>▼</span>
                                </button>

                                {showConstraints && (
                                    <div className="p-6 border-t border-amber-200/50 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <Slider
                                                label="Target Return (%)"
                                                value={constraints.return_expectation}
                                                min={results?.simulation_stats?.return_min ? Math.floor(results.simulation_stats.return_min * 100) : 5}
                                                max={results?.simulation_stats?.return_max ? Math.ceil(results.simulation_stats.return_max * 100) : 30}
                                                step={0.5}
                                                onChange={v => setConstraints({ ...constraints, return_expectation: v })}
                                                color="green"
                                            />
                                            <Slider
                                                label="Max Volatility (%)"
                                                value={constraints.volatility_tolerance}
                                                min={results?.simulation_stats?.volatility_min ? Math.floor(results.simulation_stats.volatility_min * 100) : 5}
                                                max={results?.simulation_stats?.volatility_max ? Math.ceil(results.simulation_stats.volatility_max * 100) : 50}
                                                step={0.5}
                                                onChange={v => setConstraints({ ...constraints, volatility_tolerance: v })}
                                                color="red"
                                            />
                                            <Slider label="Max Weight/Fund (%)" value={constraints.max_weight_per_fund} min={5} max={100} onChange={v => setConstraints({ ...constraints, max_weight_per_fund: v })} color="blue" />
                                            <Slider label="Min Weight/Fund (%)" value={constraints.min_weight_per_fund} min={0} max={20} step={0.5} onChange={v => setConstraints({ ...constraints, min_weight_per_fund: v })} color="orange" />
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                onClick={handleReoptimize}
                                                disabled={isReoptimizing}
                                                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-lg shadow-md shadow-amber-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-70 disabled:scale-100 flex items-center gap-2"
                                            >
                                                {isReoptimizing ? (
                                                    <>
                                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                        Optimizing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>⚡</span> Run New Optimization
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-gray-600">Expected Return</span>
                                </div>
                                <p className="text-2xl font-bold text-blue-600">
                                    {((currentMetrics?.expected_return || 0) * 100).toFixed(2)}%
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Annualized</p>
                            </div>

                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-gray-600">Volatility</span>
                                </div>
                                <p className="text-2xl font-bold text-purple-600">
                                    {((currentMetrics?.volatility || 0) * 100).toFixed(2)}%
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Risk measure</p>
                            </div>

                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-green-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-gray-600">Sharpe Ratio</span>
                                </div>
                                <p className="text-2xl font-bold text-green-600">
                                    {(currentMetrics?.sharpe_ratio || 0).toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Risk-adjusted return</p>
                            </div>

                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-orange-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-gray-600">Funds Selected</span>
                                </div>
                                <p className="text-2xl font-bold text-orange-600">
                                    {Object.keys(currentWeights || {}).length}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Diversified</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center md:justify-end gap-4 mb-8">
                    <button
                        onClick={exportToPDF}
                        className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-300 flex items-center gap-2 shadow-sm transition-all"
                    >
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span>Download Report</span>
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-300 flex items-center gap-2 shadow-sm transition-all"
                    >
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Export CSV</span>
                    </button>
                </div>

                {/* Fund Information Collapsible */}
                <div className="glass rounded-xl overflow-hidden mb-6">
                    <button
                        onClick={() => setShowFundInfo(!showFundInfo)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/50 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Fund Information</h3>
                            <span className="text-sm text-gray-500">({fundDetails.length} funds selected)</span>
                        </div>
                        <svg
                            className={`w-5 h-5 text-gray-600 transition-transform ${showFundInfo ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {showFundInfo && (
                        <div className="px-6 pb-6 border-t border-gray-200">
                            <div className="overflow-x-auto mt-4">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-gray-300">
                                            <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">Fund Name</th>
                                            <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">Full Name</th>
                                            <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">Category</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fundDetails.map((fund, index) => (
                                            <tr key={fund.fund_id} className={`border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                                <td className="py-3 px-4 text-gray-800 font-medium">{fund.name?.split('-')[0]?.trim() || fund.name}</td>
                                                <td className="py-3 px-4 text-gray-700">{fund.name}</td>
                                                <td className="py-3 px-4 text-gray-600">{fund.category || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Portfolio Selector */}
                <div className="mb-8">
                    <div className="flex justify-center">
                        <div className="glass p-1.5 rounded-xl inline-flex bg-slate-100/50 backdrop-blur-md">
                            <button
                                onClick={() => setSelectedPortfolio('mvp')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${selectedPortfolio === 'mvp'
                                    ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black/5'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }`}
                            >
                                Minimum Variance
                            </button>
                            <button
                                onClick={() => setSelectedPortfolio('max_sharpe')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${selectedPortfolio === 'max_sharpe'
                                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }`}
                            >
                                Maximum Sharpe
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedPortfolio('custom');
                                    if (Object.keys(customWeights).length === 0) {
                                        setCustomWeights(results?.max_sharpe_weights || {});
                                        setCustomMetrics(results?.max_sharpe_metrics);
                                    }
                                }}
                                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${selectedPortfolio === 'custom'
                                    ? 'bg-white text-purple-700 shadow-sm ring-1 ring-black/5'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }`}
                            >
                                Custom Analysis
                            </button>
                        </div>
                    </div>

                    {/* Strategy Explanation */}
                    <div className="mt-4 text-center max-w-2xl mx-auto animate-in fade-in slide-in-from-top-1 px-4">
                        {selectedPortfolio === 'mvp' && (
                            <p className="text-sm text-emerald-700 bg-emerald-50 py-2 px-4 rounded-lg inline-block border border-emerald-100 shadow-sm">
                                <span className="font-bold">Minimum Variance:</span> Prioritizes safety by minimizing overall portfolio volatility. Ideal for conservative investors.
                            </p>
                        )}
                        {selectedPortfolio === 'max_sharpe' && (
                            <p className="text-sm text-blue-700 bg-blue-50 py-2 px-4 rounded-lg inline-block border border-blue-100 shadow-sm">
                                <span className="font-bold">Maximum Sharpe:</span> Optimized for efficiency. Delivers the highest possible return for every unit of risk taken.
                            </p>
                        )}
                        {selectedPortfolio === 'custom' && (
                            <p className="text-sm text-purple-700 bg-purple-50 py-2 px-4 rounded-lg inline-block border border-purple-100 shadow-sm">
                                <span className="font-bold">Custom Analysis:</span> Your sandbox. Adjust weights manually in the table below to simulate different scenarios.
                            </p>
                        )}
                    </div>
                </div>

                {/* Risk Free Rate Info */}
                <div className="glass rounded-xl p-4 mb-6 border-l-4 border-blue-500">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">Risk Free Rate</h3>
                            <p className="text-sm text-gray-600">Used as benchmark for risk-adjusted returns (Sharpe, Sortino ratios)</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-blue-600">6.50%</p>
                            <p className="text-xs text-gray-500">Annualized</p>
                        </div>
                    </div>
                </div>

                {/* Quantitative Metrics */}
                <div className="glass rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Quantitative Metrics</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard title="Expected Return" value={`${((currentMetrics?.expected_return || 0) * 100).toFixed(2)}%`} icon="📈" color="green" />
                        <MetricCard title="Volatility (Risk)" value={`${((currentMetrics?.volatility || 0) * 100).toFixed(2)}%`} icon="📊" color="blue" />
                        <MetricCard title="Sharpe Ratio" value={(currentMetrics?.sharpe_ratio || 0).toFixed(3)} icon="⭐" color="yellow" />
                        <MetricCard title="Sortino Ratio" value={(currentMetrics?.sortino_ratio || 0).toFixed(3)} icon="🎯" color="purple" />
                        <MetricCard title="Alpha (Jensen's)" value={`${((currentMetrics?.alpha || 0) * 100).toFixed(2)}%`} icon="✨" color="emerald" />
                        <MetricCard title="Beta (Market Sens)" value={(currentMetrics?.beta || 0).toFixed(2)} icon="🌊" color="cyan" />
                        <MetricCard title="R-Squared" value={(currentMetrics?.r_squared || 0).toFixed(3)} icon="�" color="teal" />
                        <MetricCard title="Treynor Ratio" value={(currentMetrics?.treynor_ratio || 0).toFixed(3)} icon="🏎️" color="orange" />
                        <MetricCard title="Max Drawdown" value={`${((currentMetrics?.max_drawdown || 0) * 100).toFixed(2)}%`} icon="�" color="red" />
                        <MetricCard title="VaR (95%)" value={`${((currentMetrics?.var_95 || 0) * 100).toFixed(2)}%`} icon="⚠️" color="orange" />
                        <MetricCard title="Skewness" value={(currentMetrics?.skewness || 0).toFixed(3)} icon="📐" color="indigo" />
                        <MetricCard title="Kurtosis" value={(currentMetrics?.kurtosis || 0).toFixed(3)} icon="📏" color="pink" />
                    </div>

                    {/* Professional Insights Section */}
                    <ProfessionalInsights metrics={currentMetrics} />

                    {/* Benchmark Comparison Tooltip */}
                    <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl">🌍</div>
                        <div className="flex-1">
                            <p className="text-sm text-emerald-900 leading-relaxed">
                                <span className="font-black">Institutional Benchmark:</span> {currentBenchmarkMetrics?.name || 'Nifty 50 TRI'}
                                <br />
                                <span className="text-emerald-700/70 text-xs font-bold uppercase tracking-tighter">Dynamic Composite Analysis Active</span>
                            </p>
                        </div>
                    </div>

                    {/* Detailed Analytics CTA */}
                    <div className="glass rounded-xl p-8 mb-6 text-center border border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-blue-50/50">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm mx-auto flex items-center justify-center text-3xl mb-4">
                            📊
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Want to see the deep dive?</h2>
                        <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                            Compare your constraints against our AI optimization and see exactly how much value we added.
                        </p>
                        <button
                            onClick={() => window.location.href = '/analytics'}
                            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 mx-auto"
                        >
                            <span>View Detailed Analytics</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="glass rounded-xl p-6">
                            <ReactECharts option={frontierOption} style={{ height: '400px' }} />
                        </div>
                        <div className="glass rounded-xl p-6">
                            <ReactECharts option={assetAllocationOption} style={{ height: '400px' }} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <div className="glass rounded-xl p-6 border-t-4 border-green-500">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">🎯</span>
                                <h3 className="text-lg font-bold text-gray-800">Optimal Portfolio</h3>
                            </div>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {Object.entries(results?.max_sharpe_weights || {}).map(([fundId, weight]) => (
                                    <div key={fundId} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700 font-medium truncate max-w-[150px]">{getFundName(fundId)}</span>
                                        <span className="text-sm font-semibold text-green-700">{((weight as number) * 100).toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass rounded-xl p-6 border-t-4 border-blue-500">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">🛡️</span>
                                <h3 className="text-lg font-bold text-gray-800">Min Volatility</h3>
                            </div>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {Object.entries(results?.mvp_weights || {}).map(([fundId, weight]) => (
                                    <div key={fundId} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700 font-medium truncate max-w-[150px]">{getFundName(fundId)}</span>
                                        <span className="text-sm font-semibold text-blue-700">{((weight as number) * 100).toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass rounded-xl p-6 border-t-4 border-purple-500">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">📊</span>
                                <h3 className="text-lg font-bold text-gray-800">Current Selection</h3>
                            </div>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {Object.entries(currentWeights || {}).map(([fundId, weight]) => (
                                    <div key={fundId} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700 font-medium truncate max-w-[150px]">{getFundName(fundId)}</span>
                                        <span className="text-sm font-semibold text-purple-700">{((weight as number) * 100).toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {
                        selectedPortfolio === 'custom' && (
                            <div className="glass rounded-xl p-6 mb-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Adjust Portfolio Weights</h2>
                                <div className="space-y-4">
                                    {Object.entries(customWeights).map(([fundId, weight]) => (
                                        <div key={fundId} className="flex items-center gap-4">
                                            <span className="w-48 text-sm font-medium text-gray-700 truncate">{getFundName(fundId)}</span>
                                            <input
                                                type="range" min="0" max="50" step="0.5"
                                                value={weight * 100}
                                                onChange={(e) => handleWeightChange(parseInt(fundId), parseFloat(e.target.value))}
                                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                            />
                                            <span className="w-16 text-right text-sm font-semibold text-gray-800">{(weight * 100).toFixed(1)}%</span>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={recalculateMetrics}
                                    disabled={adjusting}
                                    className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg hover:from-purple-700 hover:to-violet-700 transition-all disabled:opacity-50"
                                >
                                    {adjusting ? 'Recalculating...' : 'Recalculate Metrics'}
                                </button>
                            </div>
                        )
                    }

                </div>
            </div>
        </ProtectedRoute >
    );
}

// Reusing Slider component logic locally since it's small and avoids imports
function Slider({ label, value, min = 0, max = 100, step = 1, onChange, suffix = '', color = 'blue' }: { label: string, value: number, min?: number, max?: number, step?: number, onChange: (v: number) => void, suffix?: string, color?: string }) {
    const colors: Record<string, string> = { blue: 'accent-blue-600', purple: 'accent-purple-600', green: 'accent-green-600', red: 'accent-red-600', orange: 'accent-orange-600' };
    return (
        <div className="space-y-2">
            <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                <span className="text-sm font-black text-slate-800">{value}{suffix}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className={`w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer ${colors[color] || colors.blue}`} />
        </div>
    );
}

function MetricCard({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) {
    const colorClasses = {
        green: 'from-green-500 to-emerald-500',
        blue: 'from-blue-500 to-cyan-500',
        yellow: 'from-yellow-500 to-amber-500',
        purple: 'from-purple-500 to-violet-500',
        red: 'from-red-500 to-rose-500',
        indigo: 'from-indigo-500 to-blue-500',
        pink: 'from-pink-500 to-rose-500',
        orange: 'from-orange-500 to-amber-500',
        emerald: 'from-emerald-400 to-teal-500',
        cyan: 'from-cyan-400 to-blue-500',
        teal: 'from-teal-400 to-emerald-600',
    };

    return (
        <div className="glass shadow-lg rounded-[1.5rem] p-6 border border-white hover:border-blue-200 transition-all hover:shadow-2xl">
            <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{icon}</span>
                <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} opacity-10`}></div>
            </div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</h3>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
        </div>
    );
}

function ProfessionalInsights({ metrics }: { metrics: any }) {
    if (!metrics) return null;

    const insights = [];
    if (metrics.sharpe_ratio > 1.2) {
        insights.push({
            type: 'positive',
            icon: '✨',
            title: 'Superior Risk-Adjusted Returns',
            desc: 'This portfolio generates significant excess return per unit of volatility.'
        });
    }
    if (metrics.alpha > 0.03) {
        insights.push({
            type: 'positive',
            icon: '📈',
            title: 'High Alpha Generation',
            desc: 'The selection consistently outperforms its risk-adjusted market benchmark.'
        });
    }
    if (metrics.volatility < 0.12) {
        insights.push({
            type: 'info',
            icon: '🛡️',
            title: 'Institutional Stability',
            desc: 'Low-to-moderate volatility profile suitable for strategic capital preservation.'
        });
    }
    if (metrics.max_drawdown > 0.20) {
        insights.push({
            type: 'warning',
            icon: '⚠️',
            title: 'Equity Exposure Risk',
            desc: 'Past drawdowns exceed 20%. Client must have a 5+ year investment horizon.'
        });
    }
    if (metrics.beta < 0.8) {
        insights.push({
            type: 'info',
            icon: '🌊',
            title: 'Low Market Correlation',
            desc: 'This portfolio is less sensitive to broad market swings than common indices.'
        });
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-slate-100 pt-8 mt-4">
            {insights.map((insight, idx) => (
                <div key={idx} className={`p-5 rounded-2xl border flex flex-col gap-2 transition-all hover:-translate-y-1 ${insight.type === 'positive' ? 'bg-emerald-50/50 border-emerald-100' :
                    insight.type === 'warning' ? 'bg-rose-50/50 border-rose-100' : 'bg-blue-50/50 border-blue-100'
                    }`}>
                    <div className="flex items-center gap-3">
                        <span className="text-xl">{insight.icon}</span>
                        <h4 className={`font-black text-xs uppercase tracking-wider ${insight.type === 'positive' ? 'text-emerald-700' :
                            insight.type === 'warning' ? 'text-rose-700' : 'text-blue-700'
                            }`}>{insight.title}</h4>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed">{insight.desc}</p>
                </div>
            ))}
        </div>
    );
}
