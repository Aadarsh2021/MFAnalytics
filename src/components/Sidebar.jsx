import { CheckCircle, Circle, Clock } from 'lucide-react'

const steps = [
    { num: 1, title: 'Search Funds', desc: 'Find mutual funds', icon: '🔍' },
    { num: 2, title: 'Fetch Data', desc: 'Get NAV history', icon: '📊' },
    { num: 3, title: 'MVP Analysis', desc: '3 optimization methods', icon: '⚖️' },
    { num: 4, title: 'Set Views', desc: 'Market expectations', icon: '💭' },
    { num: 5, title: 'Black-Litterman', desc: 'Advanced optimization', icon: '🎯' },
    { num: 6, title: 'Final Report', desc: 'Download results', icon: '📄' }
]

export default function Sidebar({ currentStep, goToStep }) {
    const getStepStatus = (stepNum) => {
        if (stepNum < currentStep) return 'completed'
        if (stepNum === currentStep) return 'active'
        return 'pending'
    }

    const getStepIcon = (stepNum) => {
        const status = getStepStatus(stepNum)
        if (status === 'completed') return <CheckCircle className="text-green-600" size={20} />
        if (status === 'active') return <Clock className="text-blue-600 animate-pulse" size={20} />
        return <Circle className="text-gray-400" size={20} />
    }

    const getStepClass = (stepNum) => {
        const status = getStepStatus(stepNum)
        if (status === 'active') return 'bg-blue-50 border-blue-500 border-l-4'
        if (status === 'completed') return 'bg-green-50 border-green-500 border-l-4 hover:bg-green-100'
        return 'bg-white border-gray-200 border-l-4 hover:bg-gray-50'
    }

    return (
        <div className="bg-white rounded-xl shadow-2xl p-6 sticky top-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Workflow Steps</h2>

            <div className="space-y-3">
                {steps.map((step) => {
                    const status = getStepStatus(step.num)

                    return (
                        <div
                            key={step.num}
                            onClick={() => goToStep(step.num)}
                            className={`${getStepClass(step.num)} p-4 rounded-lg cursor-pointer transition-all duration-200`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className="mt-1">
                                    {getStepIcon(step.num)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-2xl">{step.icon}</span>
                                        <span className={`font-semibold ${status === 'active' ? 'text-blue-900' :
                                                status === 'completed' ? 'text-green-900' :
                                                    'text-gray-600'
                                            }`}>
                                            {step.num}. {step.title}
                                        </span>
                                    </div>
                                    <p className={`text-sm ${status === 'active' ? 'text-blue-700' :
                                            status === 'completed' ? 'text-green-700' :
                                                'text-gray-500'
                                        }`}>
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Progress Indicator */}
            <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Overall Progress</span>
                    <span className="text-sm font-bold text-blue-600">
                        {Math.round((currentStep / steps.length) * 100)}%
                    </span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(currentStep / steps.length) * 100}%` }}
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                    Step {currentStep} of {steps.length}
                </p>
            </div>
        </div>
    )
}
