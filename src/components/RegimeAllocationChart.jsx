import { getRegime } from '../config/regimeConfig';
import { getAssetClassName, getAssetClassColor } from '../utils/assetClassUtils';
import { PieChart, BarChart3, AlertTriangle } from 'lucide-react';

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
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl">
            <h4 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                <PieChart size={24} className="text-indigo-600" />
                Allocation vs Bands
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
                                    <span className={`text-sm font-bold ${isViolation ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {(currentWeight * 100).toFixed(1)}%
                                    </span>
                                    {isViolation && (
                                        <div className="flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                                            <AlertTriangle size={10} />
                                            Violation
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Visual Bar */}
                            <div className="relative h-10 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shadow-inner">
                                {/* Min-Max Band (Background) */}
                                <div
                                    className="absolute h-full opacity-10"
                                    style={{
                                        left: `${band.min * 100}%`,
                                        width: `${(band.max - band.min) * 100}%`,
                                        backgroundColor: color
                                    }}
                                />

                                {/* Target Line */}
                                <div
                                    className="absolute h-full w-0.5 bg-slate-900/10 z-10"
                                    style={{
                                        left: `${band.target * 100}%`
                                    }}
                                />

                                {/* Current Weight Bar */}
                                {currentWeight > 0 && (
                                    <div
                                        className={`absolute h-full flex items-center px-2 transition-all duration-700 ease-out ${isViolation ? 'bg-rose-500' : 'bg-indigo-600'}`}
                                        style={{
                                            width: `${currentWeight * 100}%`
                                        }}
                                    >
                                        <div className="h-0.5 bg-white/20 w-full rounded-full"></div>
                                    </div>
                                )}

                                {/* Labels */}
                                <div className="absolute inset-0 flex items-center justify-between px-3 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                    <span>{(band.min * 100).toFixed(0)}%</span>
                                    <span className="text-slate-900 bg-white/10 backdrop-blur-sm px-1.5 py-0.5 rounded border border-slate-900/5">
                                        Target: {(band.target * 100).toFixed(0)}%
                                    </span>
                                    <span>{(band.max * 100).toFixed(0)}%</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full opacity-20" style={{ backgroundColor: color }} />
                                    <span>Allowed Range</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-indigo-600" />
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
