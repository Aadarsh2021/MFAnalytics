'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/ProtectedRoute';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface Fund {
    id: number;
    name: string;
    isin: string;
    category: string;
    asset_class: string;
    amc: string;
    has_nav_data: boolean;
    data_quality: string;
    plan_type: string;
    scheme_type: string;
}

export default function FundsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [funds, setFunds] = useState<Fund[]>([]);
    const [selectedFunds, setSelectedFunds] = useState<Map<number, Fund>>(new Map());
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [assetClassFilter, setAssetClassFilter] = useState('');
    const [planTypeFilter, setPlanTypeFilter] = useState('');
    const [schemeTypeFilter, setSchemeTypeFilter] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [assetClasses, setAssetClasses] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'name' | 'category' | 'amc'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

    // Pagination state
    const [offset, setOffset] = useState(0);
    const [totalFunds, setTotalFunds] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 50;

    useEffect(() => {
        fetchFilters();
    }, []);

    const fetchFilters = async () => {
        try {
            const [catResponse, assetResponse] = await Promise.all([
                api.funds.getCategories(),
                api.funds.getAssetClasses()
            ]);
            setCategories(catResponse.data);
            setAssetClasses(assetResponse.data);
        } catch (err) {
            console.error('Failed to fetch filters:', err);
        }
    };

    const searchFunds = useCallback(async (currentOffset: number = 0, isNewSearch: boolean = false) => {
        if (isNewSearch) setLoading(true);
        else setLoadingMore(true);

        try {
            const response = await api.funds.search({
                query: searchQuery || undefined,
                category: categoryFilter || undefined,
                asset_class: assetClassFilter || undefined,
                plan_type: planTypeFilter || undefined,
                scheme_type: schemeTypeFilter || undefined,
                limit: PAGE_SIZE,
                offset: currentOffset
            });

            const { funds: newFunds, total } = response.data;
            setTotalFunds(total);

            if (isNewSearch) {
                setFunds(newFunds);
                setOffset(0);
                setHasMore(newFunds.length < total);
            } else {
                setFunds(prev => [...prev, ...newFunds]);
                setHasMore(funds.length + newFunds.length < total);
            }
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [searchQuery, categoryFilter, assetClassFilter, planTypeFilter, schemeTypeFilter, funds.length]);

    // Debounce Search Query (Typing needs delay)
    useEffect(() => {
        const timer = setTimeout(() => {
            searchFunds(0, true);
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]); // Only trigger on query change

    // Immediate Trigger for Filters (Dropdowns should be instant)
    useEffect(() => {
        searchFunds(0, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryFilter, assetClassFilter, planTypeFilter, schemeTypeFilter]); // Only trigger on filter changes

    const handleLoadMore = () => {
        const nextOffset = offset + PAGE_SIZE;
        setOffset(nextOffset);
        searchFunds(nextOffset, false);
    };

    const toggleFund = useCallback((fund: Fund) => {
        setSelectedFunds(prev => {
            const newSelected = new Map(prev);
            if (newSelected.has(fund.id)) {
                newSelected.delete(fund.id);
            } else {
                newSelected.set(fund.id, fund);
            }
            return newSelected;
        });
    }, []);

    const autoSelectTopFunds = useCallback(() => {
        const topFunds = new Map<number, Fund>();
        const fundsByAssetClass: Record<string, Fund[]> = {};

        funds.forEach(fund => {
            if (!fundsByAssetClass[fund.asset_class]) {
                fundsByAssetClass[fund.asset_class] = [];
            }
            fundsByAssetClass[fund.asset_class].push(fund);
        });

        Object.values(fundsByAssetClass).forEach(assetFunds => {
            // Pick top 4 from each class if available
            assetFunds.slice(0, 4).forEach(fund => topFunds.set(fund.id, fund));
        });

        setSelectedFunds(topFunds);
    }, [funds]);

    const proceedToOptimization = useCallback(async () => {
        if (selectedFunds.size === 0) {
            alert('Please select at least one fund');
            return;
        }

        const clientId = sessionStorage.getItem('clientId');
        if (!clientId) {
            alert('Please complete client intake first');
            router.push('/intake');
            return;
        }

        try {
            setLoading(true);
            const clientData = sessionStorage.getItem('clientProfile');
            const constraints = clientData ? JSON.parse(clientData) : {};

            const selectedFundsData = Array.from(selectedFunds.values()).map(f => ({
                fund_id: f.id,
                name: f.name,
                amc: f.amc,
                category: f.category,
                asset_class: f.asset_class
            }));

            const response = await api.optimize.run({
                client_id: parseInt(clientId),
                selected_funds: selectedFundsData.map(f => ({
                    fund_id: f.fund_id,
                    asset_class: f.asset_class,
                    name: f.name
                })),
                constraints: constraints,
                mode: 'emh'
            });

            sessionStorage.setItem('optimizationResults', JSON.stringify(response.data));
            sessionStorage.setItem('selectedFunds', JSON.stringify(selectedFundsData));

            router.push('/results');
        } catch (err: any) {
            console.error('Optimization error:', err);
            const detail = err.response?.data?.detail;
            let errorMessage = 'Optimization failed. Please try again.';

            if (typeof detail === 'string') {
                errorMessage = detail;
            } else if (Array.isArray(detail)) {
                errorMessage = detail.map((e: any) => e.msg).join(', ');
            } else if (typeof detail === 'object' && detail !== null) {
                errorMessage = JSON.stringify(detail);
            }

            alert(errorMessage);
            setLoading(false);
        }
    }, [selectedFunds, router]);

    // Memoize expensive computations
    const sortedFunds = useMemo(() => {
        // First deduplicate by name to ensure clean list
        const uniqueFundsMap = new Map();
        funds.forEach(f => {
            if (!uniqueFundsMap.has(f.name)) {
                uniqueFundsMap.set(f.name, f);
            }
        });
        const uniqueFunds = Array.from(uniqueFundsMap.values());

        return uniqueFunds.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
            else if (sortBy === 'category') comparison = a.category.localeCompare(b.category);
            else if (sortBy === 'amc') comparison = a.amc.localeCompare(b.amc);
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [funds, sortBy, sortOrder]);

    const groupedFunds = useMemo(() => {
        return sortedFunds.reduce((acc, fund) => {
            if (!acc[fund.asset_class]) acc[fund.asset_class] = [];
            acc[fund.asset_class].push(fund);
            return acc;
        }, {} as Record<string, Fund[]>);
    }, [sortedFunds]);

    // Memoize chart data
    const distributionOption = useMemo(() => {
        const fundsArray = Array.from(selectedFunds.values());
        const assetCounts: Record<string, number> = {};

        fundsArray.forEach(f => {
            assetCounts[f.asset_class] = (assetCounts[f.asset_class] || 0) + 1;
        });

        return {
            title: { text: 'Asset Allocation', left: 'center', top: 0, textStyle: { fontSize: 16, fontWeight: 'black', color: '#1e293b' } },
            tooltip: {
                trigger: 'item',
                formatter: '{b}: <b>{c} Funds</b> ({d}%)',
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
                radius: ['42%', '70%'],
                center: ['50%', '48%'],
                itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
                label: {
                    show: true,
                    position: 'outside',
                    formatter: '{b|{b}}\n{d|{d}%}',
                    rich: {
                        b: { fontSize: 11, fontWeight: 'bold', color: '#475569', lineHeight: 20 },
                        d: { fontSize: 10, fontWeight: 'black', color: '#6366f1' }
                    }
                },
                labelLine: { length: 15, length2: 10, smooth: true },
                data: Object.entries(assetCounts)
                    .map(([asset, count]) => ({
                        name: asset,
                        value: count
                    })),
                color: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#64748b']
            }]
        };
    }, [selectedFunds]);

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-10">
                    {/* Premium Header */}
                    <div className="mb-10 bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                            <div>
                                <h1 className="text-4xl font-black tracking-tight text-slate-900">
                                    Global Fund <span className="text-blue-600">Universe</span>
                                </h1>
                                <p className="text-slate-500 font-medium mt-2">
                                    Institutional-grade access with optimized performance paging.
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                                    <button onClick={() => setViewMode('table')} className={`px-6 py-2.5 rounded-xl font-bold transition-all ${viewMode === 'table' ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500'}`}>Table</button>
                                    <button onClick={() => setViewMode('grid')} className={`px-6 py-2.5 rounded-xl font-bold transition-all ${viewMode === 'grid' ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500'}`}>Grid</button>
                                </div>
                                <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                    </span>
                                    Showing {funds.length} of {totalFunds.toLocaleString()} Funds
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Professional Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="relative group lg:col-span-2">
                            <input
                                type="text"
                                placeholder="Search by Fund Name or ISIN Code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all font-medium"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
                        </div>
                        <FilterSelect value={categoryFilter} options={categories} label="All Categories" onChange={setCategoryFilter} />
                        <FilterSelect value={assetClassFilter} options={assetClasses} label="All Asset Classes" onChange={setAssetClassFilter} />
                        <FilterSelect value={planTypeFilter} options={['Direct', 'Regular']} label="All Plans" onChange={setPlanTypeFilter} />
                        <FilterSelect value={schemeTypeFilter} options={['Growth', 'IDCW']} label="All Variants" onChange={setSchemeTypeFilter} />
                        <button onClick={autoSelectTopFunds} className="bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all py-4 shadow-xl col-span-1 md:col-span-2 lg:col-span-1">
                            ⚡ Auto
                        </button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Fund Listing */}
                    <div className="lg:w-[70%] order-2 lg:order-1">
                        {loading && funds.length === 0 ? (
                            <div className="bg-white rounded-[2rem] p-20 text-center border border-slate-50 shadow-sm">
                                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                                <h3 className="text-xl font-bold text-slate-800">Synchronizing Fund Data</h3>
                                <p className="text-slate-500">Connecting to global MF registers...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {viewMode === 'table' ? (
                                    <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                                    <th className="px-3 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[50px]">Select</th>
                                                    <th className="px-3 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 flex items-center gap-1" onClick={() => { setSortBy('name'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
                                                        Fund {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-3 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[100px]">Category</th>
                                                    <th className="px-3 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[80px]">Class</th>
                                                    <th className="px-3 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[100px] whitespace-nowrap">Data Quality</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {sortedFunds.map(fund => (
                                                    <tr key={fund.id} onClick={() => toggleFund(fund)} className={`group cursor-pointer transition-all hover:bg-slate-50/80 ${selectedFunds.has(fund.id) ? 'bg-blue-50/40' : ''}`}>
                                                        <td className="px-3 py-4">
                                                            <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${selectedFunds.has(fund.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-200 group-hover:border-blue-300'}`}>
                                                                {selectedFunds.has(fund.id) && <span className="text-white text-[10px]">✓</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-4 font-bold text-slate-800">
                                                            <div className="max-w-[12rem] lg:max-w-xs truncate text-sm">{fund.name}</div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{fund.plan_type}</span>
                                                                <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{fund.scheme_type}</span>
                                                                <span className="text-[10px] text-slate-400 tracking-widest uppercase">ISIN: {fund.isin}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-4 text-xs text-slate-500 font-medium truncate max-w-[100px]">{fund.category}</td>
                                                        <td className="px-3 py-4 text-xs">
                                                            <span className={`px-2 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider ${fund.asset_class === 'Equity' ? 'bg-blue-100 text-blue-700' :
                                                                fund.asset_class === 'Debt' ? 'bg-emerald-100 text-emerald-700' :
                                                                    fund.asset_class === 'Gold' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'
                                                                }`}>
                                                                {fund.asset_class}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-4">
                                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-slate-500 ${fund.data_quality === 'Excellent' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                                                    fund.data_quality === 'Good' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                                                                        'bg-amber-50 border-amber-100 text-amber-600'
                                                                }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${fund.data_quality === 'Excellent' ? 'bg-emerald-500' :
                                                                        fund.data_quality === 'Good' ? 'bg-blue-500' :
                                                                            'bg-amber-500'
                                                                    }`}></span>
                                                                <span className="text-[10px] font-black uppercase tracking-wide">{fund.data_quality}</span>
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {sortedFunds.map(fund => (
                                            <div key={fund.id} onClick={() => toggleFund(fund)} className={`p-6 rounded-3xl border transition-all cursor-pointer group ${selectedFunds.has(fund.id) ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-white border-slate-100 hover:border-blue-400 hover:shadow-lg text-slate-900'
                                                }`}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${selectedFunds.has(fund.id) ? 'bg-white/20' : 'bg-slate-100'
                                                        }`}>🎯</div>
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${selectedFunds.has(fund.id) ? 'bg-white border-white' : 'border-slate-200'
                                                        }`}>
                                                        {selectedFunds.has(fund.id) && <span className="text-blue-600 text-xs">✓</span>}
                                                    </div>
                                                </div>
                                                <h3 className="font-black text-sm leading-tight mb-2 group-hover:underline underline-offset-4">{fund.name}</h3>
                                                <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedFunds.has(fund.id) ? 'text-blue-100' : 'text-slate-400'}`}>
                                                    {fund.category} • {fund.asset_class}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Pagination Controls */}
                                {hasMore && (
                                    <div className="py-10 flex flex-col items-center gap-4">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                            className="px-12 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-800 hover:bg-slate-50 hover:border-blue-200 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                        >
                                            {loadingMore ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                    Analyzing Master Data...
                                                </div>
                                            ) : 'Load More Results'}
                                        </button>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            Page {Math.floor(offset / PAGE_SIZE) + 1} • {funds.length} Active in Browser
                                        </p>
                                    </div>
                                )}

                                {!hasMore && funds.length > 0 && (
                                    <div className="text-center py-10">
                                        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">End of synchronized Data - Reflecting current universe</p>
                                    </div>
                                )}

                                {/* Data Quality Legend */}
                                <div className="mt-6 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                        <span className="font-black text-slate-700 uppercase tracking-wider mr-2">Data Transparency:</span>
                                        This list reflects the complete AMFI universe (40,000+ schemes).
                                        <span className="font-bold text-slate-700 mx-1">Historical data is verified on-demand when you select a fund.</span>
                                        Funds with insufficient history (e.g., closed/new schemes) will be flagged for removal.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Professional Sidebar */}
                    <div className="lg:w-[30%] order-1 lg:order-2">
                        <div className="sticky top-6 space-y-6">
                            <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/30">
                                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center justify-between">
                                    Selection Core
                                    <span className="bg-blue-600 text-white text-[10px] px-3 py-1 rounded-full">{selectedFunds.size} Active</span>
                                </h3>

                                <div className="h-[240px] mb-8">
                                    <ReactECharts option={distributionOption} style={{ height: '100%' }} />
                                </div>


                                <div className="space-y-4 mb-8">
                                    {assetClasses.map(asset => {
                                        const count = Array.from(selectedFunds.values()).filter(f => f.asset_class === asset).length;
                                        return count > 0 ? (
                                            <div key={asset} className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{asset}</span>
                                                <span className="font-black text-slate-800">{count} Funds</span>
                                            </div>
                                        ) : null;
                                    })}
                                    {/* Catch-all for unclassified funds */}
                                    {(() => {
                                        const otherCount = Array.from(selectedFunds.values()).filter(f => !assetClasses.includes(f.asset_class)).length;
                                        return otherCount > 0 ? (
                                            <div className="flex justify-between items-center px-4 py-3 bg-red-50 rounded-2xl border border-red-100">
                                                <span className="text-xs font-black text-red-500 uppercase tracking-widest">Unclassified</span>
                                                <span className="font-black text-red-800">{otherCount} Funds</span>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>

                                {/* Detailed Selected Funds List */}
                                {selectedFunds.size > 0 && (
                                    <div className="mb-8 block">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Your Portfolio ({selectedFunds.size})</h4>
                                        <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                            {Array.from(selectedFunds.values()).map(fund => (
                                                <div key={fund.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative group transition-all hover:bg-white hover:shadow-md hover:border-slate-200">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleFund(fund); }}
                                                        className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full w-6 h-6 flex items-center justify-center border border-slate-200 shadow-sm text-xs font-bold transition-all z-10"
                                                        title="Remove Fund"
                                                    >
                                                        ✕
                                                    </button>
                                                    <div className="font-bold text-xs text-slate-800 leading-snug mb-2 pr-2">{fund.name}</div>
                                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                                        <span className="text-slate-400">{fund.category}</span>
                                                        <span className={`px-2 py-0.5 rounded-md ${fund.asset_class === 'Equity' ? 'bg-blue-100 text-blue-700' :
                                                            fund.asset_class === 'Debt' ? 'bg-emerald-100 text-emerald-700' :
                                                                'bg-orange-100 text-orange-700'
                                                            }`}>{fund.asset_class}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={proceedToOptimization}
                                    disabled={selectedFunds.size < 2 || loading || loadingMore}
                                    className="w-full py-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl font-black shadow-2xl shadow-blue-300 disabled:opacity-50 disabled:grayscale transition-all active:scale-[0.98]"
                                >
                                    {loading || loadingMore ? 'Optimizing Architecture...' : `Launch Optimization Engine`}
                                </button>

                                {selectedFunds.size > 0 && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to clear all selected funds?')) {
                                                setSelectedFunds(new Map());
                                            }
                                        }}
                                        disabled={loading || loadingMore}
                                        className="w-full mt-3 py-3 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-100 hover:bg-red-100 transition-all text-xs uppercase tracking-widest"
                                    >
                                        Clear Selection
                                    </button>
                                )}

                                <p className="text-[10px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">Recommend 3-5 funds for optimal EMH</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}

function FilterSelect({ value, options, label, onChange }: any) {
    return (
        <div className="relative group">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full appearance-none px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all font-bold text-slate-700 cursor-pointer"
            >
                <option value="">{label}</option>
                {options.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs pointer-events-none">▼</span>
        </div>
    );
}
