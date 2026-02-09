import React from 'react';
import { Activity, TrendingUp, Shield, BarChart3, AlertCircle, TrendingDown } from 'lucide-react';

export default function SixPillarsDashboard({ indicators, scores, regimeScore }) {
    const pillars = [
        {
            id: 'realRates',
            name: 'Real Rates',
            subtitle: 'Effective Rate - CPI',
            value: indicators?.realRate !== undefined ? `${indicators.realRate.toFixed(2)}%` : 'N/A',
            score: scores?.realRate || 0,
            description: 'If < 1.0%, the regime is active.',
            warning: indicators?.realRate < 1.0
        },
        {
            id: 'fiscalConstraint',
            name: 'Fiscal Constraint',
            subtitle: 'Interest Exp / GDP',
            value: indicators?.debtStress !== undefined ? `${indicators.debtStress.toFixed(2)}%` : 'N/A',
            score: scores?.debtStress || 0,
            description: 'Stressed when debt interest > 3% of GDP.',
            warning: indicators?.debtStress > 3.0
        },
        {
            id: 'bondEquityCorr',
            name: 'Bond-Equity Corr',
            subtitle: '12M Rolling Correlation',
            value: indicators?.bondEquityCorr !== undefined ? indicators.bondEquityCorr.toFixed(2) : 'N/A',
            score: scores?.bondEquityCorr || 0,
            description: 'Positive correlation = safe havens failing.',
            warning: indicators?.bondEquityCorr > 0
        },
        {
            id: 'cbGoldBuying',
            name: 'CB Gold Purchases',
            subtitle: 'World Gold Council',
            value: indicators?.cbGoldBuying !== undefined ? `${indicators.cbGoldBuying.toFixed(1)}t` : 'N/A',
            score: scores?.cbGoldBuying || 0,
            description: 'High buying = structural de-dollarization.',
            warning: scores?.cbGoldBuying > 0.7
        },
        {
            id: 'inflationVol',
            name: 'Inflation Volatility',
            subtitle: '12M Std Dev of CPI',
            value: indicators?.inflationVol !== undefined ? `${indicators.inflationVol.toFixed(2)}%` : 'N/A',
            score: scores?.inflationVol || 0,
            description: 'Large swings = loss of monetary control.',
            warning: indicators?.inflationVol > 2.0
        },
        {
            id: 'volRatio',
            name: 'Volatility Ratio',
            subtitle: 'Inflation Vol / Growth Vol',
            value: indicators?.volatilityRatio !== undefined ? indicators.volatilityRatio.toFixed(2) : 'N/A',
            score: scores?.volatilityRatio || 0,
            description: 'Regime C signature if ratio > 1.0.',
            warning: indicators?.volatilityRatio > 1.0
        }
    ];

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-6">
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Activity className="text-indigo-600 w-5 h-5" />
                    <h3 className="font-bold text-slate-800 text-lg">Global Macro AI - 6 Pillars</h3>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Regime C Score:</span>
                    <div className="flex items-center gap-2 bg-indigo-100 px-3 py-1 rounded-full">
                        <span className={`text-lg font-bold ${regimeScore > 0.5 ? 'text-amber-600' : 'text-indigo-600'}`}>
                            {(regimeScore * 100).toFixed(1)}%
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${regimeScore > 0.5 ? 'bg-amber-200 text-amber-800' : 'bg-indigo-200 text-indigo-800'
                            }`}>
                            {regimeScore > 0.5 ? 'ACTIVE' : 'NORMAL'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-b border-slate-200">
                {pillars.map((pillar) => (
                    <div key={pillar.id} className="p-5 border-r border-b border-slate-100 last:border-r-0">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    {pillar.name}
                                    {pillar.warning && <AlertCircle className="w-4 h-4 text-amber-500" />}
                                </h4>
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-tight">{pillar.subtitle}</p>
                            </div>
                            <span className="text-xl font-black text-indigo-900">{pillar.value}</span>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                                <span>Score</span>
                                <span>{(pillar.score * 100).toFixed(0)}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${pillar.score > 0.7 ? 'bg-amber-500' :
                                        pillar.score > 0.4 ? 'bg-indigo-500' :
                                            'bg-slate-400'
                                        }`}
                                    style={{ width: `${pillar.score * 100}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight italic">{pillar.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-slate-50 p-4 text-xs text-slate-500 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-400" />
                <span className="font-medium">The system uses normalized scoring (0.0 to 1.0) with weighted aggregation. Score &gt; 50% triggers Regime C (Fiscal Dominance) tilt.</span>
            </div>
        </div>
    );
}
