import { useState } from 'react'
import { TrendingUp, CheckCircle } from 'lucide-react'
import { calculateAllMVP } from '../utils/optimization.js'

export default function Step3MVPAnalysis({
    returns,
    allData,
    setMvpResults,
    mvpResults,
    showMessage,
    goToStep,
    addActivity,
    addInsight,
    updateStepTiming,
    setCurrentOperation
}) {
    const [isCalculating, setIsCalculating] = useState(false)

    const handleCalculate = async () => {
        if (!returns) {
            showMessage('error', 'No returns data available')
            return
        }

        const startTime = Date.now()
        setIsCalculating(true)
        addActivity && addActivity('Started MVP optimization', 'info', 'Calculating 3 methods')

        try {
            const results = calculateAllMVP(returns)
            setMvpResults(results)

            const duration = (Date.now() - startTime) / 1000
            addActivity && addActivity('MVP complete', 'success', `Calculated in ${duration.toFixed(1)}s`, duration)
            updateStepTiming && updateStepTiming(3, duration, ['Calculated 3 MVP methods'], 0)

            showMessage('success', 'All 3 MVP methods calculated successfully!')
        } catch (e) {
            addActivity && addActivity('MVP failed', 'error', e.message)
            showMessage('error', 'Optimization failed: ' + e.message)
        } finally {
            setIsCalculating(false)
        }
    }

    const WeightCard = ({ weight, name, color }) => (
        <div className={`bg-white p-2 rounded-lg border-2 border-${color}-200`}>
            <p className="text-xs truncate">{name.substring(0, 25)}</p>
            <p className="text-lg font-bold">{(weight * 100).toFixed(2)}%</p>
        </div>
    )

    const MethodCard = ({ method, title, subtitle, color, weights, vol }) => (
        <div className={`bg-gradient-to-br from-${color}-50 to-${color}-100 border-2 border-${color}-300 rounded-xl p-6`}>
            <h3 className={`text-lg font-bold text-${color}-900 mb-2`}>{title}</h3>
            <p className={`text-xs text-${color}-700 mb-4`}>{subtitle}</p>
            <div className="space-y-2 mb-4">
                {weights.map((w, i) => (
                    <WeightCard
                        key={i}
                        weight={w}
                        name={allData[returns.codes[i]].name}
                        color={color}
                    />
                ))}
            </div>
            <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-600">Annual Volatility</p>
                <p className={`text-2xl font-bold text-${color}-600`}>
                    {(vol * 100).toFixed(2)}%
                </p>
            </div>
        </div>
    )

    return (
        <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
                ⚖️ Step 3: MVP Analysis (3 Methods)
            </h2>

            <button
                onClick={handleCalculate}
                disabled={isCalculating}
                className="w-full px-6 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-lg mb-6 disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isCalculating ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <TrendingUp size={24} />
                )}
                {isCalculating ? 'Calculating...' : 'Calculate MVP (All 3 Methods)'}
            </button>

            {mvpResults && (
                <div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <MethodCard
                            method="sqp"
                            title="🎯 SQP Method"
                            subtitle="Sequential Quadratic Programming"
                            color="blue"
                            weights={mvpResults.sqp.weights}
                            vol={mvpResults.sqp.vol}
                        />
                        <MethodCard
                            method="convex"
                            title="🔷 Convex Method"
                            subtitle="Interior Point / Barrier"
                            color="green"
                            weights={mvpResults.convex.weights}
                            vol={mvpResults.convex.vol}
                        />
                        <MethodCard
                            method="critical"
                            title="📐 Critical Line"
                            subtitle="Analytical Solution"
                            color="purple"
                            weights={mvpResults.critical.weights}
                            vol={mvpResults.critical.vol}
                        />
                    </div>

                    <button
                        onClick={() => goToStep(4)}
                        className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={24} />
                        Proceed to Black-Litterman (Step 4) →
                    </button>
                </div>
            )}
        </div>
    )
}
