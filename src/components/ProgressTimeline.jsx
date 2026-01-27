import { CheckCircle, Clock, AlertTriangle, Circle, TrendingUp } from 'lucide-react'

const steps = [
    { num: 1, title: 'Search Funds', key: 'search', icon: '🔍' },
    { num: 2, title: 'Fetch Data', key: 'fetch', icon: '📊' },
    { num: 3, title: 'MVP Analysis', key: 'mvp', icon: '⚖️' },
    { num: 4, title: 'Set Views', key: 'views', icon: '💭' },
    { num: 5, title: 'Black-Litterman', key: 'bl', icon: '🎯' },
    { num: 6, title: 'Monte Carlo', key: 'mc', icon: '🎲' },
    { num: 7, title: 'Final Report', key: 'report', icon: '📄' }
]

export default function ProgressTimeline({ stepTimings, currentStep }) {
    const getStepStatus = (stepNum) => {
        if (stepNum < currentStep) return 'completed'
        if (stepNum === currentStep) return 'active'
        return 'pending'
    }

    const getStepIcon = (stepNum) => {
        const status = getStepStatus(stepNum)
        const timing = stepTimings[stepNum]

        if (status === 'completed') {
            if (timing?.warnings > 0) {
                return <AlertTriangle className="text-yellow-600" size={20} />
            }
            return <CheckCircle className="text-green-600" size={20} />
        }
        if (status === 'active') {
            return <Clock className="text-blue-600 animate-pulse" size={20} />
        }
        return <Circle className="text-gray-400" size={20} />
    }

    const formatDuration = (seconds) => {
        if (!seconds) return '-'
        if (seconds < 60) return `${seconds.toFixed(0)}s`
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}m ${secs}s`
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
            <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="text-purple-600" size={24} />
                <h3 className="text-xl font-bold text-gray-800">Progress Timeline</h3>
            </div>

            <div className="space-y-2">
                {steps.map((step, idx) => {
                    const status = getStepStatus(step.num)
                    const timing = stepTimings[step.num]
                    const isLast = idx === steps.length - 1

                    return (
                        <div key={step.num} className="relative">
                            {/* Connector Line */}
                            {!isLast && (
                                <div
                                    className={`absolute left-[10px] top-[32px] w-0.5 h-[calc(100%-8px)] ${status === 'completed' ? 'bg-green-600' : 'bg-gray-300'
                                        }`}
                                ></div>
                            )}

                            {/* Step Content */}
                            <div className={`flex items-start gap-3 p-3 rounded-lg transition-all ${status === 'active' ? 'bg-blue-50 border-l-4 border-blue-500' :
                                status === 'completed' ? 'bg-green-50 border-l-4 border-green-500' :
                                    'bg-gray-50 border-l-4 border-gray-300'
                                }`}>
                                {/* Icon */}
                                <div className="relative z-10 bg-white rounded-full p-1 flex-shrink-0">
                                    {getStepIcon(step.num)}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-lg">{step.icon}</span>
                                        <span className={`font-semibold ${status === 'active' ? 'text-blue-900' :
                                            status === 'completed' ? 'text-green-900' :
                                                'text-gray-600'
                                            }`}>
                                            Step {step.num}: {step.title}
                                        </span>
                                        {status === 'active' && (
                                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full animate-pulse">
                                                In Progress
                                            </span>
                                        )}
                                        {timing && (
                                            <span className="ml-auto text-sm text-gray-600 font-medium">
                                                {formatDuration(timing.duration)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Step Details */}
                                    {timing && timing.details && timing.details.length > 0 && (
                                        <div className="mt-2 space-y-0.5 text-xs text-gray-600">
                                            {timing.details.map((detail, i) => (
                                                <div key={i} className="flex items-start gap-1">
                                                    <span className="text-green-600">✓</span>
                                                    <span>{detail}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Warnings */}
                                    {timing && timing.warnings > 0 && (
                                        <div className="mt-2 flex items-center gap-2 text-sm text-yellow-700">
                                            <AlertTriangle size={14} />
                                            {timing.warnings} warning{timing.warnings > 1 ? 's' : ''}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Overall Progress Bar */}
            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Overall Progress</span>
                    <span className="text-sm font-bold text-blue-600">
                        {Math.round((parseInt(currentStep) / steps.length) * 100)}%
                    </span>
                </div>
                <div className="bg-gray-200 rounded-full h-2.5">
                    <div
                        className="progress-bar h-2.5"
                        style={{ width: `${(parseInt(currentStep) / steps.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Total Time */}
            {Object.keys(stepTimings).length > 0 && (
                <div className="mt-4 text-center">
                    <div className="text-sm text-gray-600">Total Time Elapsed</div>
                    <div className="text-2xl font-bold text-gray-900">
                        {formatDuration(
                            Object.values(stepTimings).reduce((sum, t) => sum + (t.duration || 0), 0)
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
