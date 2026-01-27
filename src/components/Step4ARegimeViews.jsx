import { useState, useEffect } from 'react'
import { Upload, TrendingUp, AlertTriangle, CheckCircle, Plus, X, Target, BarChart3 } from 'lucide-react'
import { detectRegime, getMissingAssetClasses, validateRegimeConstraints, getRegimeAllocationBands } from '../utils/regimeDetector'
import { parseCSV, consolidateMacroData, processIndianMacroData } from '../utils/macroDataProcessor'
import { backtestRegimePortfolio, generateBacktestReport } from '../utils/backtestEngine'
import { REGIMES } from '../config/regimeConfig'
import usMacroHistorical from '../../data/processed/usMacroHistorical.json'
import indiaMacroHistorical from '../../data/processed/indiaMacroHistorical.json'
import BacktestResults from './BacktestResults'
import SixPillarsDashboard from './SixPillarsDashboard'

export default function Step4ARegimeViews({
    selectedFunds,
    returns,
    allData,
    views,
    setViews,
    goToStep,
    macroData,
    setMacroData,
    currentRegime,
    setCurrentRegime,
    setRegimeContext
}) {
    const [uploadedFiles, setUploadedFiles] = useState([])
    const [regimeDetection, setRegimeDetection] = useState(null)
    const [missingAssets, setMissingAssets] = useState([])
    const [showBacktest, setShowBacktest] = useState(false)
    const [backtestData, setBacktestData] = useState(null)
    const [selectedRegion, setSelectedRegion] = useState('US') // US or IN

    // Detect regime when macro data is loaded
    useEffect(() => {
        if (macroData && macroData.length > 0) {
            const latestData = macroData[macroData.length - 1]
            const detection = detectRegime(latestData)
            setRegimeDetection(detection)
            setCurrentRegime(detection.dominant)

            // Set context for final report
            setRegimeContext({
                detection,
                timestamp: new Date().toISOString()
            })

            // Check for missing asset classes
            const missing = getMissingAssetClasses(selectedFunds, detection.dominant)
            setMissingAssets(missing)
        }
    }, [macroData, selectedFunds])

    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files)

        // Parse CSV files
        const parsedData = {}
        for (const file of files) {
            const text = await file.text()
            const data = parseCSV(text)
            parsedData[file.name] = data
        }

        // Consolidate
        const consolidated = consolidateMacroData(parsedData)
        setMacroData(consolidated)
        setUploadedFiles(files.map(f => f.name))
    }

    const loadPreloadedData = () => {
        let data = []
        if (selectedRegion === 'US') {
            data = usMacroHistorical
        } else if (selectedRegion === 'IN') {
            data = processIndianMacroData(indiaMacroHistorical)
        }

        setMacroData(data)
        setUploadedFiles([`Pre-loaded ${selectedRegion === 'US' ? 'US' : 'Indian'} Dataset (2002-2025)`])
    }

    const addView = () => {
        setViews([...views, {
            type: 'absolute',
            assetIdx: 0,
            asset1Idx: 0,
            asset2Idx: Math.min(1, returns.codes.length - 1),
            return: 0.0,
            confidence: 0.5
        }])
    }

    const updateView = (idx, field, value) => {
        const newViews = [...views]
        newViews[idx][field] = value

        // Validate view doesn't violate regime constraints
        // (Implementation in next iteration)

        setViews(newViews)
    }

    const removeView = (idx) => {
        setViews(views.filter((_, i) => i !== idx))
    }

    const runBacktest = () => {
        if (!macroData || macroData.length < 2) {
            alert('Please upload macro data first')
            return
        }

        if (!returns || !returns.dates || returns.dates.length < 2) {
            alert('Insufficient return data. Please ensure you have completed Step 2.')
            return
        }

        try {
            const startDate = macroData[0].date
            const endDate = macroData[macroData.length - 1].date

            console.log('🔄 Running backtest:', { startDate, endDate, fundsCount: selectedFunds.length })

            const results = backtestRegimePortfolio(
                selectedFunds,
                returns,
                macroData,
                startDate,
                endDate
            )

            const report = generateBacktestReport(results)
            console.log('✅ Backtest complete:', report)

            setBacktestData(report)
            setShowBacktest(true)
        } catch (error) {
            console.error('❌ Backtest error:', error)
            alert(`Backtest failed: ${error.message}`)
        }
    }

    const proceedToOptimization = () => {
        if (!regimeDetection) {
            alert('Please upload macro data first')
            return
        }

        if (missingAssets.length > 0) {
            const confirm = window.confirm(
                `Warning: Missing required asset classes: ${missingAssets.join(', ')}. ` +
                `This may result in suboptimal allocation. Continue anyway?`
            )
            if (!confirm) return
        }

        goToStep('5A') // Go to Regime Optimization
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Macro Data Upload */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <Upload className="text-indigo-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Step 4A: Regime Detection & Views</h2>
                        <p className="text-gray-500">Upload macro data to detect current market regime</p>
                    </div>
                </div>

                {!macroData ? (
                    <div className="border-2 border-dashed border-indigo-200 rounded-xl p-12 text-center hover:border-indigo-400 transition">
                        <Upload className="mx-auto text-indigo-300 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-gray-700 mb-2">Upload Macro Indicators</h3>
                        <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
                            Upload CSV files with macro indicators (Real Rate, Debt/GDP, CPI, etc.) or use pre-loaded US dataset
                        </p>
                        <input
                            type="file"
                            multiple
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="macro-upload"
                        />
                        <label
                            htmlFor="macro-upload"
                            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer font-bold"
                        >
                            Choose CSV Files
                        </label>
                        <p className="text-xs text-gray-400 mt-4">
                            Or
                        </p>

                        {/* Region Selector */}
                        <div className="mt-4 flex gap-4">
                            <div className="relative">
                                <select
                                    value={selectedRegion}
                                    onChange={(e) => setSelectedRegion(e.target.value)}
                                    className="appearance-none bg-white border border-slate-200 text-slate-700 py-3 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 font-bold cursor-pointer h-full"
                                >
                                    <option value="US">🇺🇸 United States</option>
                                    <option value="IN">🇮🇳 India</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>

                            <button
                                onClick={loadPreloadedData}
                                className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl p-4 transition-all font-bold group border border-slate-200"
                            >
                                <BarChart3 className="group-hover:scale-110 transition-transform" />
                                <div>
                                    <div className="text-sm">Load {selectedRegion} Data</div>
                                    <div className="text-[10px] opacity-60 font-semibold uppercase tracking-wider">2002-2025</div>
                                </div>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="text-green-600" size={20} />
                                <span className="font-bold text-green-900">
                                    Macro data loaded ({macroData.length} months)
                                </span>
                            </div>
                            <button
                                onClick={() => setMacroData(null)}
                                className="text-sm text-green-700 hover:text-green-900 font-bold"
                            >
                                Change Data
                            </button>
                        </div>
                        {uploadedFiles.length > 0 && (
                            <div className="text-xs text-gray-500">
                                Files: {uploadedFiles.join(', ')}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Regime Detection Results */}
            {regimeDetection && (
                <div className="space-y-6">
                    {/* Six Pillars Dashboard */}
                    <SixPillarsDashboard
                        indicators={regimeDetection.indicators}
                        scores={regimeDetection.scores}
                        regimeScore={regimeDetection.probabilities.REGIME_C}
                    />

                    <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <BarChart3 className="text-indigo-600" size={24} />
                            Current Regime Detection
                        </h3>

                        {/* Regime Probabilities */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {Object.entries(regimeDetection.probabilities).map(([regime, prob]) => (
                                <RegimeProbabilityBar
                                    key={regime}
                                    regime={regime}
                                    probability={prob}
                                    isActive={regime === regimeDetection.dominant}
                                />
                            ))}
                        </div>

                        {/* Dominant Regime Info */}
                        <div className="p-6 bg-indigo-50 border border-indigo-200 rounded-xl">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-100 rounded-lg">
                                    <Target className="text-indigo-600" size={24} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-indigo-900 mb-2">
                                        Dominant Regime: {REGIMES[regimeDetection.dominant]?.name}
                                    </h4>
                                    <p className="text-sm text-indigo-700 mb-3">
                                        {REGIMES[regimeDetection.dominant]?.description}
                                    </p>
                                    <div className="text-xs text-indigo-600 font-bold">
                                        Confidence: {(regimeDetection.confidence * 100).toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Allocation Bands */}
                        {REGIMES[regimeDetection.dominant]?.allocationBands && (
                            <div className="mt-6">
                                <h4 className="font-bold text-gray-700 mb-3">Allocation Bands for This Regime:</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {Object.entries(REGIMES[regimeDetection.dominant].allocationBands).map(([assetClass, band]) => (
                                        <div key={assetClass} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="text-xs font-bold text-gray-500 uppercase mb-1">{assetClass.replace('_', ' ')}</div>
                                            <div className="text-sm font-black text-gray-800">
                                                {(band.min * 100).toFixed(0)}% - {(band.max * 100).toFixed(0)}%
                                            </div>
                                            <div className="text-xs text-gray-500">Target: {(band.target * 100).toFixed(0)}%</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Missing Asset Classes Alert */}
            {missingAssets.length > 0 && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <AlertTriangle className="text-red-600 flex-shrink-0" size={24} />
                        <div>
                            <h4 className="font-bold text-red-900 mb-2">Missing Required Asset Classes</h4>
                            <p className="text-sm text-red-700 mb-3">
                                For optimal performance in {REGIMES[regimeDetection?.dominant]?.name}, you should include:
                            </p>
                            <ul className="list-disc list-inside text-sm text-red-700 mb-4">
                                {missingAssets.map(asset => {
                                    let hint = '';
                                    if (asset === 'DEBT_SHORT') hint = ' (Liquid, Overnight, Low Duration, or Ultra Short funds)';
                                    if (asset === 'DEBT_MEDIUM') hint = ' (Short Term, Corporate Bond, Banking & PSU, or Dynamic Bond funds)';
                                    if (asset === 'DEBT_LONG') hint = ' (Gilt, Long Duration, or Medium to Long Duration funds)';
                                    if (asset === 'EQUITY') hint = ' (Large, Mid, or Flexi Cap funds)';
                                    if (asset === 'GOLD') hint = ' (Gold ETF or Silver Funds)';

                                    return <li key={asset}><strong>{asset.replace('_', ' ')}</strong>{hint}</li>;
                                })}
                            </ul>
                            <button
                                onClick={() => goToStep(1)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm"
                            >
                                Go Back & Add Funds
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Views Section (Similar to existing Step4SetViews) */}
            {regimeDetection && (
                <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Target className="text-indigo-600" size={24} />
                            Express Market Views (Within Regime Constraints)
                        </h3>
                        <button
                            onClick={addView}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm flex items-center gap-2"
                        >
                            <Plus size={16} />
                            Add View
                        </button>
                    </div>

                    {views.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                            <Target className="mx-auto text-slate-300 mb-4" size={48} />
                            <h4 className="text-slate-600 font-semibold mb-2">No views defined</h4>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto mb-4">
                                Views will be applied within the regime's allocation constraints
                            </p>
                            <button
                                onClick={addView}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm"
                            >
                                Add First View
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Array.isArray(views) && views.map((view, idx) => (
                                <ViewEditor
                                    key={idx}
                                    view={view}
                                    idx={idx}
                                    returns={returns}
                                    allData={allData}
                                    updateView={updateView}
                                    removeView={removeView}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Historical Backtesting Option */}
            {regimeDetection && (
                <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Historical Backtesting</h3>
                            <p className="text-sm text-gray-500">See how this regime-based strategy performed historically (2002-2025)</p>
                        </div>
                        <button
                            onClick={runBacktest}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-sm"
                        >
                            {backtestData ? 'Update Backtest' : 'Run Backtest'}
                        </button>
                    </div>

                    {showBacktest && backtestData && (
                        <div className="mt-4">
                            <BacktestResults backtestData={backtestData} />
                        </div>
                    )}
                </div>
            )}

            {/* Proceed Button */}
            {regimeDetection && (
                <div className="flex justify-between items-center pt-6">
                    <button
                        onClick={() => goToStep(3)}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold"
                    >
                        ← Back
                    </button>
                    <button
                        onClick={proceedToOptimization}
                        className="px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-lg flex items-center gap-3 shadow-xl"
                    >
                        Optimize with Regime Constraints
                        <CheckCircle size={22} />
                    </button>
                </div>
            )}
        </div>
    )
}

function RegimeProbabilityBar({ regime, probability, isActive }) {
    const regimeInfo = REGIMES[regime]
    const percentage = (probability * 100).toFixed(1)

    return (
        <div className={`p-4 rounded-lg border-2 transition ${isActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-gray-50'
            }`}>
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-gray-700">{regimeInfo?.shortName || regime}</span>
                <span className={`text-lg font-black ${isActive ? 'text-indigo-600' : 'text-gray-600'}`}>
                    {percentage}%
                </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${isActive ? 'bg-indigo-600' : 'bg-gray-400'
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}

function ViewEditor({ view, idx, returns, allData, updateView, removeView }) {
    return (
        <div className="group relative bg-white border-2 border-slate-100 rounded-xl p-6 hover:border-indigo-200 hover:shadow-lg transition">
            <button
                onClick={() => removeView(idx)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 shadow-sm transition opacity-0 group-hover:opacity-100"
            >
                <X size={16} />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Type Toggle */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="flex bg-slate-100 rounded-xl p-1 w-fit">
                        <button
                            onClick={() => updateView(idx, 'type', 'absolute')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${view.type === 'absolute' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                                }`}
                        >
                            Absolute View
                        </button>
                        <button
                            onClick={() => updateView(idx, 'type', 'relative')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${view.type === 'relative' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                                }`}
                        >
                            Relative View
                        </button>
                    </div>

                    {/* Fund Selection */}
                    <div className="space-y-2">
                        {view.type === 'absolute' ? (
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Fund</label>
                                <select
                                    value={view.assetIdx}
                                    onChange={(e) => updateView(idx, 'assetIdx', parseInt(e.target.value))}
                                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {returns.codes.map((code, i) => (
                                        <option key={i} value={i}>{allData[code].name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outperforming Fund</label>
                                    <select
                                        value={view.asset1Idx || 0}
                                        onChange={(e) => updateView(idx, 'asset1Idx', parseInt(e.target.value))}
                                        className="w-full p-3 bg-green-50 text-green-800 border-none rounded-xl text-sm font-semibold outline-none"
                                    >
                                        {returns.codes.map((code, i) => (
                                            <option key={i} value={i}>{allData[code].name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Underperforming Fund</label>
                                    <select
                                        value={view.asset2Idx || 1}
                                        onChange={(e) => updateView(idx, 'asset2Idx', parseInt(e.target.value))}
                                        className="w-full p-3 bg-red-50 text-red-800 border-none rounded-xl text-sm font-semibold outline-none"
                                    >
                                        {returns.codes.map((code, i) => (
                                            <option key={i} value={i}>{allData[code].name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Return Input */}
                <div className="lg:col-span-3">
                    <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            {view.type === 'absolute' ? 'Expected Annual %' : 'Expected Outperformance %'}
                        </label>
                        <div className="flex items-center justify-center gap-1">
                            <input
                                type="number"
                                step="0.1"
                                value={(view.return * 100).toFixed(1)}
                                onChange={(e) => updateView(idx, 'return', parseFloat(e.target.value) / 100)}
                                className="w-20 bg-transparent text-2xl font-black text-slate-800 focus:outline-none text-center"
                            />
                            <span className="text-lg font-bold text-slate-400">%</span>
                        </div>
                    </div>
                </div>

                {/* Confidence */}
                <div className="lg:col-span-4">
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">View Confidence</label>
                            <span className="text-sm font-black text-indigo-700">{(view.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={view.confidence * 100}
                            onChange={(e) => updateView(idx, 'confidence', parseInt(e.target.value) / 100)}
                            className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
