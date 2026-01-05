import { Download, RotateCcw } from 'lucide-react'
import { downloadReport } from '../utils/export.js'

export default function Step6FinalReport({
    returns,
    allData,
    mvpResults,
    blResult,
    showMessage
}) {
    const handleDownload = (method) => {
        try {
            downloadReport(method, returns, allData, mvpResults, blResult)
            showMessage('success', `Downloaded ${method.toUpperCase()} portfolio weights!`)
        } catch (e) {
            showMessage('error', 'Download failed: ' + e.message)
        }
    }

    const startOver = () => {
        if (window.confirm('Start a new analysis? This will clear all current data.')) {
            window.location.reload()
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
                📄 Step 6: Final Report & Download
            </h2>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-green-900 mb-4">✅ Analysis Complete!</h3>
                <p className="text-green-800 mb-4">
                    All optimizations have been calculated. Choose your preferred method:
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                        onClick={() => handleDownload('sqp')}
                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
                    >
                        <Download size={18} />
                        SQP
                    </button>
                    <button
                        onClick={() => handleDownload('convex')}
                        className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
                    >
                        <Download size={18} />
                        Convex
                    </button>
                    <button
                        onClick={() => handleDownload('critical')}
                        className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex items-center justify-center gap-2"
                    >
                        <Download size={18} />
                        Critical
                    </button>
                    <button
                        onClick={() => handleDownload('blacklitterman')}
                        className="px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-semibold flex items-center justify-center gap-2"
                    >
                        <Download size={18} />
                        Black-Litterman
                    </button>
                </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">📊 Method Comparison</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="px-4 py-2 text-left">Fund</th>
                                <th className="px-4 py-2 text-center">SQP</th>
                                <th className="px-4 py-2 text-center">Convex</th>
                                <th className="px-4 py-2 text-center">Critical</th>
                                <th className="px-4 py-2 text-center">Black-Litterman</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {returns.codes.map((code, i) => (
                                <tr key={code} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm">
                                        {allData[code].name.substring(0, 30)}...
                                    </td>
                                    <td className="px-4 py-2 text-center font-bold text-blue-600">
                                        {(mvpResults.sqp.weights[i] * 100).toFixed(2)}%
                                    </td>
                                    <td className="px-4 py-2 text-center font-bold text-green-600">
                                        {(mvpResults.convex.weights[i] * 100).toFixed(2)}%
                                    </td>
                                    <td className="px-4 py-2 text-center font-bold text-purple-600">
                                        {(mvpResults.critical.weights[i] * 100).toFixed(2)}%
                                    </td>
                                    <td className="px-4 py-2 text-center font-bold text-pink-600">
                                        {(blResult.weights[i] * 100).toFixed(2)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <button
                onClick={startOver}
                className="w-full px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-semibold flex items-center justify-center gap-2"
            >
                <RotateCcw size={20} />
                Start New Analysis
            </button>
        </div>
    )
}
