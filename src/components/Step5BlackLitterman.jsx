import { useState } from 'react'
import { Calculator, CheckCircle } from 'lucide-react'
import { calculateBlackLitterman } from '../utils/optimization.js'

export default function Step5BlackLitterman({
    returns,
    allData,
    views,
    setBlResult,
    blResult,
    showMessage,
    goToStep
}) {
    const [isCalculating, setIsCalculating] = useState(false)

    const handleCalculate = () => {
        setIsCalculating(true)
        try {
            const result = calculateBlackLitterman(returns, views)
            setBlResult(result)
            showMessage('success', 'Black-Litterman optimization complete!')
        } catch (e) {
            showMessage('error', 'Black-Litterman failed: ' + e.message)
        } finally {
            setIsCalculating(false)
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
                🎯 Step 5: Black-Litterman Optimization
            </h2>

            <button
                onClick={handleCalculate}
                disabled={isCalculating}
                className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-lg mb-6 disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isCalculating ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <Calculator size={24} />
                )}
                {isCalculating ? 'Calculating...' : 'Calculate Black-Litterman Portfolio'}
            </button>

            {blResult && (
                <div>
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-6 mb-6">
                        <h3 className="text-xl font-bold text-purple-900 mb-4">
                            📊 Black-Litterman Optimal Weights
                        </h3>
                        <div className="space-y-2 mb-4">
                            {blResult.weights.map((w, i) => (
                                <div key={i} className="bg-white p-3 rounded-lg border-2 border-purple-200">
                                    <p className="text-sm font-medium truncate">
                                        {allData[returns.codes[i]].name.substring(0, 30)}
                                    </p>
                                    <p className="text-xl font-bold text-purple-600">
                                        {(w * 100).toFixed(2)}%
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-lg">
                                <p className="text-sm text-gray-600">Expected Return</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {(blResult.expectedReturn * 100).toFixed(2)}%
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg">
                                <p className="text-sm text-gray-600">Volatility</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {(blResult.vol * 100).toFixed(2)}%
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => goToStep(6)}
                        className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={24} />
                        Generate Final Report (Step 6) →
                    </button>
                </div>
            )}
        </div>
    )
}
