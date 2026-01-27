import { useState } from 'react'
import { Download } from 'lucide-react'
import { alignData, calculateReturns } from '../utils/dataProcessing.js'
import { analyzeDataQuality } from '../utils/dataQuality.js'
import FundMetadataPanel from './FundMetadataPanel'

export default function Step2FetchData({
    selectedFunds,
    setAllData,
    setAligned,
    setReturns,
    showMessage,
    goToStep,
    addActivity,
    addInsight,
    setDataQuality,
    updateStepTiming,
    setCurrentOperation
}) {
    const [isFetching, setIsFetching] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentFund, setCurrentFund] = useState('')
    const [alignmentMetadata, setAlignmentMetadata] = useState(null)

    const fetchAllData = async () => {
        const startTime = Date.now()
        setIsFetching(true)
        setCurrentOperation({
            title: 'Fetching NAV Data',
            startTime,
            progress: 0
        })
        addActivity('Started data fetch', 'info', `Fetching data for ${selectedFunds.length} funds`)

        const allData = {}

        try {
            for (let i = 0; i < selectedFunds.length; i++) {
                const fund = selectedFunds[i]
                const currentProgress = ((i + 1) / selectedFunds.length * 100).toFixed(0)
                setProgress(currentProgress)
                setCurrentFund(fund.name)
                setCurrentOperation({
                    title: `Fetching ${fund.name}`,
                    startTime,
                    progress: currentProgress
                })

                const fetchStart = Date.now()
                const res = await fetch(`https://api.mfapi.in/mf/${fund.code}`)
                const data = await res.json()
                const fetchDuration = (Date.now() - fetchStart) / 1000

                if (data.data) {
                    allData[fund.code] = {
                        name: fund.name,
                        data: data.data,
                        meta: data.meta
                    }
                    addActivity(
                        `Fetched ${fund.name}`,
                        'success',
                        `Retrieved ${data.data.length} NAV records`,
                        fetchDuration
                    )
                }
            }

            setAllData(allData)
            const alignedData = alignData(allData)
            setAligned(alignedData)
            setAlignmentMetadata(alignedData.metadata) // Store metadata
            const returnsData = calculateReturns(alignedData)
            setReturns(returnsData)

            // Analyze data quality
            const quality = analyzeDataQuality(alignedData, allData)
            setDataQuality(quality)

            // Add insights based on quality
            if (quality.score < 90) {
                addInsight(
                    'Data Quality',
                    'warning',
                    'Data Quality Below Optimal',
                    `Quality score is ${quality.score}/100. Some funds have missing NAV data.`,
                    'Consider interpolating missing values or excluding problematic funds',
                    {
                        'Missing dates': `${quality.totalDates - quality.completeDates}`,
                        'Affected funds': quality.missingData.length
                    }
                )
            } else {
                addInsight(
                    'Data Quality',
                    'success',
                    'Excellent Data Quality',
                    `All funds have ${quality.score}% complete data coverage.`,
                    null,
                    {
                        'Total records': quality.totalDates * alignedData.codes.length,
                        'Complete dates': quality.completeDates
                    }
                )
            }

            const totalDuration = (Date.now() - startTime) / 1000
            updateStepTiming(2, totalDuration, [
                `Fetched ${selectedFunds.length} funds`,
                `${quality.totalDates} NAV records aligned`,
                `${returnsData.dates.length} daily returns calculated`
            ], quality.missingData.length)

            setCurrentOperation(null)
            addActivity('Data fetch complete', 'success', `All data processed in ${totalDuration.toFixed(1)}s`, totalDuration)
            showMessage('success', 'Data fetched and returns calculated successfully!')

            setTimeout(() => goToStep(3), 1500)
        } catch (e) {
            setCurrentOperation(null)
            addActivity('Data fetch failed', 'error', e.message)
            addInsight('Error', 'warning', 'Fetch Failed', e.message, 'Check internet connection and try again')
            showMessage('error', 'Fetch failed: ' + e.message)
        } finally {
            setIsFetching(false)
            setProgress(0)
            setCurrentFund('')
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
                📊 Step 2: Fetch NAV Data & Calculate Returns
            </h2>

            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
                <p className="text-yellow-900">
                    ⏳ This will fetch historical NAV data for all {selectedFunds.length} selected funds and calculate daily returns.
                </p>
            </div>

            <button
                onClick={fetchAllData}
                disabled={isFetching}
                className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-lg mb-4 disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isFetching ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <Download size={24} />
                )}
                {isFetching ? 'Fetching...' : 'Fetch Data & Calculate Returns'}
            </button>

            {isFetching && (
                <div>
                    <div className="bg-gray-200 rounded-full h-4 mb-2">
                        <div
                            className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                        Fetching {currentFund}... ({progress}%)
                    </p>
                </div>
            )}

            {/* Show Fund Metadata Panel after data is fetched */}
            {alignmentMetadata && <FundMetadataPanel metadata={alignmentMetadata} />}
        </div>
    )
}
