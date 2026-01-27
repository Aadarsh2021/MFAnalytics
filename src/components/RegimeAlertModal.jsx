import { X, AlertTriangle, TrendingUp, Shield, Plus } from 'lucide-react'
import { REGIMES } from '../config/regimeConfig'

export default function RegimeAlertModal({
    isOpen,
    onClose,
    currentRegime,
    portfolioRegime,
    suggestions,
    onRestructure
}) {
    if (!isOpen) return null

    const current = REGIMES[currentRegime]
    const portfolio = REGIMES[portfolioRegime]

    const getSeverity = () => {
        if (currentRegime === 'REGIME_C' && portfolioRegime !== 'REGIME_C') return 'critical'
        if (currentRegime === 'REGIME_D') return 'critical'
        return 'warning'
    }

    const severity = getSeverity()

    const severityStyles = {
        critical: {
            bg: 'bg-red-50',
            border: 'border-red-300',
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            titleColor: 'text-red-900',
            textColor: 'text-red-700'
        },
        warning: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-300',
            iconBg: 'bg-yellow-100',
            iconColor: 'text-yellow-600',
            titleColor: 'text-yellow-900',
            textColor: 'text-yellow-700'
        }
    }

    const style = severityStyles[severity]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className={`${style.bg} border-b-2 ${style.border} p-6 rounded-t-2xl`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 ${style.iconBg} rounded-xl`}>
                                <AlertTriangle className={style.iconColor} size={28} />
                            </div>
                            <div>
                                <h2 className={`text-2xl font-black ${style.titleColor} mb-1`}>
                                    Regime Mismatch Detected
                                </h2>
                                <p className={`text-sm ${style.textColor}`}>
                                    Your portfolio may not be optimized for current market conditions
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white rounded-lg transition"
                        >
                            <X className="text-gray-400 hover:text-gray-600" size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Regime Comparison */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                                Current Market Regime
                            </div>
                            <div className="text-lg font-black text-blue-900 mb-1">
                                {current?.name}
                            </div>
                            <p className="text-xs text-blue-700">
                                {current?.description}
                            </p>
                        </div>

                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                            <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                Your Portfolio Regime
                            </div>
                            <div className="text-lg font-black text-gray-900 mb-1">
                                {portfolio?.name}
                            </div>
                            <p className="text-xs text-gray-700">
                                {portfolio?.description}
                            </p>
                        </div>
                    </div>

                    {/* Why This Matters */}
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                        <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                            <Shield size={18} />
                            Why This Matters
                        </h3>
                        <p className="text-sm text-purple-700">
                            {currentRegime === 'REGIME_C' ? (
                                <>
                                    In <strong>Fiscal Dominance (Regime C)</strong>, traditional bonds often fail as hedges
                                    because they fall alongside equities. Gold and short-term debt become critical for
                                    portfolio protection.
                                </>
                            ) : currentRegime === 'REGIME_D' ? (
                                <>
                                    During <strong>Crisis periods (Regime D)</strong>, correlations spike and diversification
                                    breaks down. Liquidity and defensive positioning are paramount.
                                </>
                            ) : (
                                <>
                                    Your portfolio allocation may not align with current macro conditions, potentially
                                    exposing you to unnecessary risk or missing opportunities.
                                </>
                            )}
                        </p>
                    </div>

                    {/* Suggestions */}
                    {suggestions && suggestions.length > 0 && (
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <TrendingUp size={18} />
                                Recommended Adjustments
                            </h3>
                            <ul className="space-y-2">
                                {suggestions.map((suggestion, idx) => (
                                    <li key={idx} className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                            {idx + 1}
                                        </div>
                                        <span className="text-sm text-green-900 font-medium">
                                            {suggestion}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Current Allocation Bands */}
                    {current?.allocationBands && (
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">
                                Recommended Allocation for {current.name}:
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {Object.entries(current.allocationBands).map(([assetClass, band]) => (
                                    <div key={assetClass} className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                        <div className="text-xs font-bold text-indigo-600 uppercase mb-1">
                                            {assetClass.replace('_', ' ')}
                                        </div>
                                        <div className="text-sm font-black text-indigo-900">
                                            {(band.target * 100).toFixed(0)}%
                                        </div>
                                        <div className="text-xs text-indigo-600">
                                            ({(band.min * 100).toFixed(0)}-{(band.max * 100).toFixed(0)}%)
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex justify-between items-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-bold"
                    >
                        Keep Current Portfolio
                    </button>
                    <button
                        onClick={() => {
                            onRestructure()
                            onClose()
                        }}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Restructure Portfolio
                    </button>
                </div>
            </div>
        </div>
    )
}
