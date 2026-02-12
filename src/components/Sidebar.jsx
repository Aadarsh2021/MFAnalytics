import { CheckCircle, Circle, Clock, LayoutDashboard, ChevronLeft, ChevronRight, History } from 'lucide-react'
import HistorySidebar from './HistorySidebar'

export default function Sidebar({ currentStep, goToStep, onLoadHistory, isOpen, toggleSidebar, optimizationPath, onOpenHistory, history, historyLoading }) {
    const steps = [
        { num: 1, title: 'Funds Selection', desc: 'Find mutual funds', icon: '🔍' },
        { num: 2, title: 'Data Fetching', desc: 'Get NAV history', icon: '📊' },
        { num: 3, title: 'MVP Analysis', desc: 'Baseline optimization', icon: '⚖️' },
        { num: 4, title: 'Optimization Choice', desc: 'Regime or Black-Litterman', icon: '💭' },
        {
            num: 5,
            title: optimizationPath === 'regime' ? 'Regime Optimization' : (optimizationPath === 'bl' ? 'BL Optimization' : 'Portfolio Optimization'),
            desc: optimizationPath === 'regime' ? 'Macro-aware allocation' : (optimizationPath === 'bl' ? 'Market-implied returns' : 'Advanced modeling'),
            icon: '🎯'
        },
        { num: 6, title: 'Monte Carlo', desc: 'Risk simulation', icon: '🎲' },
        { num: 7, title: 'Final Results', desc: 'Summaries & Reports', icon: '📄' }
    ]

    const getStepStatus = (stepNum) => {
        const currentNum = parseInt(currentStep)
        if (currentNum > stepNum) return 'completed'
        if (currentNum === stepNum) return 'active'
        return 'pending'
    }

    const getStepIcon = (stepNum) => {
        const status = getStepStatus(stepNum)
        if (status === 'completed') return <CheckCircle className="text-green-600" size={20} />
        if (status === 'active') return <Clock className="text-indigo-600 animate-pulse" size={20} />
        return <Circle className="text-slate-300" size={20} />
    }

    const getStepClass = (stepNum) => {
        const status = getStepStatus(stepNum)
        if (status === 'active') return 'bg-indigo-50 border-indigo-500 border-l-4'
        if (status === 'completed') return 'bg-emerald-50 border-emerald-500 border-l-4 hover:bg-emerald-100'
        return 'bg-white border-slate-100 border-l-4 hover:bg-slate-50'
    }

    return (
        <div className="sticky top-6 transition-all duration-300">
            <div className={`bg-white rounded-[2rem] shadow-2xl border border-white relative transition-all duration-300 ${isOpen ? 'p-8' : 'p-4'}`}>

                <div className={`flex items-center gap-3 mb-8 ${!isOpen && 'justify-center flex-col gap-4'}`}>
                    <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600 shrink-0">
                        <LayoutDashboard size={20} />
                    </div>

                    {isOpen ? (
                        <div className="flex items-center justify-between flex-1 min-w-0 animate-fade-in">
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Workflow</h2>
                            <button
                                onClick={toggleSidebar}
                                className="bg-slate-50 text-slate-400 border border-slate-200 rounded-full p-1.5 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={toggleSidebar}
                            className="bg-slate-50 text-slate-400 border border-slate-200 rounded-full p-1.5 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    )}
                </div>

                <div className="space-y-3">
                    {steps.map((step) => {
                        const status = getStepStatus(step.num)

                        return (
                            <div
                                key={step.num}
                                onClick={() => goToStep(step.num)}
                                className={`${getStepClass(step.num)} rounded-2xl cursor-pointer transition-all duration-300 group ${isOpen ? 'p-5' : 'p-3 flex justify-center'}`}
                                title={!isOpen ? step.title : ''}
                            >
                                <div className={`flex items-start ${isOpen ? 'gap-4' : 'justify-center'}`}>
                                    <div className="mt-1 transition-transform group-hover:scale-110 shrink-0">
                                        {getStepIcon(step.num)}
                                    </div>

                                    {isOpen && (
                                        <div className="flex-1 min-w-0 animate-fade-in">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xl">{step.icon}</span>
                                                <span className={`font-black tracking-tight text-sm ${status === 'active' ? 'text-indigo-900' :
                                                    status === 'completed' ? 'text-emerald-900' :
                                                        'text-slate-500'
                                                    }`}>
                                                    {step.title}
                                                </span>
                                            </div>
                                            <p className={`text-[10px] font-bold uppercase tracking-wider ${status === 'active' ? 'text-indigo-600/60' :
                                                status === 'completed' ? 'text-emerald-600/60' :
                                                    'text-slate-400'
                                                }`}>
                                                {step.desc}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Progress Indicator */}
                {isOpen && (
                    <div className="mt-8 pt-6 border-t border-slate-100 animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                            <span className="text-[10px] font-black text-indigo-600">
                                {Math.round((parseInt(currentStep) / steps.length) * 100)}%
                            </span>
                        </div>
                        <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-indigo-600 h-full transition-all duration-500 rounded-full"
                                style={{ width: `${(parseInt(currentStep) / steps.length) * 100}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {isOpen && (
                <HistorySidebar
                    onLoadHistory={onLoadHistory}
                    onOpenHistory={onOpenHistory}
                    history={history}
                    loading={historyLoading}
                />
            )}
        </div>
    )
}
