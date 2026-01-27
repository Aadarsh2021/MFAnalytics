import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut } from 'lucide-react'
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

// New components for Dual-Path Optimization
import Step4ChooseOptimizationPath from '../components/Step4ChooseOptimizationPath'
import Step4ARegimeViews from '../components/Step4ARegimeViews'
import Step4BBlackLittermanViews from '../components/Step4BBlackLittermanViews'
import Step5ARegimeOptimization from '../components/Step5ARegimeOptimization'

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

    const showMessage = (type, text) => {
        setMessage({ type, text })
        setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    }

    const goToStep = (step) => {
        setCurrentStep(step)
    }

    const addActivity = (action, status, details = '', duration = null) => {
        const activity = {
            timestamp: new Date().toISOString(),
            step: currentStep,
            action,
            status,
            details,
            duration
        }
        setActivityLog(prev => [...prev, activity])
    }

    const addInsight = (category, type, title, message, action = null, metrics = null) => {
        const insight = { category, type, title, message, action, metrics }
        setInsights(prev => [...prev, insight])
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
                        />
                    </div>

                    {/* Main Content Area */}
                    <div className="space-y-6">
                        {/* Enhanced Tracking Panels */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <StatusTracker activityLog={activityLog} currentOperation={currentOperation} />
                            <ProgressTimeline stepTimings={stepTimings} currentStep={currentStep} />
                        </div>

                        {dataQuality && <DataQualityPanel dataQuality={dataQuality} />}
                        {insights.length > 0 && <InsightsPanel insights={insights} />}

                        {/* Step Content */}
                        {currentStep === 1 && <Step1SearchFunds {...appState} />}
                        {currentStep === 2 && <Step2FetchData {...appState} />}
                        {currentStep === 3 && <Step3MVPAnalysis {...appState} />}

                        {/* Phase 4: Path Selection */}
                        {currentStep === 4 && (
                            <Step4ChooseOptimizationPath
                                setOptimizationPath={setOptimizationPath}
                                goToStep={goToStep}
                            />
                        )}

                        {/* Path A: Regime Optimization */}
                        {currentStep === '4A' && <Step4ARegimeViews {...appState} />}
                        {currentStep === '5A' && <Step5ARegimeOptimization {...appState} />}

                        {/* Path B: Black-Litterman Optimization */}
                        {currentStep === '4B' && <Step4BBlackLittermanViews {...appState} selectedRegimeId={selectedRegimeId} setSelectedRegimeId={setSelectedRegimeId} />}
                        {currentStep === 5 && <Step5BlackLitterman {...appState} />}

                        {currentStep === 6 && <Step6MonteCarlo {...appState} />}
                        {currentStep === 7 && <Step7FinalReport {...appState} selectedRegimeId={selectedRegimeId} />}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OptimizerApp
