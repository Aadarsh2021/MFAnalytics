import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Activity } from 'lucide-react'
import { supabase } from '../utils/supabase'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import MessageBox from '../components/MessageBox'
import StatusTracker from '../components/StatusTracker'
import DataQualityPanel from '../components/DataQualityPanel'
import ProgressTimeline from '../components/ProgressTimeline'
import InsightsPanel from '../components/InsightsPanel'
import Step1SearchFunds from '../components/Step1SearchFunds'
import Step2FetchData from '../components/Step2FetchData'
import Step3MVPAnalysis from '../components/Step3MVPAnalysis'
import Step4SetViews from '../components/Step4SetViews'
import Step5BlackLitterman from '../components/Step5BlackLitterman'
import Step6MonteCarlo from '../components/Step6MonteCarlo'
import Step7FinalReport from '../components/Step7FinalReport'
import ErrorBoundary from '../components/ErrorBoundary'

// New components for Dual-Path Optimization
import Step4ChooseOptimizationPath from '../components/Step4ChooseOptimizationPath'
import Step4ARegimeViews from '../components/Step4ARegimeViews'
import Step4BBlackLittermanViews from '../components/Step4BBlackLittermanViews'
import Step5ARegimeOptimization from '../components/Step5ARegimeOptimization'
import PastAnalysisModal from '../components/PastAnalysisModal'

