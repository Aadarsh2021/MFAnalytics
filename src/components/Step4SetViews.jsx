import { useState } from 'react'
import { Plus, X, CheckCircle, TrendingUp, TrendingDown, Minus, RotateCcw, ArrowRightLeft, AlertTriangle, Target, Percent } from 'lucide-react'
import RegimeSelector from './RegimeSelector'

export default function Step4SetViews({
    views,
    setViews,
    returns,
    allData,
    goToStep,
    selectedRegimeId,
    setSelectedRegimeId
}) {
    // Helper to get asset name safely
    const getName = (idx) => {
        if (!returns || !returns.codes[idx]) return 'Unknown Asset'
        return allData[returns.codes[idx]].name
    }

    const findAsset = (keywords) => {
        return returns.codes.findIndex(code => {
            const name = allData[code].name.toLowerCase()
            return keywords.some(k => name.includes(k))
        })
    }

    const applyRegime = (regime) => {
        const newViews = []
        const equityIdx = findAsset(['equity', 'nifty', 'index', 'stock', 'midcap', 'large'])
        const debtIdx = findAsset(['bond', 'debt', 'gilt', 'liquid', 'income'])

        const eIdx = equityIdx >= 0 ? equityIdx : 0
        const dIdx = debtIdx >= 0 ? debtIdx : (returns.codes.length > 1 ? 1 : 0)

        if (regime === 'bullish') {
            newViews.push({ type: 'absolute', assetIdx: eIdx, return: 0.0, confidence: 0.6 })
        } else if (regime === 'bearish') {
            newViews.push({ type: 'absolute', assetIdx: eIdx, return: 0.0, confidence: 0.7 })
        } else if (regime === 'rising_rates') {
            if (dIdx >= 0) newViews.push({ type: 'absolute', assetIdx: dIdx, return: 0.0, confidence: 0.6 })
        } else if (regime === 'recession') {
            if (eIdx >= 0) newViews.push({ type: 'absolute', assetIdx: eIdx, return: 0.0, confidence: 0.8 })
            if (dIdx >= 0) newViews.push({ type: 'absolute', assetIdx: dIdx, return: 0.0, confidence: 0.7 })
        } else if (regime === 'neutral') {
            // Neutral view signals Equal Weight allocation (ignore Market Cap)
            newViews.push({ type: 'neutral', useEqualWeight: true, assetIdx: eIdx, return: 0.0, confidence: 0.0 })
        }
        setViews(newViews)
    }

    const clearViews = () => setViews([])

    const addView = () => {
        setViews([...views, {
            type: 'absolute',
            assetIdx: 0,
            asset1Idx: 0,
            asset2Idx: Math.min(1, returns.codes.length - 1),
            return: 0.0,
            confidence: 0.5
        }])
    }

    const updateView = (idx, field, value) => {
        const newViews = [...views]
        newViews[idx][field] = value
        setViews(newViews)
    }

    const removeView = (idx) => {
        setViews(views.filter((_, i) => i !== idx))
    }

    return (
        <div className="space-y-6">
            {/* Regime Selector */}
            <RegimeSelector
                selectedRegime={selectedRegimeId}
                onRegimeChange={setSelectedRegimeId}
            />

            <div className="bg-white rounded-xl shadow-lg p-8 animate-fade-in border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Target className="text-indigo-600" size={28} />
                            Step 4: Express Market Views
                        </h2>
                        <p className="text-gray-500 mt-1">Refine the portfolio using your expectations for specific funds.</p>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button onClick={clearViews} className="p-2 text-slate-500 hover:text-red-600 transition" title="Clear All">
                            <RotateCcw size={20} />
                        </button>
                    </div>
                </div>

                {/* Market Scenarios / Presets */}
                <div className="mb-8">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Scenarios</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <ScenarioButton icon={<TrendingUp size={18} />} label="Bullish" color="green" onClick={() => applyRegime('bullish')} />
                        <ScenarioButton icon={<TrendingDown size={18} />} label="Bearish" color="red" onClick={() => applyRegime('bearish')} />
                        <ScenarioButton icon={<AlertTriangle size={18} />} label="Recession" color="purple" onClick={() => applyRegime('recession')} />
                        <ScenarioButton icon={<Minus size={18} />} label="Neutral" color="gray" onClick={() => applyRegime('neutral')} />
                        <button
                            onClick={addView}
                            className="p-4 border-2 border-dashed border-indigo-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition flex flex-col items-center justify-center gap-1 text-indigo-600 font-bold text-xs"
                        >
                            <Plus size={20} />
                            Custom
                        </button>
                    </div>
                </div>

                {/* Views List */}
                <div className="space-y-4 mb-8">
                    {views.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <Plus className="text-slate-300" size={32} />
                            </div>
                            <h4 className="text-slate-600 font-semibold">No views defined</h4>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto mt-1">
                                Add a view to adjust the model towards your market expectations.
                            </p>
                            <button onClick={addView} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold shadow-md">
                                Add First View
                            </button>
                        </div>
                    ) : (
                        views.map((view, idx) => (
                            <div key={idx} className="group relative bg-white border-2 border-slate-100 rounded-2xl p-6 hover:border-indigo-200 hover:shadow-xl transition-all duration-300">
                                <button
                                    onClick={() => removeView(idx)}
                                    className="absolute -top-3 -right-3 w-8 h-8 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 shadow-sm transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <X size={16} />
                                </button>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                                    {/* Type Toggle & Selection */}
                                    <div className="lg:col-span-5 space-y-4">
                                        <div className="flex bg-slate-100 rounded-xl p-1 w-fit">
                                            <button
                                                onClick={() => updateView(idx, 'type', 'absolute')}
                                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${view.type === 'absolute' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                            >
                                                Absolute View
                                            </button>
                                            <button
                                                onClick={() => updateView(idx, 'type', 'relative')}
                                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${view.type === 'relative' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                            >
                                                Relative View
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {view.type === 'absolute' ? (
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Fund</label>
                                                    <select
                                                        value={view.assetIdx}
                                                        onChange={(e) => updateView(idx, 'assetIdx', parseInt(e.target.value))}
                                                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    >
                                                        {returns.codes.map((code, i) => (
                                                            <option key={i} value={i}>{allData[code].name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outperforming Fund</label>
                                                        <select
                                                            value={view.asset1Idx || 0}
                                                            onChange={(e) => updateView(idx, 'asset1Idx', parseInt(e.target.value))}
                                                            className="w-full p-3 bg-green-50 text-green-800 border-none rounded-xl text-sm font-semibold outline-none"
                                                        >
                                                            {returns.codes.map((code, i) => (
                                                                <option key={i} value={i}>{allData[code].name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="flex items-center gap-2 px-2">
                                                        <ArrowRightLeft size={14} className="text-slate-300" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">vs</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Underperforming Fund</label>
                                                        <select
                                                            value={view.asset2Idx || 1}
                                                            onChange={(e) => updateView(idx, 'asset2Idx', parseInt(e.target.value))}
                                                            className="w-full p-3 bg-red-50 text-red-800 border-none rounded-xl text-sm font-semibold outline-none"
                                                        >
                                                            {returns.codes.map((code, i) => (
                                                                <option key={i} value={i}>{allData[code].name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Estimated Return Input */}
                                    <div className="lg:col-span-3">
                                        <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                {view.type === 'absolute' ? 'Expected Annual %' : 'Expected Outperformance %'}
                                            </label>
                                            <div className="flex items-center justify-center gap-1">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={(view.return * 100).toFixed(1)}
                                                    onChange={(e) => updateView(idx, 'return', parseFloat(e.target.value) / 100)}
                                                    className="w-20 bg-transparent text-2xl font-black text-slate-800 focus:outline-none text-center"
                                                />
                                                <span className="text-lg font-bold text-slate-400">%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Confidence & Summary */}
                                    <div className="lg:col-span-4 space-y-4">
                                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">View Confidence</label>
                                                <span className="text-sm font-black text-indigo-700">{(view.confidence * 100).toFixed(0)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="100"
                                                value={view.confidence * 100}
                                                onChange={(e) => updateView(idx, 'confidence', parseInt(e.target.value) / 100)}
                                                className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                            <div className="flex justify-between mt-1 text-[8px] font-bold text-indigo-300 uppercase">
                                                <span>Low</span>
                                                <span>High</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <p className="text-xs text-slate-400 italic">
                        * Annualized returns are adjusted to daily scale for model processing.
                    </p>
                    <button
                        onClick={() => goToStep(5)}
                        className="px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-slate-900 font-bold text-lg flex items-center gap-3 transition-all hover-lift shadow-xl shadow-indigo-100"
                    >
                        Calculate Black-Litterman
                        <CheckCircle size={22} />
                    </button>
                </div>
            </div>
        </div>
    )
}

function ScenarioButton({ icon, label, color, onClick }) {
    const colors = {
        green: 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100',
        red: 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100',
        gray: 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
    }
    return (
        <button
            onClick={onClick}
            className={`p-4 border-2 rounded-xl flex flex-col items-center justify-center gap-2 transition font-bold text-xs ${colors[color]}`}
        >
            {icon}
            {label}
        </button>
    )
}
