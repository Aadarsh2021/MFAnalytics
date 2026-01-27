import { useState } from 'react';
import { ChevronDown, Info, TrendingUp, Shield, AlertTriangle, DollarSign } from 'lucide-react';
import { REGIMES, getRegime, getRegimeOptions } from '../config/regimeConfig';

/**
 * Regime Selector Component
 * Allows user to select market regime for portfolio allocation
 */
export default function RegimeSelector({ selectedRegime, onRegimeChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const regimeOptions = getRegimeOptions();
    const currentRegime = getRegime(selectedRegime);

    const getRegimeIcon = (regimeId) => {
        switch (regimeId) {
            case 'REGIME_A': return <TrendingUp className="w-5 h-5" />;
            case 'REGIME_B': return <Shield className="w-5 h-5" />;
            case 'REGIME_C': return <AlertTriangle className="w-5 h-5" />;
            case 'REGIME_D': return <AlertTriangle className="w-5 h-5" />;
            default: return <DollarSign className="w-5 h-5" />;
        }
    };

    return (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-lg border-2 border-indigo-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                        <Info className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Market Regime Selection</h3>
                        <p className="text-xs text-indigo-100">
                            Choose allocation strategy based on macroeconomic conditions
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-5">
                {/* Regime Dropdown */}
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                        🌍 Select Market Regime
                    </label>
                    <div className="relative">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-between hover:border-indigo-400 transition"
                            style={{ backgroundColor: currentRegime.color + '10' }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="text-white p-2 rounded" style={{ backgroundColor: currentRegime.color }}>
                                    {getRegimeIcon(selectedRegime)}
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold text-gray-800">{currentRegime.name}</div>
                                    <div className="text-xs text-gray-600">{currentRegime.shortName}</div>
                                </div>
                            </div>
                            <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isOpen && (
                            <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-96 overflow-y-auto">
                                {regimeOptions.map(option => {
                                    const regime = getRegime(option.value);
                                    return (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                onRegimeChange(option.value);
                                                setIsOpen(false);
                                            }}
                                            className={`w-full p-4 text-left hover:bg-gray-50 transition border-b border-gray-200 last:border-b-0 ${selectedRegime === option.value ? 'bg-indigo-50' : ''
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="text-white p-2 rounded mt-1" style={{ backgroundColor: regime.color }}>
                                                    {getRegimeIcon(option.value)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-semibold text-gray-800">{option.label}</div>
                                                    <div className="text-xs text-gray-600 mt-1">{option.description}</div>
                                                </div>
                                                {selectedRegime === option.value && (
                                                    <div className="text-green-600 text-xl">✓</div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Regime Details */}
                <div className="space-y-3">
                    {/* Core Question */}
                    <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                        <div className="text-xs font-bold text-gray-600 mb-1">💡 CORE QUESTION</div>
                        <div className="text-sm font-semibold text-gray-800 italic">
                            "{currentRegime.coreQuestion}"
                        </div>
                    </div>

                    {/* Dominant Constraint */}
                    <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                        <div className="text-xs font-bold text-gray-600 mb-1">⚠️ DOMINANT CONSTRAINT</div>
                        <div className="text-sm font-semibold text-gray-800">
                            {currentRegime.dominantConstraint}
                        </div>
                    </div>

                    {/* Allocation Bands */}
                    {currentRegime.allocationBands && (
                        <div className="bg-white rounded-lg p-4 border-2 border-indigo-200">
                            <div className="text-xs font-bold text-indigo-700 mb-3">📊 ALLOCATION BANDS</div>
                            <div className="space-y-2">
                                {Object.entries(currentRegime.allocationBands).map(([assetClass, band]) => {
                                    const assetName =
                                        assetClass === 'EQUITY' ? 'Pure Equities' :
                                            assetClass === 'HYBRID' ? 'Hybrid Funds' :
                                                assetClass === 'DEBT_MEDIUM' ? 'Medium/Dynamic Debt' :
                                                    assetClass === 'DEBT_SHORT' ? 'Short Duration/Cash' :
                                                        'Gold';

                                    return (
                                        <div key={assetClass} className="flex items-center justify-between text-sm">
                                            <span className="font-medium text-gray-700">{assetName}:</span>
                                            <span className="font-bold text-gray-900">
                                                {(band.min * 100).toFixed(0)}–{(band.max * 100).toFixed(0)}%
                                                <span className="text-xs text-gray-500 ml-1">
                                                    (Target: {(band.target * 100).toFixed(1)}%)
                                                </span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Behavior Notes */}
                    {currentRegime.behavior && currentRegime.behavior.length > 0 && (
                        <div className="bg-amber-50 rounded-lg p-4 border-2 border-amber-200">
                            <div className="text-xs font-bold text-amber-700 mb-2">📝 REGIME BEHAVIOR</div>
                            <ul className="space-y-1">
                                {currentRegime.behavior.map((note, idx) => (
                                    <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                                        <span className="text-amber-600 mt-0.5">•</span>
                                        <span>{note}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Scoring Components */}
                    {currentRegime.scoringComponents && (
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border-2 border-indigo-200">
                            <div className="text-xs font-bold text-indigo-700 mb-3">🎯 SCORING METHODOLOGY</div>

                            {/* High When */}
                            <div className="mb-3">
                                <div className="text-[10px] font-bold text-indigo-600 mb-1">Score is HIGH when:</div>
                                <ul className="space-y-0.5">
                                    {currentRegime.scoringComponents.highWhen.map((indicator, idx) => (
                                        <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                                            <span className="text-green-600 font-bold">✓</span>
                                            <span>{indicator}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Score Components */}
                            <div className="mb-3">
                                <div className="text-[10px] font-bold text-indigo-600 mb-1">Key Indicators:</div>
                                <div className="flex flex-wrap gap-1">
                                    {currentRegime.scoringComponents.scoreComponents.map((component, idx) => (
                                        <span key={idx} className="text-[10px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold">
                                            {component}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Implication */}
                            <div className="bg-white bg-opacity-60 rounded p-2 border border-indigo-200">
                                <div className="text-[10px] font-bold text-purple-600 mb-1">💡 Implication:</div>
                                <div className="text-xs text-gray-800 italic font-medium">
                                    {currentRegime.scoringComponents.implication}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
