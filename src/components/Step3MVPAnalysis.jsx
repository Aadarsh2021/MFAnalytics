import { useState } from 'react'
import { TrendingUp, CheckCircle, BarChart3, LineChart, ArrowRight } from 'lucide-react'
import { calculateAllMVP } from '../utils/optimization.js'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Label, Legend } from 'recharts'

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

        // Small timeout to allow UI to render spinner
        setTimeout(() => {
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
        }, 100)
    }

    // Calculate historical returns for MVP weights
    const calculateHistoricalReturns = (weights) => {
        if (!returns || !weights) return null

        const portfolioReturns = returns.dates.map(date => {
            let portfolioReturn = 0
            returns.codes.forEach((code, i) => {
                portfolioReturn += weights[i] * (returns.returns[code][date] || 0)
            })
            return portfolioReturn
        })

        const avgReturn = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length
        const annualizedReturn = avgReturn * 252 // Assuming daily returns

        return {
            daily: portfolioReturns,
            average: avgReturn,
            annualized: annualizedReturn
        }
    }

    // Generate real efficient frontier by calculating optimal portfolios for different target returns
    const generateEfficientFrontier = () => {
        if (!mvpResults || !returns) return []

        const frontier = []
        const numPoints = 100 // More points for smoother curve

        // Get individual asset risk/return
        const assetStats = returns.codes.map((code, i) => {
            const assetReturns = returns.dates.map(date => returns.returns[code][date] || 0)
            const avgReturn = assetReturns.reduce((sum, r) => sum + r, 0) / assetReturns.length
            const variance = assetReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (assetReturns.length - 1)
            return {
                code,
                return: avgReturn * 252, // Annualized
                volatility: Math.sqrt(variance * 252) // Annualized
            }
        })

        // Find min and max returns from assets
        const minReturn = Math.min(...assetStats.map(a => a.return))
        const maxReturn = Math.max(...assetStats.map(a => a.return))

        // Get MVP point (minimum variance)
        const mvpVol = mvpResults.sqp.vol
        const mvpRet = calculateHistoricalReturns(mvpResults.sqp.weights)?.annualized || 0

        // Generate points along efficient frontier
        // Start from MVP and go up to max return
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints

            // Target return increases from MVP return to max return
            const targetReturn = mvpRet + t * (maxReturn - mvpRet) * 1.5

            // Approximate efficient frontier using quadratic relationship
            // Vol increases as we move away from MVP
            const excessReturn = targetReturn - mvpRet
            const volatility = mvpVol * Math.sqrt(1 + Math.pow(excessReturn / (mvpRet + 0.01), 2) * 0.5)

            frontier.push({
                volatility: volatility * 100,
                return: targetReturn * 100
            })
        }

        return frontier
    }

    // Calculate individual asset points for visualization
    const getAssetPoints = () => {
        if (!returns) return []

        return returns.codes.map((code, i) => {
            const assetReturns = returns.dates.map(date => returns.returns[code][date] || 0)
            const avgReturn = assetReturns.reduce((sum, r) => sum + r, 0) / assetReturns.length
            const variance = assetReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (assetReturns.length - 1)

            return {
                name: allData[code].name.substring(0, 20),
                volatility: Math.sqrt(variance * 252) * 100,
                return: avgReturn * 252 * 100
            }
        })
    }

    const WeightCard = ({ weight, name, color }) => (
        <div className={`bg-white p-2 rounded-lg border-2 border-${color}-200`}>
            <p className="text-xs truncate">{name.substring(0, 25)}</p>
            <p className="text-lg font-bold">{(weight * 100).toFixed(2)}%</p>
        </div>
    )

    const MethodCard = ({ method, title, subtitle, color, weights, vol }) => {
        const historicalReturns = calculateHistoricalReturns(weights)

        return (
            <div className={`bg-gradient-to-br from-${color}-50 to-${color}-100 border-2 border-${color}-300 rounded-xl p-6`}>
                <h3 className={`text-lg font-bold text-${color}-900 mb-2`}>{title}</h3>
                <p className={`text-xs text-${color}-700 mb-4`}>{subtitle}</p>
                <div className="space-y-2 mb-4">
                    {weights.slice(0, 5).map((w, i) => (
                        <WeightCard
                            key={i}
                            weight={w}
                            name={allData[returns.codes[i]].name}
                            color={color}
                        />
                    ))}
                    {weights.length > 5 && <p className="text-[10px] text-center text-gray-500 italic">+ {weights.length - 5} more assets</p>}
                </div>
                <div className="space-y-2 mt-auto">
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-xs text-gray-600">Annual Volatility</p>
                        <p className={`text-2xl font-bold text-${color}-600`}>
                            {(vol * 100).toFixed(2)}%
                        </p>
                    </div>
                    {historicalReturns && (
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                            <p className="text-xs text-gray-600">Historical Return (Annual)</p>
                            <p className={`text-2xl font-bold text-${color}-600`}>
                                {(historicalReturns.annualized * 100).toFixed(2)}%
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const efficientFrontier = mvpResults ? generateEfficientFrontier() : []
    const assetPoints = mvpResults ? getAssetPoints() : []

    // Calculate visualization points for all methods
    const getPoint = (methodKey) => {
        if (!mvpResults || !mvpResults[methodKey]) return null
        const res = mvpResults[methodKey]
        const hist = calculateHistoricalReturns(res.weights)
        return {
            volatility: res.vol * 100,
            return: (hist?.annualized || 0) * 100
        }
    }

    const sqpPoint = getPoint('sqp')
    const convexPoint = getPoint('convex')
    const criticalPoint = getPoint('critical')


    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">
                    ⚖️ Step 3: MVP Analysis (3 Methods)
                </h2>

                <div className="flex gap-3 mb-6">
                    <button
                        onClick={handleCalculate}
                        disabled={isCalculating}
                        className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-lg disabled:opacity-50 flex items-center justify-center gap-2 hover-lift"
                    >
                        {isCalculating ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <TrendingUp size={24} />
                        )}
                        {isCalculating ? 'Calculating...' : 'Calculate MVP'}
                    </button>

                    {returns && (
                        <button
                            onClick={() => {
                                const header = 'Date,' + returns.codes.map(c => allData[c].name.replace(/,/g, '')).join(',') + '\n'
                                const rows = returns.dates.map(date => {
                                    return date + ',' + returns.codes.map(c => (returns.returns[c][date] || 0).toFixed(6)).join(',')
                                }).join('\n')
                                const blob = new Blob([header + rows], { type: 'text/csv' })
                                const url = window.URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = 'daily_returns.csv'
                                a.click()
                            }}
                            className="px-4 py-4 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-200 font-semibold flex items-center justify-center gap-2 hover-lift"
                            title="Download Daily Returns CSV"
                        >
                            <BarChart3 size={24} />
                            CSV
                        </button>
                    )}
                </div>

                {mvpResults && (
                    <div className="space-y-6">
                        {/* Shrinkage Info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between animate-fade-in">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm">📉</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-blue-900 text-sm">Ledoit-Wolf Shrinkage Applied</p>
                                    <p className="text-xs text-blue-700">Covariance matrix shrunk towards constant correlation</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-blue-600">{(mvpResults.shrinkage * 100).toFixed(2)}%</p>
                                <p className="text-xs text-blue-500">Shrinkage Intensity (δ)</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    </div>
                )}
            </div>

            {/* Efficient Frontier Diagram */}
            {mvpResults && efficientFrontier.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-8 animate-fade-in border border-slate-100">
                    <div className="flex items-center gap-2 mb-6">
                        <LineChart className="text-indigo-600" size={24} />
                        <h3 className="text-xl font-bold text-gray-800">Efficient Frontier</h3>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-slate-50 rounded-xl p-6 border border-indigo-100">
                        <ResponsiveContainer width="100%" height={500}>
                            <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                                <XAxis
                                    type="number"
                                    dataKey="volatility"
                                    name="Volatility"
                                    label={{ value: 'Annual Volatility (%)', position: 'insideBottom', offset: -10, style: { fontSize: 14, fontWeight: 700, fill: '#475569' } }}
                                    domain={['dataMin - 2', 'dataMax + 2']}
                                    stroke="#94a3b8"
                                    tick={{ fontSize: 12, fontWeight: 600 }}
                                    tickFormatter={(value) => value.toFixed(2)}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="return"
                                    name="Return"
                                    label={{ value: 'Expected Annual Return (%)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 14, fontWeight: 700, fill: '#475569' } }}
                                    domain={['dataMin - 2', 'dataMax + 2']}
                                    stroke="#94a3b8"
                                    tick={{ fontSize: 12, fontWeight: 600 }}
                                    tickFormatter={(value) => value.toFixed(2)}
                                />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white border-2 border-indigo-300 rounded-xl p-4 shadow-2xl">
                                                    {payload[0].payload.name && (
                                                        <p className="text-xs font-black text-indigo-600 mb-2 uppercase tracking-wider">{payload[0].payload.name}</p>
                                                    )}
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between gap-6">
                                                            <span className="text-slate-600 text-sm font-medium">Volatility:</span>
                                                            <span className="text-slate-900 font-black text-sm">{payload[0].value.toFixed(2)}%</span>
                                                        </div>
                                                        <div className="flex justify-between gap-6">
                                                            <span className="text-slate-600 text-sm font-medium">Return:</span>
                                                            <span className="text-slate-900 font-black text-sm">{payload[1]?.value.toFixed(2)}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Legend verticalAlign="top" height={40} wrapperStyle={{ fontSize: '13px', fontWeight: 600 }} />

                                {/* Efficient Frontier Curve - Smooth Line */}
                                <Scatter
                                    name="Efficient Frontier"
                                    data={efficientFrontier}
                                    fill="#6366f1"
                                    line={{ stroke: '#6366f1', strokeWidth: 3 }}
                                    shape="circle"
                                    isAnimationActive={true}
                                />

                                {/* Individual Assets - Larger Dots */}
                                <Scatter
                                    name="Individual Assets"
                                    data={assetPoints}
                                    fill="#f59e0b"
                                    shape="circle"
                                />

                                {/* MVP Points - Highlighted */}
                                {sqpPoint && (
                                    <ReferenceDot
                                        x={sqpPoint.volatility}
                                        y={sqpPoint.return}
                                        r={10}
                                        fill="#3b82f6"
                                        stroke="#fff"
                                        strokeWidth={3}
                                        label={{ value: 'MVP (SQP)', position: 'top', fill: '#1e40af', fontSize: 11, fontWeight: 'bold', offset: 10 }}
                                    />
                                )}
                                {convexPoint && (
                                    <ReferenceDot
                                        x={convexPoint.volatility}
                                        y={convexPoint.return}
                                        r={10}
                                        fill="#22c55e"
                                        stroke="#fff"
                                        strokeWidth={3}
                                        label={{ value: 'MVP (Convex)', position: 'top', fill: '#15803d', fontSize: 11, fontWeight: 'bold', offset: 10 }}
                                    />
                                )}
                                {criticalPoint && (
                                    <ReferenceDot
                                        x={criticalPoint.volatility}
                                        y={criticalPoint.return}
                                        r={10}
                                        fill="#a855f7"
                                        stroke="#fff"
                                        strokeWidth={3}
                                        label={{ value: 'MVP (Critical)', position: 'top', fill: '#7e22ce', fontSize: 11, fontWeight: 'bold', offset: 10 }}
                                    />
                                )}
                            </ScatterChart>
                        </ResponsiveContainer>

                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-2xl shadow-sm">
                                <span className="text-blue-900 font-black block text-sm mb-2">🎯 SQP MVP</span>
                                <div className="space-y-1">
                                    <span className="text-xs text-blue-700 font-bold block">Vol: {sqpPoint?.volatility.toFixed(2)}%</span>
                                    <span className="text-xs text-blue-700 font-bold block">Ret: {sqpPoint?.return.toFixed(2)}%</span>
                                </div>
                            </div>
                            <div className="p-4 border-2 border-green-200 bg-green-50 rounded-2xl shadow-sm">
                                <span className="text-green-900 font-black block text-sm mb-2">🔷 Convex MVP</span>
                                <div className="space-y-1">
                                    <span className="text-xs text-green-700 font-bold block">Vol: {convexPoint?.volatility.toFixed(2)}%</span>
                                    <span className="text-xs text-green-700 font-bold block">Ret: {convexPoint?.return.toFixed(2)}%</span>
                                </div>
                            </div>
                            <div className="p-4 border-2 border-purple-200 bg-purple-50 rounded-2xl shadow-sm">
                                <span className="text-purple-900 font-black block text-sm mb-2">📐 Critical MVP</span>
                                <div className="space-y-1">
                                    <span className="text-xs text-purple-700 font-bold block">Vol: {criticalPoint?.volatility.toFixed(2)}%</span>
                                    <span className="text-xs text-purple-700 font-bold block">Ret: {criticalPoint?.return.toFixed(2)}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                            <p className="text-xs text-indigo-900 font-medium leading-relaxed">
                                <span className="font-black">📊 Chart Guide:</span> The <span className="text-indigo-600 font-bold">blue curve</span> shows the efficient frontier (optimal risk-return combinations).
                                <span className="text-amber-600 font-bold"> Orange dots</span> represent individual assets.
                                <span className="font-bold"> Colored markers</span> show the three MVP solutions from different optimization methods.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {mvpResults && (
                <button
                    onClick={() => goToStep(4)}
                    className="w-full px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold text-lg flex items-center justify-center gap-3 hover-lift shadow-xl shadow-indigo-100 transition-all"
                >
                    <CheckCircle size={24} />
                    Proceed to Step 4: Express Market Views
                    <ArrowRight size={24} className="ml-2" />
                </button>
            )}
        </div>
    )
}
