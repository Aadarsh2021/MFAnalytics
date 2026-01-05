import { Plus, X, CheckCircle, TrendingUp, TrendingDown, Minus, RotateCcw } from 'lucide-react'

export default function Step4SetViews({
    views,
    setViews,
    returns,
    allData,
    goToStep
}) {
    const applyRegime = (regime) => {
        const newViews = []
        if (regime === 'bullish') {
            newViews.push({ type: 'absolute', assetIdx: 0, return: 0.05 })
        } else if (regime === 'bearish') {
            newViews.push({ type: 'absolute', assetIdx: 0, return: -0.02 })
        }
        setViews(newViews)
    }

    const clearViews = () => setViews([])

    const addView = () => {
        setViews([...views, { type: 'absolute', assetIdx: 0, return: 0 }])
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
        <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
                💭 Step 4: Express Market Views (Optional)
            </h2>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-900">
                    💡 Add your forward-looking expectations. Leave empty to use equilibrium returns.
                </p>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Quick Regime Presets</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                        onClick={() => applyRegime('bullish')}
                        className="p-4 border-2 border-blue-300 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <div className="flex items-center justify-center gap-2 font-semibold text-blue-800">
                            <TrendingUp size={20} />
                            Bullish
                        </div>
                        <div className="text-xs text-blue-700 mt-1">Risk-on sentiment</div>
                    </button>
                    <button
                        onClick={() => applyRegime('bearish')}
                        className="p-4 border-2 border-red-300 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        <div className="flex items-center justify-center gap-2 font-semibold text-red-800">
                            <TrendingDown size={20} />
                            Bearish
                        </div>
                        <div className="text-xs text-red-700 mt-1">Flight to safety</div>
                    </button>
                    <button
                        onClick={() => applyRegime('neutral')}
                        className="p-4 border-2 border-gray-300 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <div className="flex items-center justify-center gap-2 font-semibold text-gray-800">
                            <Minus size={20} />
                            Neutral
                        </div>
                        <div className="text-xs text-gray-700 mt-1">Balanced view</div>
                    </button>
                    <button
                        onClick={clearViews}
                        className="p-4 border-2 border-slate-300 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <div className="flex items-center justify-center gap-2 font-semibold text-slate-800">
                            <RotateCcw size={20} />
                            Clear
                        </div>
                        <div className="text-xs text-slate-700 mt-1">No views</div>
                    </button>
                </div>
            </div>

            <div className="space-y-3 mb-6">
                {views.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                        No views added. Will use equilibrium returns.
                    </p>
                ) : (
                    views.map((view, idx) => (
                        <div key={idx} className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                            <div className="flex gap-3 items-center">
                                <select
                                    value={view.assetIdx}
                                    onChange={(e) => updateView(idx, 'assetIdx', parseInt(e.target.value))}
                                    className="flex-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {returns.codes.map((code, i) => (
                                        <option key={code} value={i}>
                                            {allData[code].name.substring(0, 30)}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={(view.return * 100).toFixed(2)}
                                    onChange={(e) => updateView(idx, 'return', parseFloat(e.target.value) / 100)}
                                    className="w-24 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Return %"
                                />
                                <button
                                    onClick={() => removeView(idx)}
                                    className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="flex gap-3">
                <button
                    onClick={addView}
                    className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold flex items-center gap-2"
                >
                    <Plus size={20} />
                    Add Custom View
                </button>
                <button
                    onClick={() => goToStep(5)}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
                >
                    <CheckCircle size={20} />
                    Proceed to Black-Litterman (Step 5) →
                </button>
            </div>
        </div>
    )
}
