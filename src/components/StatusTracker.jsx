import { Clock, Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export default function StatusTracker({ activityLog, currentOperation }) {
    const getStatusIcon = (status) => {
        switch (status) {
            case 'success': return <CheckCircle className="text-green-600" size={14} />
            case 'error': return <XCircle className="text-red-600" size={14} />
            case 'warning': return <AlertTriangle className="text-yellow-600" size={14} />
            default: return <Activity className="text-blue-600" size={14} />
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
        <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="text-blue-600" size={20} />
                <h3 className="text-lg font-black text-gray-800 tracking-tight uppercase">Real-Time Status</h3>
            </div>

            {/* Current Operation */}
            {currentOperation && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse"></div>
                        <span className="font-bold text-blue-900 text-sm">{currentOperation.title}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <div className="text-[11px] text-blue-800/70 py-1 px-2 bg-blue-100/50 rounded-lg">
                            <span className="font-semibold">ELAPSED:</span> {formatDuration((Date.now() - currentOperation.startTime) / 1000)}
                        </div>
                        {currentOperation.progress !== undefined && (
                            <div className="text-[11px] text-blue-800/70 py-1 px-2 bg-blue-100/50 rounded-lg">
                                <span className="font-semibold">PROGRESS:</span> {currentOperation.progress}%
                            </div>
                        )}
                    </div>
                    {currentOperation.progress !== undefined && (
                        <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-blue-600 h-full transition-all duration-300"
                                style={{ width: `${currentOperation.progress}%` }}
                            ></div>
                        </div>
                    )}
                </div>
            )}

            {/* Activity Log */}
            <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Recent Activity</h4>
                <div className="max-h-[180px] overflow-y-auto pr-2 custom-scrollbar space-y-1.5">
                    {latestActivities.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6 italic font-medium">No activity yet</p>
                    ) : (
                        latestActivities.map((activity, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all"
                            >
                                <div className="mt-0.5">{getStatusIcon(activity.status)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-[11px] font-black text-slate-800 truncate leading-tight">
                                            {activity.action}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 tabular-nums">
                                            {formatTime(activity.timestamp)}
                                        </span>
                                    </div>
                                    {activity.details && (
                                        <p className="text-[10px] font-medium text-slate-500 line-clamp-2 leading-tight">
                                            {activity.details}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                <div className="bg-green-50 rounded-xl p-2 text-center border border-green-100">
                    <div className="text-base font-black text-green-700 leading-none mb-1">
                        {activityLog.filter(a => a.status === 'success').length}
                    </div>
                    <div className="text-[9px] font-black text-green-600 uppercase tracking-tighter">Success</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-2 text-center border border-amber-100">
                    <div className="text-base font-black text-amber-700 leading-none mb-1">
                        {activityLog.filter(a => a.status === 'warning').length}
                    </div>
                    <div className="text-[9px] font-black text-amber-600 uppercase tracking-tighter">Warning</div>
                </div>
                <div className="bg-red-50 rounded-xl p-2 text-center border border-red-100">
                    <div className="text-base font-black text-red-700 leading-none mb-1">
                        {activityLog.filter(a => a.status === 'error').length}
                    </div>
                    <div className="text-[9px] font-black text-red-600 uppercase tracking-tighter">Errors</div>
                </div>
            </div>
        </div>
    )
}