function OptimizerApp() {
    const [currentStep, setCurrentStep] = useState(1)
    const [message, setMessage] = useState({ type: '', text: '' })
    const { logout, user } = useAuth()
    const navigate = useNavigate()

    // Data state
    const [selectedFunds, setSelectedFunds] = useState([])
    const [searchResults, setSearchResults] = useState([])
    const [allData, setAllData] = useState({})
    const [aligned, setAligned] = useState(null)
    const [returns, setReturns] = useState(null)
    const [mvpResults, setMvpResults] = useState(null)
    const [views, setViews] = useState([])
    const [blResult, setBlResult] = useState(null)
    const [regimeResult, setRegimeResult] = useState(null) // NEW: Distinct state for Regime Optimization

    // Enhanced tracking state
    const [activityLog, setActivityLog] = useState([])
    const [dataQuality, setDataQuality] = useState(null)
    const [stepTimings, setStepTimings] = useState({})
    const [insights, setInsights] = useState([])
    const [currentOperation, setCurrentOperation] = useState(null)
    const [selectedRegimeId, setSelectedRegimeId] = useState('MARKET_WEIGHT')

    // Dual Path State
    const [optimizationPath, setOptimizationPath] = useState(null) // 'regime' or 'bl'
    const [macroData, setMacroData] = useState(null)
    const [currentRegime, setCurrentRegime] = useState(null)
    const [backtestResults, setBacktestResults] = useState(null)
    const [regimeContext, setRegimeContext] = useState(null)
    const [weightMethod, setWeightMethod] = useState('market_cap')
    const [customWeights, setCustomWeights] = useState({})
    const [isDashboardOpen, setIsDashboardOpen] = useState(false)
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [history, setHistory] = useState([])
    const [historyLoading, setHistoryLoading] = useState(false)

    // --- State Persistence ---

    // 2. Load History from Supabase (Centralized for speed)
    const loadHistory = async () => {
        setHistoryLoading(true)
        try {
            const { data, error } = await supabase
                .from('analyses')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setHistory(data || [])
        } catch (e) {
            console.error("Error loading centralized history:", e)
        } finally {
            setHistoryLoading(false)
        }
    }

    useEffect(() => {
        loadHistory()
        window.addEventListener('mfp-history-update', loadHistory)
        return () => window.removeEventListener('mfp-history-update', loadHistory)
    }, [])

    // 1. Initial Load from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('mfp_optimizer_state')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                if (parsed.currentStep) setCurrentStep(parsed.currentStep)
                if (parsed.selectedFunds) setSelectedFunds(parsed.selectedFunds)
                if (parsed.allData) setAllData(parsed.allData)
                if (parsed.aligned) setAligned(parsed.aligned)
                if (parsed.returns) setReturns(parsed.returns)
                if (parsed.mvpResults) setMvpResults(parsed.mvpResults)
                if (parsed.views) setViews(parsed.views)
                if (parsed.blResult) setBlResult(parsed.blResult)
                if (parsed.regimeResult) setRegimeResult(parsed.regimeResult)
                if (parsed.optimizationPath) setOptimizationPath(parsed.optimizationPath)
                if (parsed.selectedRegimeId) setSelectedRegimeId(parsed.selectedRegimeId)
                if (parsed.currentRegime) setCurrentRegime(parsed.currentRegime)
                if (parsed.regimeContext) setRegimeContext(parsed.regimeContext)
                if (parsed.weightMethod) setWeightMethod(parsed.weightMethod)
                if (parsed.customWeights) setCustomWeights(parsed.customWeights)
                if (parsed.dataQuality) setDataQuality(parsed.dataQuality)

                console.log("Restored state from localStorage")
            } catch (e) {
                console.error("Failed to parse saved state", e)
            }
        }
    }, [])

    // 3. Handle Browser Back Button
    useEffect(() => {
        const handlePopState = (event) => {
            if (event.state && event.state.step) {
                // User pressed back button, go to previous step
                setCurrentStep(event.state.step)
            } else {
                // No state, go to step 1 instead of logging out
                event.preventDefault()
                setCurrentStep(1)
                window.history.pushState({ step: 1 }, '', '/optimizer?step=1')
            }
        }

        window.addEventListener('popstate', handlePopState)

        // Initialize history state on mount
        if (!window.history.state || !window.history.state.step) {
            window.history.replaceState({ step: currentStep }, '', `/optimizer?step=${currentStep}`)
        }

        return () => window.removeEventListener('popstate', handlePopState)
    }, [])

    // 2. Save to LocalStorage on Change
    useEffect(() => {
        const stateToSave = {
            currentStep,
            selectedFunds,
            allData,
            aligned,
            returns,
            mvpResults,
            views,
            blResult,
            regimeResult,
            optimizationPath,
            selectedRegimeId,
            currentRegime,
            regimeContext,
            weightMethod,
            customWeights,
            dataQuality
        }
        localStorage.setItem('mfp_optimizer_state', JSON.stringify(stateToSave))
    }, [
        currentStep, selectedFunds, allData, aligned, returns,
        mvpResults, views, blResult, regimeResult,
        optimizationPath, selectedRegimeId, currentRegime,
        regimeContext, weightMethod, customWeights, dataQuality
    ])

    const resetOptimizer = () => {
        if (window.confirm('Are you sure you want to reset all progress?')) {
            localStorage.removeItem('mfp_optimizer_state')
            window.location.reload()
        }
    }

    const showMessage = (type, text) => {
        setMessage({ type, text })
        setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    }

    const goToStep = (step) => {
        setCurrentStep(step)
        // Push state to browser history for back button support
        window.history.pushState({ step }, '', `/optimizer?step=${step}`)
    }

    const addActivity = (action, status, details = '', duration = null) => {
        setActivityLog(prev => {
            // Prevent duplicate logs within the same minute for the same action/details
            const now = new Date();
            const lastActivity = prev[prev.length - 1];
            if (lastActivity &&
                lastActivity.action === action &&
                lastActivity.details === details &&
                (now - new Date(lastActivity.timestamp)) < 10000) { // 10 second debounce
                return prev;
            }

            const activity = {
                timestamp: now.toISOString(),
                step: currentStep,
                action,
                status,
                details,
                duration
            }
            return [...prev, activity]
        })
    }

    const addInsight = (category, type, title, message, action = null, metrics = null) => {
        setInsights(prev => {
            // Prevent duplicate insights (check by category, title and message)
            if (prev.some(i => i.title === title && i.message === message)) {
                return prev;
            }
            const insight = { category, type, title, message, action, metrics }
            return [...prev, insight]
        })
    }

    const updateStepTiming = (step, duration, details = [], warnings = 0) => {
        setStepTimings(prev => ({
            ...prev,
            [step]: { duration, details, warnings }
        }))
    }

    const onLoadHistory = (historyItem) => {
        try {
            // Restore state
            setSelectedFunds(historyItem.state.selectedFunds || [])
            setAllData(historyItem.state.allData || {})
            setAligned(historyItem.state.aligned || null)
            setReturns(historyItem.state.returns || null)
            setMvpResults(historyItem.state.mvpResults || null)
            setViews(historyItem.state.views || [])
            setBlResult(historyItem.state.blResult || null)
            setDataQuality(historyItem.state.dataQuality || null)
            setSelectedRegimeId(historyItem.state.selectedRegimeId || 'MARKET_WEIGHT')

            // Restore Dual Path state
            setOptimizationPath(historyItem.state.optimizationPath || null)
            setMacroData(historyItem.state.macroData || null)
            setCurrentRegime(historyItem.state.currentRegime || null)
            setBacktestResults(historyItem.state.backtestResults || null)
            setRegimeContext(historyItem.state.regimeContext || null)
            setWeightMethod(historyItem.state.weightMethod || 'market_cap')
            setCustomWeights(historyItem.state.customWeights || {})

            // Go to final report to see the results
            setCurrentStep(7)
            showMessage('success', 'Analysis loaded from history!')
        } catch (e) {
            console.error('Failed to load history:', e)
            showMessage('error', 'Failed to load this analysis record.')
        }
    }

    const handleLogout = async () => {
        await logout()
        navigate('/')
    }

    const appState = {
        currentStep,
        setCurrentStep,
        selectedFunds,
        setSelectedFunds,
        searchResults,
        setSearchResults,
        allData,
        setAllData,
        aligned,
        setAligned,
        returns,
        setReturns,
        mvpResults,
        setMvpResults,
        views,
        setViews,
        blResult,
        setBlResult,
        showMessage,
        goToStep,
        addActivity,
        addInsight,
        setDataQuality,
        updateStepTiming,
        setCurrentOperation,
        // Dual Path State
        optimizationPath, setOptimizationPath,
        macroData, setMacroData,
        currentRegime, setCurrentRegime,
        backtestResults, setBacktestResults,
        regimeContext, setRegimeContext,
        weightMethod, setWeightMethod,
        customWeights, setCustomWeights,
        regimeResult, setRegimeResult // NEW
    }

    const handleStepReset = () => {
        if (currentStep === 7) goToStep(6);
        else if (currentStep === 6) goToStep(5);
        else if (currentStep === 5) {
            goToStep(optimizationPath === 'regime' ? '5A' : '4B');
        }
        else if (currentStep === '5A') goToStep('4A');
        else if (currentStep === '4A' || currentStep === '4B') goToStep(4);
        else if (typeof currentStep === 'number' && currentStep > 1) goToStep(currentStep - 1);
        else goToStep(1);
    }

    const [isSidebarOpen, setIsSidebarOpen] = useState(true)

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev)

    return (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
            <div className="max-w-[1600px] mx-auto p-6">
                {/* Header with Logout */}
                <div className="flex items-center justify-between mb-6">
                    <Header />
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600">
                            {user?.email}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                        <button
                            onClick={resetOptimizer}
                            className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-bold"
                            title="Clear progress and start over"
                        >
                            Reset Progress
                        </button>
                    </div>
                </div>

                <MessageBox message={message} />

                {/* Sidebar + Main Content Layout */}
                <div className={`grid grid-cols-1 gap-6 transition-all duration-300 ${isSidebarOpen ? 'lg:grid-cols-[300px_1fr]' : 'lg:grid-cols-[80px_1fr]'}`}>
                    {/* Left Sidebar */}
                    <div>
                        <Sidebar
                            currentStep={currentStep}
                            goToStep={goToStep}
                            onLoadHistory={onLoadHistory}
                            isOpen={isSidebarOpen}
                            toggleSidebar={toggleSidebar}
                            optimizationPath={optimizationPath}
                            onOpenHistory={() => setShowHistoryModal(true)}
                            history={history}
                            historyLoading={historyLoading}
                        />
                    </div>

                    {/* Main Content Area */}
                    <div className="space-y-6">
                        {/* Collapsible Analysis Dashboard */}
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 transition-all duration-500">
                            <button
                                onClick={() => setIsDashboardOpen(!isDashboardOpen)}
                                className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-slate-50 to-indigo-50/30 hover:bg-slate-100/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Activity className={`text-indigo-600 transition-transform duration-500 ${isDashboardOpen ? 'rotate-180' : ''}`} size={24} />
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight">ANALYSIS HEALTH & STATUS</h3>
                                        {!isDashboardOpen && (
                                            <div className="flex items-center gap-4 mt-1">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                                    {activityLog.filter(a => a.status === 'success').length} SUCCESS
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                                    {insights.filter(i => i.type === 'warning').length} WARNINGS
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className={`p-2 rounded-xl bg-white shadow-sm border border-slate-200 text-slate-400 transform transition-transform duration-300 ${isDashboardOpen ? 'rotate-180' : ''}`}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </button>

                            <div className={`transition-all duration-500 ease-in-out ${isDashboardOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                                <div className="p-8 space-y-8 border-t border-slate-100">
                                    {/* Enhanced Tracking Panels */}
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                        <StatusTracker activityLog={activityLog} currentOperation={currentOperation} />
                                        <ProgressTimeline
                                            stepTimings={stepTimings}
                                            currentStep={currentStep}
                                            optimizationPath={optimizationPath}
                                        />
                                    </div>

                                    {dataQuality && (
                                        <div className="border-t border-slate-50 pt-8">
                                            <DataQualityPanel dataQuality={dataQuality} />
                                        </div>
                                    )}
                                    {insights.length > 0 && (
                                        <div className="border-t border-slate-50 pt-8">
                                            <InsightsPanel insights={insights} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Step Content */}
                        <ErrorBoundary key={currentStep} onReset={handleStepReset}>
                            {currentStep === 1 && <Step1SearchFunds {...appState} />}
                            {currentStep === 2 && <Step2FetchData {...appState} />}
                            {currentStep === 3 && <Step3MVPAnalysis {...appState} />}

                            {/* Phase 4: Path Selection */}
                            {currentStep === 4 && (
                                <Step4ChooseOptimizationPath
                                    selectedFunds={selectedFunds}
                                    setOptimizationPath={setOptimizationPath}
                                    goToStep={goToStep}
                                />
                            )}

                            {/* Path A: Regime Optimization */}
                            {currentStep === '4A' && <Step4ARegimeViews {...appState} />}
                            {currentStep === '5A' && <Step5ARegimeOptimization {...appState} />}

                            {/* Path B: Black-Litterman Optimization */}
                            {currentStep === '4B' && <Step4BBlackLittermanViews {...appState} selectedRegimeId={selectedRegimeId} setSelectedRegimeId={setSelectedRegimeId} />}
                            {currentStep === '5B' && <Step5BlackLitterman {...appState} />}

                            {currentStep === 6 && <Step6MonteCarlo {...appState} macroData={macroData} regimeContext={regimeContext} />}
                            {currentStep === 7 && <Step7FinalReport {...appState} selectedRegimeId={selectedRegimeId} />}
                        </ErrorBoundary>
                    </div>
                </div>
            </div>

            <PastAnalysisModal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                history={history}
                loading={historyLoading}
                onLoadHistory={(item) => {
                    onLoadHistory(item);
                    setShowHistoryModal(false);
                }}
            />
        </div>
    )
}

export default OptimizerApp
