const steps = [
    { num: 1, title: 'Search Funds', desc: 'Find mutual funds' },
    { num: 2, title: 'Fetch Data', desc: 'Get NAV history' },
    { num: 3, title: 'MVP Analysis', desc: '3 optimization methods' },
    { num: 4, title: 'Set Views', desc: 'Market expectations' },
    { num: 5, title: 'Black-Litterman', desc: 'Advanced optimization' },
    { num: 6, title: 'Final Report', desc: 'Download results' }
]

export default function ProgressSteps({ currentStep, goToStep }) {
    const getStepClass = (stepNum) => {
        if (stepNum === currentStep) return 'step-active'
        if (stepNum < currentStep) return 'step-completed'
        return 'step-pending'
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center">
                {steps.map((step) => (
                    <div
                        key={step.num}
                        onClick={() => goToStep(step.num)}
                        className={`${getStepClass(step.num)} flex-1 text-center py-3 rounded-lg mx-1 cursor-pointer transition-all duration-300`}
                    >
                        <div className="font-bold">{step.num}. {step.title}</div>
                        <div className="text-xs mt-1">{step.desc}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}
