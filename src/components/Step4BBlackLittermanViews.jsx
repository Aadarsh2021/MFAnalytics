import { useState, useEffect } from 'react'
import { Plus, CheckCircle, Scale } from 'lucide-react'
import { detectRegime } from '../utils/regimeDetector'
import Step4SetViews from './Step4SetViews'

export default function Step4BBlackLittermanViews({
    views,
    setViews,
    returns,
    allData,
    goToStep,
    selectedFunds, // Added
    selectedRegimeId,
    setSelectedRegimeId,
    weightMethod,
    setWeightMethod,
    customWeights,
    setCustomWeights,
    macroData,
    setRegimeContext
}) {

    // Check if any fund has market cap value
    const hasMarketCap = selectedFunds && selectedFunds.some(f => (f.marketCap || f.aum || f.mCap) && parseFloat(f.marketCap || f.aum || f.mCap) > 0)

    // Background regime detection + Market Cap Fallback
    useEffect(() => {
        // Fallback to Equal Weight if Market Cap is missing
        if (!hasMarketCap && weightMethod === 'market_cap') {
            setWeightMethod('equal')
        }

        if (macroData && macroData.length > 0) {
            const latestData = macroData[macroData.length - 1]
            const detection = detectRegime(latestData)

            // Store for final report alerts
            setRegimeContext({
                detection,
                timestamp: new Date().toISOString()
            })
        }
    }, [macroData, hasMarketCap, weightMethod])

    const proceedToOptimization = () => {
        goToStep('5B') // Go to Black-Litterman Optimization
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                        <Scale className="text-emerald-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Step 4B: Black-Litterman Views</h2>
                        <p className="text-gray-500">Express your market expectations to adjust the equilibrium model</p>
                    </div>
                </div>
            </div>

            {/* Express Market Views Section */}
            <Step4SetViews
                views={views}
                setViews={setViews}
                returns={returns}
                allData={allData}
                goToStep={goToStep}
                selectedRegimeId={selectedRegimeId}
                setSelectedRegimeId={setSelectedRegimeId}
            />

            <div className="flex justify-between items-center pt-6">
                <button
                    onClick={() => goToStep(4)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold"
                >
                    ← Back to Path Selection
                </button>
                <button
                    onClick={proceedToOptimization}
                    className="px-8 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-lg flex items-center gap-3 shadow-xl"
                >
                    Proceed to BL Optimization (Step 5B)
                    <CheckCircle size={22} />
                </button>
            </div>
        </div>
    )
}
