import { BarChart3, AlertCircle, CheckCircle, Calendar } from 'lucide-react'

export default function DataQualityPanel({ dataQuality }) {
    if (!dataQuality) return null

    const getScoreColor = (score) => {
        if (score >= 90) return 'text-green-600'
        if (score >= 70) return 'text-yellow-600'
        return 'text-red-600'
    }

    const getScoreBg = (score) => {
        if (score >= 90) return 'bg-green-50 border-green-300'
        if (score >= 70) return 'bg-yellow-50 border-yellow-300'
        return 'bg-red-50 border-red-300'
    }

    return (
        <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="text-purple-600" size={20} />
                <h3 className="text-lg font-black text-gray-800 tracking-tight uppercase">Data Quality Analysis</h3>
            </div>

            {/* Overall Score */}
            <div className={`${getScoreBg(dataQuality.score)} border-2 rounded-xl p-3 mb-4`}>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-[10px] text-gray-600 uppercase font-bold">Quality Score</div>
                        <div className={`text-3xl font-black ${getScoreColor(dataQuality.score)}`}>
                            {dataQuality.score}<span className="text-sm opacity-50">/100</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-gray-600 uppercase font-bold">Status</div>
                        <div className="flex items-center gap-2 mt-1">
                            {dataQuality.score >= 90 ? (
                                <>
                                    <CheckCircle className="text-green-600" size={18} />
                                    <span className="font-bold text-green-600 text-sm">Excellent</span>
                                </>
                            ) : dataQuality.score >= 70 ? (
                                <>
                                    <AlertCircle className="text-yellow-600" size={18} />
                                    <span className="font-bold text-yellow-600 text-sm">Good</span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="text-red-600" size={18} />
                                    <span className="font-bold text-red-600 text-sm">Poor</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                    <div className="text-[9px] text-slate-500 font-black uppercase mb-0.5">Completeness</div>
                    <div className="text-base font-black text-slate-900">
                        {Math.round((dataQuality.completeDates / dataQuality.totalDates) * 100)}%
                    </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                    <div className="text-[9px] text-slate-500 font-black uppercase mb-0.5">NAV Records</div>
                    <div className="text-base font-black text-slate-900">
                        {dataQuality.completeDates}
                    </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                    <div className="text-[9px] text-slate-500 font-black uppercase mb-0.5">Total Days</div>
                    <div className="text-base font-black text-slate-900">
                        {dataQuality.dateRange.days}
                    </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                    <div className="text-[9px] text-slate-500 font-black uppercase mb-0.5">Latest Date</div>
                    <div className="text-xs font-black text-slate-900 truncate">
                        {dataQuality.dateRange.end}
                    </div>
                </div>
            </div>

            {/* Missing Data Warnings */}
            {dataQuality.missingData && dataQuality.missingData.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                        <AlertCircle className="text-amber-600" size={16} />
                        <span className="text-[11px] font-black text-amber-900 uppercase">Gaps Detected</span>
                    </div>
                    <div className="space-y-1">
                        {dataQuality.missingData.map((item, idx) => (
                            <div key={idx} className="text-[10px] text-amber-800 font-medium">
                                • {item.fund}: {item.gaps} missing records
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
