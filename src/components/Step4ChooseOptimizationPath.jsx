import { useState } from 'react'
import { TrendingUp, Target, Zap, Shield, BarChart3, AlertTriangle } from 'lucide-react'

export default function Step4ChooseOptimizationPath({ goToStep, setOptimizationPath }) {
    const [selectedPath, setSelectedPath] = useState(null)

    const handleSelectPath = (path) => {
        setSelectedPath(path)
        setOptimizationPath(path)

        // Navigate to appropriate step
        if (path === 'regime') {
            goToStep('4A') // Regime + Views
        } else {
            goToStep('4B') // Black-Litterman + Views
        }
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-gray-800 mb-2">
                        Choose Your Optimization Approach
                    </h2>
                    <p className="text-gray-500 max-w-2xl mx-auto">
                        Select how you want to optimize your portfolio. Each approach has different strengths and constraints.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Regime + Views Path */}
                    <PathCard
                        title="Regime + Views"
                        subtitle="Macro-Driven Allocation"
                        icon={<TrendingUp size={32} />}
                        color="indigo"
                        selected={selectedPath === 'regime'}
                        onSelect={() => handleSelectPath('regime')}
                        features={[
                            { icon: <Shield />, text: 'Strict allocation constraints based on market regime' },
                            { icon: <BarChart3 />, text: 'Historical backtesting through 2002-2025' },
                            { icon: <Target />, text: '4 defined regimes with proven bands' },
                            { icon: <AlertTriangle />, text: 'Asset class validation & alerts' }
                        ]}
                        description="Best for: Macro-aware investors who want regime-based risk management"
                    />

                    {/* Black-Litterman + Views Path */}
                    <PathCard
                        title="Black-Litterman + Views"
                        subtitle="Flexible Optimization"
                        icon={<Zap size={32} />}
                        color="emerald"
                        selected={selectedPath === 'bl'}
                        onSelect={() => handleSelectPath('bl')}
                        features={[
                            { icon: <Target />, text: 'Flexible weights: Market Cap, Equal, or Custom' },
                            { icon: <TrendingUp />, text: 'Express unlimited views without constraints' },
                            { icon: <AlertTriangle />, text: 'Regime mismatch alerts in final report' },
                            { icon: <Shield />, text: 'Traditional mean-variance optimization' }
                        ]}
                        description="Best for: Investors who want maximum flexibility and custom views"
                    />
                </div>

                <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <AlertTriangle className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-blue-900 mb-1">Not sure which to choose?</h4>
                            <p className="text-sm text-blue-700">
                                <strong>Regime + Views</strong> is recommended if you believe macro conditions drive returns and want strict risk controls.
                                <strong> Black-Litterman + Views</strong> is better if you have strong fund-specific views and want flexibility.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function PathCard({ title, subtitle, icon, color, selected, onSelect, features, description }) {
    const colors = {
        indigo: {
            bg: 'bg-indigo-50',
            border: 'border-indigo-200',
            selectedBorder: 'border-indigo-500',
            iconBg: 'bg-indigo-100',
            iconText: 'text-indigo-600',
            button: 'bg-indigo-600 hover:bg-indigo-700',
            selectedButton: 'bg-indigo-700'
        },
        emerald: {
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            selectedBorder: 'border-emerald-500',
            iconBg: 'bg-emerald-100',
            iconText: 'text-emerald-600',
            button: 'bg-emerald-600 hover:bg-emerald-700',
            selectedButton: 'bg-emerald-700'
        }
    }

    const theme = colors[color]

    return (
        <div
            className={`relative border-2 rounded-2xl p-6 transition-all duration-300 cursor-pointer hover:shadow-xl ${selected
                    ? `${theme.selectedBorder} shadow-lg`
                    : `${theme.border} hover:${theme.selectedBorder}`
                }`}
            onClick={onSelect}
        >
            {selected && (
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}

            <div className={`w-16 h-16 ${theme.iconBg} rounded-2xl flex items-center justify-center mb-4`}>
                <div className={theme.iconText}>
                    {icon}
                </div>
            </div>

            <h3 className="text-2xl font-black text-gray-800 mb-1">{title}</h3>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">{subtitle}</p>

            <ul className="space-y-3 mb-6">
                {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                        <div className="mt-0.5 text-gray-400">
                            {feature.icon}
                        </div>
                        <span className="text-sm text-gray-700 leading-tight">{feature.text}</span>
                    </li>
                ))}
            </ul>

            <p className="text-xs text-gray-500 italic mb-6 pb-6 border-b border-gray-100">
                {description}
            </p>

            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onSelect()
                }}
                className={`w-full py-3 rounded-xl font-bold text-white transition-all ${selected ? theme.selectedButton : theme.button
                    }`}
            >
                {selected ? 'Selected ✓' : 'Select This Path'}
            </button>
        </div>
    )
}
