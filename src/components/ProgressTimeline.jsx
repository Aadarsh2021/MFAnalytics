import { CheckCircle, Clock, AlertTriangle, Circle, TrendingUp } from 'lucide-react'

export default function ProgressTimeline({ stepTimings, currentStep, optimizationPath }) {
    const steps = [
        { num: 1, title: 'Funds Selection', key: 'search', icon: '🔍' },
        { num: 2, title: 'Data Fetching', key: 'fetch', icon: '📊' },
        { num: 3, title: 'MVP Analysis', key: 'mvp', icon: '⚖️' },
        { num: 4, title: 'Optimization Choice', key: 'choice', icon: '💭' },
        {
            num: 5,
            title: optimizationPath === 'regime' ? 'Regime Optimization' : (optimizationPath === 'bl' ? 'BL Optimization' : 'Portfolio Optimization'),
            key: 'opt',
            icon: '🎯'
        },
        { num: 6, title: 'Monte Carlo', key: 'mc', icon: '🎲' },
        { num: 7, title: 'Final Results', key: 'report', icon: '📄' }
    ]

    const getStepStatus = (stepNum) => {
        const currentNum = parseInt(currentStep)
        if (currentNum > stepNum) return 'completed'
        if (currentNum === stepNum) return 'active'
        return 'pending'
    }

    const getStepIcon = (stepNum) => {
        const status = getStepStatus(stepNum)
        const timing = stepTimings[stepNum]

        if (status === 'completed') {
            if (timing?.warnings > 0) {
                return <AlertTriangle className="text-yellow-600" size={16} />
            }
            return <CheckCircle className="text-green-600" size={16} />
        }
        if (status === 'active') {
            return <Clock className="text-blue-600 animate-pulse" size={16} />
        }
        return <Circle className="text-gray-300" size={16} />
    }

    const formatDuration = (seconds) => {
        if (!seconds) return '-'
        if (seconds < 60) return `${seconds.toFixed(0)}s`
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}m ${secs}s`
    }

    return (
        <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="text-purple-600" size={20} />
                    <h3 className="text-lg font-black text-gray-800 tracking-tight uppercase">Progress Timeline</h3>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Total Progress</div>
                    <div className="text-lg font-black text-blue-600 leading-none">
                        {Math.round((parseInt(currentStep) / steps.length) * 100)}%
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5 auto-rows-max">
                {steps.map((step, idx) => {
                    const status = getStepStatus(step.num)
                    const timing = stepTimings[step.num]

                    return (
                        <div key={step.num} className="flex-1 min-w-0">
                            <div className={`flex items-center gap-3 p-1.5 px-2.5 rounded-lg border-l-4 transition-all ${status === 'active' ? 'bg-blue-50 border-blue-500 shadow-sm' :
                                status === 'completed' ? 'bg-green-50/50 border-green-500' :
                                    'bg-slate-50/50 border-slate-200'
                                }`}>
                                <div className="flex-shrink-0">
                                    {getStepIcon(step.num)}
                                </div>

                                <div className="flex-1 min-w-0 flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-sm grayscale-[0.5]">{step.icon}</span>
                                        <span className={`font-black truncate ${status === 'active' ? 'text-blue-900' :
                                            status === 'completed' ? 'text-green-900 opacity-70' :
                                                'text-slate-500'
                                            }`}>
                                            {step.title}
                                        </span>
                                    </div>
                                    {timing && (
                                        <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                                            {formatDuration(timing.duration)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Elapsed Time</div>
                <div className="text-xs font-black text-slate-700">
                    {formatDuration(Object.values(stepTimings).reduce((sum, t) => sum + (t.duration || 0), 0))}
                </div>
            </div>
        </div>
    )
}
