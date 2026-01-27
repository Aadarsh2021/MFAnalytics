import { getRegime } from '../config/regimeConfig';
import { getAssetClassName, getAssetClassColor } from '../utils/assetClassUtils';

/**
 * Regime Allocation Chart Component
 * Visual representation of allocation bands and current portfolio allocation
 */
export default function RegimeAllocationChart({ regimeId, assetClassWeights }) {
    const regime = getRegime(regimeId);

    if (!regime.allocationBands) {
        return (
            <div className="bg-white rounded-lg p-6 border-2 border-gray-200">
                <div className="text-center text-gray-600">
                    <p className="font-semibold">No allocation bands for {regime.name}</p>
                    <p className="text-sm mt-1">This regime uses {regime.id === 'EQUAL_WEIGHT' ? 'equal weights' : 'market capitalization weights'}</p>
                </div>
            </div>
        );
    }

    const assetClasses = Object.keys(regime.allocationBands);

    return (
        <div className="bg-white rounded-lg p-6 border-2 border-indigo-200">
            <h4 className="text-lg font-bold text-gray-800 mb-4">
                📊 Allocation Bands vs Current Portfolio
            </h4>

            <div className="space-y-4">
                {assetClasses.map(assetClass => {
                    const band = regime.allocationBands[assetClass];
                    const currentWeight = assetClassWeights?.[assetClass] || 0;
                    const isViolation = currentWeight < band.min || currentWeight > band.max;
                    const assetName = getAssetClassName(assetClass);
                    const color = getAssetClassColor(assetClass);

                    return (
                        <div key={assetClass} className="space-y-2">
                            {/* Asset Class Name and Current Weight */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700">{assetName}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${isViolation ? 'text-red-600' : 'text-green-600'}`}>
                                        {(currentWeight * 100).toFixed(1)}%
                                    </span>
                                    {isViolation && (
                                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">
                                            ⚠️ Violation
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Visual Bar */}
                            <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                                {/* Min-Max Band (Background) */}
                                <div
                                    className="absolute h-full opacity-30"
                                    style={{
                                        left: `${band.min * 100}%`,
                                        width: `${(band.max - band.min) * 100}%`,
                                        backgroundColor: color
                                    }}
                                />

                                {/* Target Line */}
                                <div
                                    className="absolute h-full w-0.5 bg-gray-800 z-10"
                                    style={{
                                        left: `${band.target * 100}%`
                                    }}
                                />

                                {/* Current Weight Bar */}
                                {currentWeight > 0 && (
                                    <div
                                        className={`absolute h-full ${isViolation ? 'opacity-70' : 'opacity-90'}`}
                                        style={{
                                            width: `${currentWeight * 100}%`,
                                            backgroundColor: isViolation ? '#EF4444' : color
                                        }}
                                    />
                                )}

                                {/* Labels */}
                                <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-bold text-gray-700">
                                    <span>{(band.min * 100).toFixed(0)}%</span>
                                    <span className="bg-white bg-opacity-80 px-1 rounded">
                                        Target: {(band.target * 100).toFixed(1)}%
                                    </span>
                                    <span>{(band.max * 100).toFixed(0)}%</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded opacity-30" style={{ backgroundColor: color }} />
                                    <span>Allowed Band</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-0.5 h-3 bg-gray-800" />
                                    <span>Target</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded" style={{ backgroundColor: isViolation ? '#EF4444' : color }} />
                                    <span>Current</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="mt-6 pt-4 border-t-2 border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-600">Total Allocated:</span>
                        <span className="ml-2 font-bold text-gray-800">
                            {(Object.values(assetClassWeights || {}).reduce((a, b) => a + b, 0) * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-600">Violations:</span>
                        <span className="ml-2 font-bold text-red-600">
                            {assetClasses.filter(ac => {
                                const w = assetClassWeights?.[ac] || 0;
                                const b = regime.allocationBands[ac];
                                return w < b.min || w > b.max;
                            }).length}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
