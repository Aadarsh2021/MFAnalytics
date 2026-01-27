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
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="text-purple-600" size={24} />
                <h3 className="text-xl font-bold text-gray-800">Data Quality Analysis</h3>
            </div>

            {/* Overall Score */}
            <div className={`${getScoreBg(dataQuality.score)} border-2 rounded-lg p-4 mb-4`}>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-gray-600 mb-1">Overall Quality Score</div>
                        <div className={`text-4xl font-bold ${getScoreColor(dataQuality.score)}`}>
                            {dataQuality.score}/100
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-600">Status</div>
                        <div className="flex items-center gap-2 mt-1">
                            {dataQuality.score >= 90 ? (
                                <>
                                    <CheckCircle className="text-green-600" size={20} />
                                    <span className="font-semibold text-green-600">Excellent</span>
                                </>
                            ) : dataQuality.score >= 70 ? (
                                <>
                                    <AlertCircle className="text-yellow-600" size={20} />
                                    <span className="font-semibold text-yellow-600">Good</span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="text-red-600" size={20} />
                                    <span className="font-semibold text-red-600">Poor</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Data Completeness</div>
                    <div className="text-2xl font-bold text-gray-900">
                        {dataQuality.completeDates}/{dataQuality.totalDates}
                    </div>
                    <div className="text-xs text-gray-500">
                        {((dataQuality.completeDates / dataQuality.totalDates) * 100).toFixed(1)}% complete
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(dataQuality.completeDates / dataQuality.totalDates) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Date Range</div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <Calendar size={16} />
                        {dataQuality.dateRange.days} days
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {dataQuality.dateRange.start} to {dataQuality.dateRange.end}
                    </div>
                </div>
            </div>

            {/* Missing Data Warnings */}
            {dataQuality.missingData && dataQuality.missingData.length > 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="text-yellow-600" size={18} />
                        <span className="font-semibold text-yellow-900">Missing Data Detected</span>
                    </div>
                    <div className="space-y-1">
                        {dataQuality.missingData && dataQuality.missingData.map((item, idx) => (
                            <div key={idx} className="text-sm text-yellow-800">
                                • {item.fund}: {item.gaps} missing date{item.gaps > 1 ? 's' : ''}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Data Freshness */}
            {dataQuality.lastUpdate && !isNaN(new Date(dataQuality.lastUpdate).getTime()) && (
                <div className="mt-4 text-sm text-gray-600 text-center">
                    Last updated: {new Date(dataQuality.lastUpdate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
            )}
        </div>
    )
}
