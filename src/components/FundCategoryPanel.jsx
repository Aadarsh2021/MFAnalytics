import { useState, useEffect } from 'react';
import { PieChart, BarChart3, TrendingUp, Wallet, Shield } from 'lucide-react';
import { getCategoryColor } from '../utils/fundCategorization';

/**
 * FundCategoryPanel Component
 * Displays categorization of selected funds with visual statistics
 */
export default function FundCategoryPanel({ selectedFunds }) {
    const [stats, setStats] = useState(null);
    const [grouped, setGrouped] = useState({});

    useEffect(() => {
        if (selectedFunds && selectedFunds.length > 0) {
            // Group funds by their category property
            const groupedFunds = {
                Equity: [],
                Debt: [],
                Hybrid: [],
                Gold: [],
                Unknown: []
            };

            selectedFunds.forEach(fund => {
                const category = fund.category || 'Unknown';
                if (groupedFunds[category]) {
                    groupedFunds[category].push(fund);
                } else {
                    groupedFunds.Unknown.push(fund);
                }
            });

            setGrouped(groupedFunds);

            // Calculate statistics
            const total = selectedFunds.length;
            const newStats = { total };

            ['Equity', 'Debt', 'Hybrid', 'Gold', 'Unknown'].forEach(cat => {
                const count = groupedFunds[cat] ? groupedFunds[cat].length : 0;
                newStats[cat] = {
                    count,
                    percentage: ((count / total) * 100).toFixed(1)
                };
            });

            setStats(newStats);
        } else {
            setStats(null);
            setGrouped({});
        }
    }, [selectedFunds]);

    if (!selectedFunds || selectedFunds.length === 0) {
        return null;
    }

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'Equity':
                return <TrendingUp className="w-5 h-5" />;
            case 'Debt':
                return <Shield className="w-5 h-5" />;
            case 'Hybrid':
                return <Wallet className="w-5 h-5" />;
            case 'Gold':
                return <PieChart className="w-5 h-5" />; // Or BarChart3
            default:
                return <BarChart3 className="w-5 h-5" />;
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-6 border-2 border-indigo-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-600 rounded-lg">
                    <PieChart className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Fund Category Analysis</h3>
                    <p className="text-sm text-gray-600">
                        Automatic classification: Equity / Debt / Hybrid / Gold
                    </p>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    {['Equity', 'Debt', 'Hybrid', 'Gold', 'Unknown'].map(category => {
                        const categoryStats = stats[category];
                        const colors = getCategoryColor(category);

                        if (categoryStats.count === 0) return null;

                        return (
                            <div
                                key={category}
                                className={`${colors.bg} ${colors.border} border-2 rounded-lg p-4 transition-all hover:scale-105 hover:shadow-md`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`${colors.text}`}>
                                        {getCategoryIcon(category)}
                                    </div>
                                    <span className={`text-sm font-semibold ${colors.text}`}>
                                        {category}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-3xl font-bold ${colors.text}`}>
                                        {categoryStats.count}
                                    </span>
                                    <span className={`text-sm ${colors.text} opacity-75`}>
                                        ({categoryStats.percentage}%)
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detailed Breakdown */}
            <div className="space-y-4">
                {['Equity', 'Debt', 'Hybrid', 'Gold', 'Unknown'].map(category => {
                    const funds = grouped[category] || [];
                    const colors = getCategoryColor(category);

                    if (funds.length === 0) return null;

                    return (
                        <div key={category} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`p-1.5 ${colors.badge} rounded`}>
                                    <div className="text-white">
                                        {getCategoryIcon(category)}
                                    </div>
                                </div>
                                <h4 className="font-bold text-gray-800">
                                    {category} Funds ({funds.length})
                                </h4>
                            </div>

                            <div className="space-y-2">
                                {funds.map((fund, idx) => (
                                    <div
                                        key={fund.code || idx}
                                        className={`flex items-start gap-3 p-3 ${colors.bg} rounded-lg border ${colors.border}`}
                                    >
                                        <span className={`text-xs font-bold ${colors.text} mt-0.5`}>
                                            {idx + 1}.
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-800">
                                                {fund.name || fund.schemeName}
                                            </p>
                                            {/* SEBI Sub-Category */}
                                            {fund.sebiCategory && fund.sebiCategory !== 'Not Available' && (
                                                <p className="text-xs text-gray-600 mt-0.5 italic">
                                                    📋 {fund.sebiCategory}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs px-2 py-0.5 bg-white bg-opacity-60 text-gray-600 rounded border border-gray-300">
                                                    Code: {fund.code || fund.schemeCode}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 ${colors.badge} text-white rounded font-semibold`}>
                                                    {category}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Info Note */}
            <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                    <div className="text-blue-600 mt-0.5">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900 mb-1">
                            📊 Categorization Logic
                        </p>
                        <ul className="text-xs text-blue-800 space-y-1">
                            <li>• <strong>Equity:</strong> Large Cap, Mid Cap, Small Cap, Sectoral, Thematic, Index, ELSS</li>
                            <li>• <strong>Debt:</strong> Liquid, Gilt, Corporate Bond, Duration Funds, Money Market, Floating Rate</li>
                            <li>• <strong>Hybrid:</strong> Balanced, Multi-Asset, Equity Savings, Arbitrage</li>
                            <li>• <strong>Gold:</strong> Gold ETF, Gold Fund, Silver ETF, Silver Fund, Commodity Funds</li>
                            <li>• <strong>Unknown:</strong> Funds that don't match standard keywords (review manually)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
