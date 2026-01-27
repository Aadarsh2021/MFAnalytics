import { useState, useEffect } from 'react'
import { Plus, X, CheckCircle, Target, Zap, Scale, Edit3, AlertTriangle } from 'lucide-react'
import { detectRegime } from '../utils/regimeDetector'
import Step4SetViews from './Step4SetViews'

export default function Step4BBlackLittermanViews({
    views,
    setViews,
    returns,
    allData,
    goToStep,
    selectedRegimeId,
    setSelectedRegimeId,
    weightMethod,
    setWeightMethod,
    customWeights,
    setCustomWeights,
    macroData,
    setRegimeContext
}) {
    const [showCustomEditor, setShowCustomEditor] = useState(false)

    // Background regime detection for alerts
    useEffect(() => {
        if (macroData && macroData.length > 0) {
            const latestData = macroData[macroData.length - 1]
            const detection = detectRegime(latestData)

            // Store for final report alerts
            setRegimeContext({
                detection,
                timestamp: new Date().toISOString()
            })
        }
    }, [macroData])

    const initializeCustomWeights = () => {
        const weights = {}
        returns.codes.forEach(code => {
            weights[code] = 1.0 / returns.codes.length // Equal weight to start
        })
        setCustomWeights(weights)
        setShowCustomEditor(true)
    }

    const updateCustomWeight = (code, value) => {
        setCustomWeights({
            ...customWeights,
            [code]: parseFloat(value) || 0
        })
    }

    const normalizeWeights = () => {
        const total = Object.values(customWeights).reduce((sum, w) => sum + w, 0)
        if (total === 0) return

        const normalized = {}
        Object.keys(customWeights).forEach(code => {
            normalized[code] = customWeights[code] / total
        })
        setCustomWeights(normalized)
    }

    const proceedToOptimization = () => {
        if (weightMethod === 'custom' && !customWeights) {
            alert('Please define custom weights first')
            return
        }

        if (weightMethod === 'custom') {
            normalizeWeights()
        }

        goToStep(5) // Go to Black-Litterman Optimization
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Weight Method Selection */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                        <Scale className="text-emerald-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Step 4B: Weight Method & Views</h2>
                        <p className="text-gray-500">Choose how to weight your portfolio before applying views</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Market Cap Weights */}
                    <WeightMethodCard
                        title="Market Cap Weights"
                        description="Weight by fund AUM (Assets Under Management)"
                        icon={<Zap />}
                        color="blue"
                        selected={weightMethod === 'market_cap'}
                        onSelect={() => setWeightMethod('market_cap')}
                        recommended={true}
                    />

                    {/* Equal Weights */}
                    <WeightMethodCard
                        title="Equal Weights"
                        description="All funds get equal allocation"
                        icon={<Scale />}
                        color="purple"
                        selected={weightMethod === 'equal'}
                        onSelect={() => setWeightMethod('equal')}
                    />

                    {/* Custom Weights */}
                    <WeightMethodCard
                        title="Custom Weights"
                        description="Manually define starting weights"
                        icon={<Edit3 />}
                        color="orange"
                        selected={weightMethod === 'custom'}
                        onSelect={() => {
                            setWeightMethod('custom')
                            if (!customWeights) {
                                initializeCustomWeights()
                            }
                        }}
                    />
                </div>

                {/* Custom Weight Editor */}
                {weightMethod === 'custom' && (
                    <div className="mt-6 p-6 bg-orange-50 border border-orange-200 rounded-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-orange-900">Define Custom Weights</h4>
                            <button
                                onClick={normalizeWeights}
                                className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold text-sm"
                            >
                                Normalize to 100%
                            </button>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {returns.codes.map((code, idx) => (
                                <div key={code} className="flex items-center gap-4 bg-white p-3 rounded-lg">
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-800 text-sm">
                                            {allData[code].name}
                                        </div>
                                        <div className="text-xs text-gray-500">{code}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="1"
                                            value={(customWeights[code] || 0).toFixed(4)}
                                            onChange={(e) => updateCustomWeight(code, e.target.value)}
                                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-right"
                                        />
                                        <span className="text-sm font-bold text-gray-500">
                                            ({((customWeights[code] || 0) * 100).toFixed(1)}%)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 p-3 bg-white rounded-lg border border-orange-300">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-orange-900">Total:</span>
                                <span className={`text-lg font-black ${Math.abs(Object.values(customWeights).reduce((sum, w) => sum + w, 0) - 1.0) < 0.001
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                    }`}>
                                    {(Object.values(customWeights).reduce((sum, w) => sum + w, 0) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Weight Method Info */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                        <div className="text-sm text-blue-700">
                            <strong>Note:</strong> These weights serve as the "prior" in Black-Litterman optimization.
                            Your views will adjust these weights based on your confidence levels.
                        </div>
                    </div>
                </div>
            </div>

            {/* Views Section (Reuse existing component) */}
            <Step4SetViews
                views={views}
                setViews={setViews}
                returns={returns}
                allData={allData}
                goToStep={goToStep}
                selectedRegimeId={selectedRegimeId}
                setSelectedRegimeId={setSelectedRegimeId}
            />

            {/* Proceed Button Override */}
            <div className="flex justify-between items-center pt-6">
                <button
                    onClick={() => goToStep(4)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold"
                >
                    ← Back to Path Selection
                </button>
                <button
                    onClick={proceedToOptimization}
                    className="px-8 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-lg flex items-center gap-3 shadow-xl"
                >
                    Optimize with Black-Litterman
                    <CheckCircle size={22} />
                </button>
            </div>
        </div>
    )
}

function WeightMethodCard({ title, description, icon, color, selected, onSelect, recommended }) {
    const colors = {
        blue: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            selectedBorder: 'border-blue-500',
            iconBg: 'bg-blue-100',
            iconText: 'text-blue-600',
            text: 'text-blue-900'
        },
        purple: {
            bg: 'bg-purple-50',
            border: 'border-purple-200',
            selectedBorder: 'border-purple-500',
            iconBg: 'bg-purple-100',
            iconText: 'text-purple-600',
            text: 'text-purple-900'
        },
        orange: {
            bg: 'bg-orange-50',
            border: 'border-orange-200',
            selectedBorder: 'border-orange-500',
            iconBg: 'bg-orange-100',
            iconText: 'text-orange-600',
            text: 'text-orange-900'
        }
    }

    const theme = colors[color]

    return (
        <div
            onClick={onSelect}
            className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${selected ? `${theme.selectedBorder} shadow-md` : theme.border
                }`}
        >
            {recommended && (
                <div className="absolute -top-2 -right-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
                    Recommended
                </div>
            )}

            {selected && (
                <div className="absolute -top-3 -left-3 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="text-white" size={16} />
                </div>
            )}

            <div className={`w-12 h-12 ${theme.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                <div className={theme.iconText}>
                    {icon}
                </div>
            </div>

            <h4 className={`font-bold ${theme.text} mb-2`}>{title}</h4>
            <p className="text-sm text-gray-600">{description}</p>
        </div>
    )
}
