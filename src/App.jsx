import { useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import MessageBox from './components/MessageBox'
import StatusTracker from './components/StatusTracker'
import DataQualityPanel from './components/DataQualityPanel'
import ProgressTimeline from './components/ProgressTimeline'
import InsightsPanel from './components/InsightsPanel'
import Step1SearchFunds from './components/Step1SearchFunds'
import Step2FetchData from './components/Step2FetchData'
import Step3MVPAnalysis from './components/Step3MVPAnalysis'
import Step4SetViews from './components/Step4SetViews'
import Step5BlackLitterman from './components/Step5BlackLitterman'
import Step6FinalReport from './components/Step6FinalReport'

function App() {
    const [currentStep, setCurrentStep] = useState(1)
    const [message, setMessage] = useState({ type: '', text: '' })

    // Data state
    const [selectedFunds, setSelectedFunds] = useState([])
    const [searchResults, setSearchResults] = useState([])
    const [allData, setAllData] = useState({})
    const [aligned, setAligned] = useState(null)
    const [returns, setReturns] = useState(null)
    const [mvpResults, setMvpResults] = useState(null)
    const [views, setViews] = useState([])
    const [blResult, setBlResult] = useState(null)

    // Enhanced tracking state
    const [activityLog, setActivityLog] = useState([])
    const [dataQuality, setDataQuality] = useState(null)
    const [stepTimings, setStepTimings] = useState({})
    const [insights, setInsights] = useState([])
    const [currentOperation, setCurrentOperation] = useState(null)

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
        setCurrentOperation
    }

    return (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
            <div className="max-w-[1600px] mx-auto p-6">
                <Header />
                <MessageBox message={message} />

                {/* Sidebar + Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                    {/* Left Sidebar */}
                    <div>
                        <Sidebar currentStep={currentStep} goToStep={goToStep} />
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
                        {currentStep === 4 && <Step4SetViews {...appState} />}
                        {currentStep === 5 && <Step5BlackLitterman {...appState} />}
                        {currentStep === 6 && <Step6FinalReport {...appState} />}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
