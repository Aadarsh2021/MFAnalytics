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
    inception_date?: string;
    returns?: {
        '1Y'?: number;
        '3Y'?: number;
        '5Y'?: number;
    };
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
    const [amcFilter, setAmcFilter] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [assetClasses, setAssetClasses] = useState<string[]>([]);
    const [amcs, setAmcs] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'name' | 'category' | 'amc'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

    // Pagination state
    const [offset, setOffset] = useState(0);
    const [totalFunds, setTotalFunds] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 50;


    const [clientName, setClientName] = useState<string | null>(null);
    const [showClientSwitcher, setShowClientSwitcher] = useState(false);

    const handleClientSwitch = (client: any) => {
        if (window.confirm(`Switch active session to ${client.name}? Current selection will be cleared.`)) {
            sessionStorage.setItem('clientId', client.id.toString());
            sessionStorage.setItem('clientName', client.name);
            window.location.reload();
        }
    };

    useEffect(() => {
        // Hydrate client name from session or fetch if missing
        const storedId = sessionStorage.getItem('clientId');
        const storedName = sessionStorage.getItem('clientName');

        if (storedName) {
            setClientName(storedName);
        } else if (storedId) {
            // Fetch if ID exists but name doesn't (legacy session fix)
            api.clients.get(parseInt(storedId))
                .then(res => {
                    const name = res.data.client_name || `Client #${storedId}`;
                    sessionStorage.setItem('clientName', name);
                    setClientName(name);
                })
                .catch(err => console.error('Failed to fetch client context', err));
        } else {
            // Auto-restore most recent client context (User Request "Use History Client")
            api.clients.list().then(res => {
                const clients = res.data;
                if (clients && clients.length > 0) {
                    // Sort by latest activity
                    const activeClients = clients.filter((c: any) => c.latest_optimization_date);
                    const sorted = activeClients.sort((a: any, b: any) =>
                        new Date(b.latest_optimization_date).getTime() - new Date(a.latest_optimization_date).getTime()
                    );

                    const lastActive = sorted.length > 0 ? sorted[0] : clients[0]; // Fallback to first if no history

                    console.log('Auto-restoring session for:', lastActive.name);
                    sessionStorage.setItem('clientId', lastActive.id.toString());
                    sessionStorage.setItem('clientName', lastActive.name);
                    setClientName(lastActive.name);
                }
            }).catch(e => console.log("No history to restore", e));
        }

        fetchFilters();
    }, []);

    const fetchFilters = async () => {
        try {
            const [catResponse, assetResponse, amcResponse] = await Promise.all([
                api.funds.getCategories(),
                api.funds.getAssetClasses(),
                api.funds.getAMCs()
            ]);
            setCategories(catResponse.data);
            setAssetClasses(assetResponse.data);
            setAmcs(amcResponse.data);
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
                amc: amcFilter || undefined,
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
    }, [searchQuery, categoryFilter, assetClassFilter, amcFilter, planTypeFilter, schemeTypeFilter, funds.length]);

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
    }, [categoryFilter, assetClassFilter, amcFilter, planTypeFilter, schemeTypeFilter]); // Only trigger on filter changes

    const handleLoadMore = () => {
        const nextOffset = offset + PAGE_SIZE;
        setOffset(nextOffset);
        searchFunds(nextOffset, false);
    };

    const handleAudit = async (fund: Fund) => {
        try {
            const response = await api.funds.audit(fund.id);
            const { inception_date } = response.data;

            // Update local state for this fund
            setFunds(prev => prev.map(f =>
                f.id === fund.id ? { ...f, inception_date } : f
            ));

            // Also update selected if present
            setSelectedFunds(prev => {
                const newSelected = new Map(prev);
                if (newSelected.has(fund.id)) {
                    newSelected.set(fund.id, { ...newSelected.get(fund.id)!, inception_date });
                }
                return newSelected;
            });
        } catch (err) {
            console.error('Audit failed:', err);
        }
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
            // Quality mapping for sorting
            const qualityOrder: Record<string, number> = { 'Excellent': 0, 'Good': 1, 'Poor': 2 };

            // Sort by quality first, then by name for consistency
            const sortedByQuality = [...assetFunds].sort((a, b) => {
                const qA = qualityOrder[a.data_quality] ?? 3;
                const qB = qualityOrder[b.data_quality] ?? 3;
                if (qA !== qB) return qA - qB;
                return a.name.localeCompare(b.name);
            });

            // Pick top 4 from each class, EXCLUDING "Poor" unless necessary
            // High quality selection (Excellent or Good)
            const highQuality = sortedByQuality.filter(f => f.data_quality !== 'Poor');

            if (highQuality.length > 0) {
                highQuality.slice(0, 4).forEach(fund => topFunds.set(fund.id, fund));
            }
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

            // Critical Debug: Alert the raw error to help diagnosis
            alert(`Optimization Failed:\n${errorMessage}\n\nReview console for full trace.`);

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
                                <div className="flex items-center gap-3 mt-2">
                                    <p className="text-slate-500 font-medium">
                                        Institutional-grade access with optimized performance paging.
                                    </p>
                                    {clientName && (
                                        <div className="hidden lg:flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full animate-in fade-in slide-in-from-left duration-700">
                                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                                            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                                                Designing for: <span className="text-blue-900">{clientName}</span>
                                            </span>
                                        </div>
                                    )}
                                </div>
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

                    {/* Advanced Fund Selector */}
                    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6 mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-16 -mt-16"></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <span className="text-blue-600">⚡</span> Fund Selector
                                </h2>
                                <div className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                    {totalFunds} Schemes Found
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                {/* Search & Primary Filters */}
                                <div className="md:col-span-8 space-y-4">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-xl">🔍</span>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search by Scheme Name (e.g. Axis Bluechip)"
                                            className="pl-10 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-medium outline-none"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <select
                                            value={amcFilter}
                                            onChange={(e) => setAmcFilter(e.target.value)}
                                            className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="">All AMCs</option>
                                            {amcs.map(amc => (
                                                <option key={amc} value={amc}>{amc}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                            className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="">All Categories</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={assetClassFilter}
                                            onChange={(e) => setAssetClassFilter(e.target.value)}
                                            className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="">All Asset Classes</option>
                                            {assetClasses.map(ac => (
                                                <option key={ac} value={ac}>{ac}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Toggles Panel */}
                                <div className="md:col-span-4 bg-slate-50/50 rounded-xl border border-slate-100 p-4">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Refine Selection</h3>
                                    <div className="space-y-3">
                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800">Plan Type</span>
                                            <div className="relative inline-flex bg-slate-200 rounded-lg p-0.5 border border-slate-200">
                                                <button
                                                    onClick={() => setPlanTypeFilter(planTypeFilter === 'Regular' ? '' : 'Regular')}
                                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${planTypeFilter === 'Regular' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    Reg
                                                </button>
                                                <button
                                                    onClick={() => setPlanTypeFilter(planTypeFilter === 'Direct' ? '' : 'Direct')}
                                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${planTypeFilter === 'Direct' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    Dir
                                                </button>
                                            </div>
                                        </label>

                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800">Option</span>
                                            <div className="relative inline-flex bg-slate-200 rounded-lg p-0.5 border border-slate-200">
                                                <button
                                                    onClick={() => setSchemeTypeFilter(schemeTypeFilter === 'IDCW' ? '' : 'IDCW')}
                                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${schemeTypeFilter === 'IDCW' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    IDCW
                                                </button>
                                                <button
                                                    onClick={() => setSchemeTypeFilter(schemeTypeFilter === 'Growth' ? '' : 'Growth')}
                                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${schemeTypeFilter === 'Growth' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    Grw
                                                </button>
                                            </div>
                                        </label>

                                        <button onClick={autoSelectTopFunds} className="w-full mt-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all py-2 text-xs shadow-lg flex items-center justify-center gap-2">
                                            <span>⚡</span> Auto-Select Top 4
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
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
                                                    <th className="px-3 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[120px]">1 Year</th>
                                                    <th className="px-3 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[120px]">3 Year</th>
                                                    <th className="px-3 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[100px] whitespace-nowrap">Quality</th>
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
                                                        <td className="px-3 py-4">
                                                            {fund.returns?.['1Y'] ? (
                                                                <div className="w-full">
                                                                    <div className="flex justify-between items-end mb-1">
                                                                        <span className="text-xs font-bold text-slate-800">{fund.returns['1Y']}%</span>
                                                                    </div>
                                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-blue-500 rounded-full"
                                                                            style={{ width: `${Math.min(Math.max(fund.returns['1Y'], 0), 100)}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-300 font-bold">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-4">
                                                            {fund.returns?.['3Y'] ? (
                                                                <div className="w-full">
                                                                    <div className="flex justify-between items-end mb-1">
                                                                        <span className="text-xs font-bold text-slate-800">{fund.returns['3Y']}%</span>
                                                                    </div>
                                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-indigo-500 rounded-full"
                                                                            style={{ width: `${Math.min(Math.max(fund.returns['3Y'], 0), 100)}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-300 font-bold">-</span>
                                                            )}
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
                                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">Excellent</span>
                                        </div>
                                        <p className="text-[10px] text-emerald-700 font-medium leading-relaxed">
                                            Fund is fully classified with verified <strong>Asset Class</strong> and <strong>Category</strong>. Historical data is robust.
                                        </p>
                                    </div>
                                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                            <span className="text-xs font-black text-indigo-800 uppercase tracking-wider">Good</span>
                                        </div>
                                        <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
                                            Asset Class is verified (e.g., Equity/Debt), but sub-category logic is generic. Safe to use.
                                        </p>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                            <span className="text-xs font-black text-amber-800 uppercase tracking-wider">Poor / Unknown</span>
                                        </div>
                                        <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                                            Unclassified or New Fund list. Proceed with caution as optimization data might be sparse.
                                        </p>
                                    </div>
                                </div>

                                {/* System Intelligence Note */}
                                <div className="mt-6 p-6 bg-slate-100/50 border border-slate-200 rounded-[1.5rem] border-dashed">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <span className="text-base">💡</span> Classification Intelligence
                                    </h4>
                                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                                        The system automatically audits <span className="text-slate-900 font-bold">37,300+ funds</span> daily.
                                        Classification is based on metadata integrity:
                                        <strong> Excellent</strong> funds have verified risk parameters;
                                        <strong> Good</strong> funds have verified asset classes;
                                        <strong> Poor</strong> funds lack sufficient historical depth or classification metadata.
                                        <em> Note: Auto-selection prioritizes high-integrity funds to ensure mathematical stability in optimization.</em>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Professional Sidebar */}
                    <div className="lg:w-[30%] order-1 lg:order-2">
                        <div className="sticky top-0 h-screen overflow-y-auto no-scrollbar pb-10 pt-6 space-y-6">
                            <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/30 min-h-min">
                                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center justify-between">
                                    Selection Core
                                    <span className="bg-blue-600 text-white text-[10px] px-3 py-1 rounded-full">{selectedFunds.size} Active</span>
                                </h3>
                                {/* Client Context Badge (Sidebar) */}
                                {clientName ? (
                                    <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between gap-3 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-xl">👤</div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Allocating For</p>
                                                <p className="font-black text-blue-900 text-sm truncate max-w-[120px]">{clientName}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowClientSwitcher(true)}
                                            className="opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all text-[10px] font-bold bg-white text-blue-600 px-3 py-1.5 rounded-lg shadow-sm border border-blue-100 hover:bg-blue-600 hover:text-white"
                                        >
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mb-6 bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                                        <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-xl">⚠️</div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">No Context</p>
                                            <button onClick={() => router.push('/intake')} className="font-bold text-amber-900 text-xs underline decoration-amber-400 underline-offset-2">Select Client First</button>
                                        </div>
                                    </div>
                                )}

                                <ClientSwitcher
                                    isOpen={showClientSwitcher}
                                    onClose={() => setShowClientSwitcher(false)}
                                    onSelect={handleClientSwitch}
                                />

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
                                                        <div className="flex items-center gap-1">
                                                            {fund.inception_date && (
                                                                <span className="text-[9px] text-slate-400">
                                                                    Since {new Date(fund.inception_date).getFullYear()}
                                                                </span>
                                                            )}
                                                            <span className={`px-2 py-0.5 rounded-md ${fund.asset_class === 'Equity' ? 'bg-blue-100 text-blue-700' :
                                                                fund.asset_class === 'Debt' ? 'bg-emerald-100 text-emerald-700' :
                                                                    'bg-orange-100 text-orange-700'
                                                                }`}>{fund.asset_class}</span>
                                                        </div>
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


// Client Switching Modal Component
function ClientSwitcher({
    isOpen,
    onClose,
    onSelect
}: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (client: any) => void
}) {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            api.clients.list()
                .then(res => setClients(res.data))
                .catch(err => console.error("Failed to load clients", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-black text-slate-800">Select Client</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 flex items-center justify-center transition-all">✕</button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="py-10 text-center">
                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading Accounts...</p>
                        </div>
                    ) : clients.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-slate-500 mb-4">No clients found.</p>
                            <a href="/intake" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all">Create New Client</a>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {clients.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => onSelect(client)}
                                    className="w-full flex items-center p-4 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg mr-4 shadow-md group-hover:scale-110 transition-transform">
                                        {client.name?.charAt(0) || '#'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{client.name || `Client #${client.id}`}</p>
                                        <p className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded inline-block mt-1 font-bold uppercase tracking-wide">
                                            {client.risk_profile} • {client.investment_horizon}y
                                        </p>
                                    </div>
                                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 font-bold text-sm">
                                        Select →
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
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
