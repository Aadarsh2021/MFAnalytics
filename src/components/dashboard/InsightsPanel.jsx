import { Lightbulb, AlertTriangle, CheckCircle, TrendingUp, Target } from 'lucide-react'

export default function InsightsPanel({ insights }) {
    if (!insights || insights.length === 0) return null

    const getInsightIcon = (type) => {
        switch (type) {
            case 'warning': return <AlertTriangle className="text-yellow-600" size={20} />
            case 'success': return <CheckCircle className="text-green-600" size={20} />
            case 'recommendation': return <Target className="text-blue-600" size={20} />
            case 'analysis': return <TrendingUp className="text-purple-600" size={20} />
            default: return <Lightbulb className="text-gray-600" size={20} />
        }
    }

    const getInsightBg = (type) => {
        switch (type) {
            case 'warning': return 'bg-yellow-50 border-yellow-300'
            case 'success': return 'bg-green-50 border-green-300'
            case 'recommendation': return 'bg-blue-50 border-blue-300'
            case 'analysis': return 'bg-purple-50 border-purple-300'
            default: return 'bg-gray-50 border-gray-300'
        }
    }

    const groupedInsights = insights.reduce((acc, insight) => {
        const category = insight.category || 'General'
        if (!acc[category]) acc[category] = []
        acc[category].push(insight)
        return acc
    }, {})

    return (
        <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="text-yellow-600" size={20} />
                <h3 className="text-lg font-black text-gray-800 tracking-tight">INSIGHTS & RECOMMENDATIONS</h3>
            </div>

            <div className="space-y-4">
                {Object.entries(groupedInsights).map(([category, categoryInsights]) => (
                    <div key={category}>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">{category}</h4>
                        <div className="space-y-2">
                            {categoryInsights.map((insight, idx) => (
                                <div
                                    key={idx}
                                    className={`${getInsightBg(insight.type)} border rounded-lg p-3`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 mb-1">
                                                {insight.title}
                                            </div>
                                            <div className="text-sm text-gray-700">
                                                {insight.message}
                                            </div>
                                            {insight.action && (
                                                <div className="mt-2 text-sm font-medium text-blue-700">
                                                    💡 Suggested: {insight.action}
                                                </div>
                                            )}
                                            {insight.metrics && (
                                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                                    {Object.entries(insight.metrics).map(([key, value]) => (
                                                        <div key={key} className="bg-white rounded px-2 py-1">
                                                            <span className="text-gray-600">{key}:</span>
                                                            <span className="ml-1 font-semibold">{value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary Stats */}
            <div className="mt-6 pt-4 border-t grid grid-cols-4 gap-4 text-center">
                <div>
                    <div className="text-2xl font-bold text-yellow-600">
                        {insights.filter(i => i.type === 'warning').length}
                    </div>
                    <div className="text-xs text-gray-600">Warnings</div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-green-600">
                        {insights.filter(i => i.type === 'success').length}
                    </div>
                    <div className="text-xs text-gray-600">Validated</div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-blue-600">
                        {insights.filter(i => i.type === 'recommendation').length}
                    </div>
                    <div className="text-xs text-gray-600">Suggestions</div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-purple-600">
                        {insights.filter(i => i.type === 'analysis').length}
                    </div>
                    <div className="text-xs text-gray-600">Analysis</div>
                </div>
            </div>
        </div>
    )
}
