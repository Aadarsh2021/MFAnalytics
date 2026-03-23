/**
 * Regime Transition Status Indicator Component
 * Shows when a regime transition is in progress
 */

import { TrendingUp, Clock, Info } from 'lucide-react';

export default function RegimeTransitionIndicator({ regimeContext }) {
    if (!regimeContext?.isTransitioning) return null;

    const {
        previousRegime,
        currentRegime,
        transitionProgress,
        monthsSinceLastChange,
        blockReason
    } = regimeContext;

    const progressPercent = Math.round(transitionProgress * 100);
    const estimatedMonthsRemaining = Math.max(0, 12 - (transitionProgress * 12));

    return (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 mb-6 shadow-md">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="text-amber-600" size={24} />
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-black text-amber-900">
                            Regime Transition in Progress
                        </h4>
                        <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-bold">
                            {progressPercent}% Complete
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-amber-700 mb-4">
                        <span className="font-bold">{previousRegime}</span>
                        <span>→</span>
                        <span className="font-bold">{currentRegime}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative w-full h-3 bg-amber-100 rounded-full overflow-hidden mb-3">
                        <div
                            className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    <div className="flex items-center gap-4 text-xs text-amber-600">
                        <div className="flex items-center gap-1.5">
                            <Clock size={14} />
                            <span>
                                {monthsSinceLastChange} months in transition
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Info size={14} />
                            <span>
                                Est. {Math.ceil(estimatedMonthsRemaining)} months remaining
                            </span>
                        </div>
                    </div>

                    {/* Info about gradual allocation changes */}
                    <div className="mt-3 p-3 bg-white/60 rounded-lg border border-amber-200">
                        <p className="text-xs text-amber-800 leading-relaxed">
                            <strong>Gradual Transition:</strong> Allocation bands are smoothly interpolating between regimes.
                            {previousRegime === 'REGIME_C' && currentRegime === 'REGIME_B' && (
                                <span> Gold is reducing slowly, bonds waiting for correlation to improve, equities increasing last.</span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {blockReason && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">
                        <strong>Note:</strong> {blockReason}
                    </p>
                </div>
            )}
        </div>
    );
}
