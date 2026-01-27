import { Clock, Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export default function StatusTracker({ activityLog, currentOperation }) {
    const getStatusIcon = (status) => {
        switch (status) {
            case 'success': return <CheckCircle className="text-green-600" size={16} />
            case 'error': return <XCircle className="text-red-600" size={16} />
            case 'warning': return <AlertTriangle className="text-yellow-600" size={16} />
            default: return <Activity className="text-blue-600" size={16} />
        }
    }

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }

    const formatDuration = (seconds) => {
        if (seconds < 60) return `${seconds.toFixed(1)}s`
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}m ${secs}s`
    }

    const latestActivities = [...activityLog].reverse()

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="text-blue-600" size={24} />
                <h3 className="text-xl font-bold text-gray-800">Real-Time Status</h3>
            </div>

            {/* Current Operation */}
            {currentOperation && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                        <span className="font-semibold text-blue-900">{currentOperation.title}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600">Started:</span>
                            <span className="ml-2 font-medium">{formatTime(currentOperation.startTime)}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Elapsed:</span>
                            <span className="ml-2 font-medium">
                                {formatDuration((Date.now() - currentOperation.startTime) / 1000)}
                            </span>
                        </div>
                        {currentOperation.progress !== undefined && (
                            <div>
                                <span className="text-gray-600">Progress:</span>
                                <span className="ml-2 font-medium">{currentOperation.progress}%</span>
                            </div>
                        )}
                    </div>
                    {currentOperation.progress !== undefined && (
                        <div className="mt-3">
                            <div className="bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${currentOperation.progress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Activity Log */}
            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Activity</h4>
                <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                    {latestActivities.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No activity yet</p>
                    ) : (
                        latestActivities.map((activity, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="mt-0.5">{getStatusIcon(activity.status)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium text-gray-900 truncate">
                                            {activity.action}
                                        </span>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                            {formatTime(activity.timestamp)}
                                        </span>
                                    </div>
                                    {activity.details && (
                                        <p className="text-xs text-gray-600 mt-1">{activity.details}</p>
                                    )}
                                    {activity.duration && (
                                        <span className="text-xs text-gray-500">
                                            Duration: {formatDuration(activity.duration)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                        {activityLog.filter(a => a.status === 'success').length}
                    </div>
                    <div className="text-xs text-gray-600">Success</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                        {activityLog.filter(a => a.status === 'warning').length}
                    </div>
                    <div className="text-xs text-gray-600">Warnings</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                        {activityLog.filter(a => a.status === 'error').length}
                    </div>
                    <div className="text-xs text-gray-600">Errors</div>
                </div>
            </div>
        </div>
    )
}
