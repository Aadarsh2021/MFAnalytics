import { CheckCircle, Clock, AlertTriangle, Circle } from 'lucide-react'

const steps = [
    { num: 1, title: 'Search Funds', key: 'search' },
    { num: 2, title: 'Fetch Data', key: 'fetch' },
    { num: 3, title: 'MVP Analysis', key: 'mvp' },
    { num: 4, title: 'Set Views', key: 'views' },
    { num: 5, title: 'Black-Litterman', key: 'bl' },
    { num: 6, title: 'Final Report', key: 'report' }
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
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Progress Timeline</h3>

            <div className="space-y-4">
                {steps.map((step, idx) => {
                    const status = getStepStatus(step.num)
                    const timing = stepTimings[step.num]
                    const isLast = idx === steps.length - 1

                    return (
                        <div key={step.num} className="relative">
                            {/* Connector Line */}
                            {!isLast && (
                                <div
                                    className={`absolute left-[10px] top-[30px] w-0.5 h-full ${status === 'completed' ? 'bg-green-600' : 'bg-gray-300'
                                        }`}
                                ></div>
                            )}

                            {/* Step Content */}
                            <div className={`flex items-start gap-4 p-4 rounded-lg transition-all ${status === 'active' ? 'bg-blue-50 border-2 border-blue-300' :
                                    status === 'completed' ? 'bg-gray-50' : 'bg-white'
                                }`}>
                                {/* Icon */}
                                <div className="relative z-10 bg-white rounded-full p-1">
                                    {getStepIcon(step.num)}
                                </div>

                                {/* Details */}
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className={`font-semibold ${status === 'active' ? 'text-blue-900' : 'text-gray-900'
                                                }`}>
                                                Step {step.num}: {step.title}
                                            </span>
                                            {status === 'active' && (
                                                <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                                                    In Progress
                                                </span>
                                            )}
                                        </div>
                                        {timing && (
                                            <span className="text-sm text-gray-600">
                                                {formatDuration(timing.duration)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Step Details */}
                                    {timing && timing.details && (
                                        <div className="mt-2 space-y-1">
                                            {timing.details.map((detail, i) => (
                                                <div key={i} className="text-sm text-gray-600">
                                                    → {detail}
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

            {/* Total Time */}
            {Object.keys(stepTimings).length > 0 && (
                <div className="mt-6 pt-4 border-t text-center">
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
