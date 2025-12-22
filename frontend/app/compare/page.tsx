'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface Fund {
    id: number;
    name: string;
    category: string;
    asset_class: string;
    amc: string;
    expense_ratio: number;
}

export default function ComparePage() {
    const router = useRouter();
    const [selectedFunds, setSelectedFunds] = useState<Fund[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Fund[]>([]);
    const [loading, setLoading] = useState(false);

    const searchFunds = async (query: string) => {
        if (!query) {
            setSearchResults([]);
            return;
        }

        try {
            const response = await api.funds.search({ query, limit: 10 });
            setSearchResults(response.data.funds);
        } catch (error) {
            console.error('Search failed:', error);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            searchFunds(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const addFund = (fund: Fund) => {
        if (selectedFunds.length >= 5) {
            alert('You can compare up to 5 funds');
            return;
        }
        if (selectedFunds.find(f => f.id === fund.id)) {
            alert('Fund already added');
            return;
        }
        setSelectedFunds([...selectedFunds, fund]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeFund = (fundId: number) => {
        setSelectedFunds(selectedFunds.filter(f => f.id !== fundId));
    };

    const [fundData, setFundData] = useState<Record<number, { navSeries: { date: string, nav: number }[] }>>({});
    const [performanceMetrics, setPerformanceMetrics] = useState<Record<number, { '1Y': number, '3Y': number, '5Y': number }>>({});

    // Fetch NAV data when funds are selected
    useEffect(() => {
        const fetchNavData = async () => {
            const fundsToFetch = selectedFunds.filter(f => !fundData[f.id]).map(f => f.id);
            if (fundsToFetch.length === 0) return;

            try {
                // Fetch last 5 years + buffer
                const endDate = new Date().toISOString().split('T')[0];
                const startDate = new Date(new Date().setFullYear(new Date().getFullYear() - 6)).toISOString().split('T')[0];

                const response = await api.funds.nav(fundsToFetch, startDate, endDate);

                setFundData(prev => {
                    const newData = { ...prev };
                    response.data.forEach((item: any) => {
                        newData[item.fund_id] = { navSeries: item.nav_series };
                    });
                    return newData;
                });
            } catch (error) {
                console.error('NAV Fetch failed:', error);
            }
        };

        fetchNavData();
    }, [selectedFunds]);

    // Calculate Returns whenever fundData or selectedFunds update
    useEffect(() => {
        const metrics: Record<number, { '1Y': number, '3Y': number, '5Y': number }> = {};

        selectedFunds.forEach(fund => {
            const data = fundData[fund.id];
            if (!data?.navSeries || data.navSeries.length === 0) {
                metrics[fund.id] = { '1Y': 0, '3Y': 0, '5Y': 0 };
                return;
            }

            // Sort descending (latest first)
            const sortedNav = [...data.navSeries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const currentNav = sortedNav[0].nav;
            const currentDate = new Date(sortedNav[0].date);

            const getNavAtDate = (yearsAgo: number) => {
                const targetDate = new Date(currentDate);
                targetDate.setFullYear(targetDate.getFullYear() - yearsAgo);
                // Find closest NAV (simplistic approach: first entry equal or before target)
                // Since it's descending, find first entry where date <= targetDate
                return sortedNav.find(n => new Date(n.date) <= targetDate)?.nav;
            };

            const calculateCAGR = (startNav: number, endNav: number, years: number) => {
                if (!startNav || !endNav) return 0;
                return ((Math.pow(endNav / startNav, 1 / years) - 1) * 100);
            };

            const nav1Y = getNavAtDate(1);
            const nav3Y = getNavAtDate(3);
            const nav5Y = getNavAtDate(5);

            metrics[fund.id] = {
                '1Y': nav1Y ? ((currentNav - nav1Y) / nav1Y) * 100 : 0, // Absolute for 1Y
                '3Y': calculateCAGR(nav3Y || 0, currentNav, 3),
                '5Y': calculateCAGR(nav5Y || 0, currentNav, 5)
            };
        });

        setPerformanceMetrics(metrics);
    }, [selectedFunds, fundData]);

    const comparisonChartOption = {
        title: { text: 'Returns Comparison', left: 'center' },
        tooltip: { trigger: 'axis' },
        legend: { data: selectedFunds.map(f => f.name.substring(0, 30)), bottom: 0 },
        xAxis: { type: 'category', data: ['1 Year', '3 Years', '5 Years'] },
        yAxis: { type: 'value', name: 'Returns (%)', axisLabel: { formatter: '{value}%' } },
        series: selectedFunds.map((fund) => ({
            name: fund.name.substring(0, 30),
            type: 'line',
            data: [
                performanceMetrics[fund.id]?.['1Y']?.toFixed(2) || 0,
                performanceMetrics[fund.id]?.['3Y']?.toFixed(2) || 0,
                performanceMetrics[fund.id]?.['5Y']?.toFixed(2) || 0,
            ],
            smooth: true,
            lineStyle: { width: 3 },
            label: { show: true, position: 'top', formatter: '{c}%' }
        })),
    };

    const expenseRatioChartOption = {
        title: { text: 'Expense Ratio (Not Available)', left: 'center', subtext: 'Data source limitation' },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: { type: 'category', data: selectedFunds.map(f => f.name.substring(0, 20)) },
        yAxis: { type: 'value', name: 'Expense Ratio (%)', axisLabel: { formatter: '{value}%' } },
        series: [{
            type: 'bar',
            data: selectedFunds.map(() => 0), // Placeholder
            itemStyle: { color: '#e5e7eb' },
            label: { show: true, position: 'top', formatter: 'N/A' },
        }],
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4">
                    {/* Header */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Compare Mutual Funds
                        </h1>
                        <p className="text-gray-600">
                            Compare up to 5 mutual fund schemes side-by-side with real-time analytics
                        </p>
                    </div>

                    {/* Search */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search for funds to compare..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {searchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                                    {searchResults.map(fund => (
                                        <div
                                            key={fund.id}
                                            onClick={() => addFund(fund)}
                                            className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="font-medium text-gray-900">{fund.name}</div>
                                            <div className="text-sm text-gray-600">{fund.category} • {fund.amc}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {selectedFunds.map(fund => (
                                <div
                                    key={fund.id}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full"
                                >
                                    <span className="text-sm font-medium">{fund.name.substring(0, 40)}...</span>
                                    <button
                                        onClick={() => removeFund(fund.id)}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedFunds.length > 0 && (
                        <>
                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                <div className="bg-white rounded-lg shadow-sm p-6">
                                    <ReactECharts option={comparisonChartOption} style={{ height: '400px' }} />
                                </div>
                                <div className="bg-white rounded-lg shadow-sm p-6">
                                    <ReactECharts option={expenseRatioChartOption} style={{ height: '400px' }} />
                                </div>
                            </div>

                            {/* Comparison Table */}
                            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                                Parameter
                                            </th>
                                            {selectedFunds.map(fund => (
                                                <th key={fund.id} className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                                    {fund.name.substring(0, 30)}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        <tr className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">Category</td>
                                            {selectedFunds.map(fund => (
                                                <td key={fund.id} className="px-6 py-4 text-sm text-gray-700">{fund.category}</td>
                                            ))}
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">Asset Class</td>
                                            {selectedFunds.map(fund => (
                                                <td key={fund.id} className="px-6 py-4">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${fund.asset_class === 'Equity' ? 'bg-blue-100 text-blue-800' :
                                                        fund.asset_class === 'Debt' ? 'bg-green-100 text-green-800' :
                                                            fund.asset_class === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-purple-100 text-purple-800'
                                                        }`}>
                                                        {fund.asset_class}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="hover:bg-gray-50 bg-blue-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">1 Year Return</td>
                                            {selectedFunds.map((fund) => (
                                                <td key={fund.id} className="px-6 py-4 text-sm font-bold text-green-700">
                                                    {performanceMetrics[fund.id]?.['1Y'] ? `${performanceMetrics[fund.id]['1Y'].toFixed(2)}%` : 'N/A'}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="hover:bg-gray-50 bg-blue-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">3 Year CAGR</td>
                                            {selectedFunds.map((fund) => (
                                                <td key={fund.id} className="px-6 py-4 text-sm font-bold text-green-700">
                                                    {performanceMetrics[fund.id]?.['3Y'] ? `${performanceMetrics[fund.id]['3Y'].toFixed(2)}%` : 'N/A'}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="hover:bg-gray-50 bg-blue-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">5 Year CAGR</td>
                                            {selectedFunds.map((fund) => (
                                                <td key={fund.id} className="px-6 py-4 text-sm font-bold text-green-700">
                                                    {performanceMetrics[fund.id]?.['5Y'] ? `${performanceMetrics[fund.id]['5Y'].toFixed(2)}%` : 'N/A'}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">Expense Ratio</td>
                                            {selectedFunds.map(fund => (
                                                <td key={fund.id} className="px-6 py-4 text-sm text-gray-400 italic">
                                                    Not Available
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {selectedFunds.length === 0 && (
                        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                            <div className="text-6xl mb-4">📊</div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Start Comparing Funds
                            </h2>
                            <p className="text-gray-600">
                                Search and add up to 5 mutual funds to compare their performance metrics
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
