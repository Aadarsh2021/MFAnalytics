import { useState } from 'react'
import { Search, X, CheckCircle } from 'lucide-react'

export default function Step1SearchFunds({
    selectedFunds,
    setSelectedFunds,
    searchResults,
    setSearchResults,
    showMessage,
    goToStep
}) {
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearching, setIsSearching] = useState(false)

    const searchFunds = async () => {
        if (!searchQuery.trim()) {
            showMessage('error', 'Please enter a fund name')
            return
        }

        setIsSearching(true)
        try {
            const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(searchQuery)}`)
            const data = await res.json()

            if (!data || data.length === 0) {
                showMessage('error', 'No funds found')
            } else {
                setSearchResults(data)
                showMessage('success', `Found ${data.length} funds`)
            }
        } catch (e) {
            showMessage('error', 'Search failed: ' + e.message)
        } finally {
            setIsSearching(false)
        }
    }

    const toggleFund = (code, name) => {
        const idx = selectedFunds.findIndex(f => f.code === code)
        if (idx >= 0) {
            setSelectedFunds(selectedFunds.filter((_, i) => i !== idx))
        } else {
            setSelectedFunds([...selectedFunds, { code, name }])
        }
    }

    const clearAll = () => {
        setSelectedFunds([])
    }

    const proceedToStep2 = () => {
        if (selectedFunds.length < 2) {
            showMessage('error', 'Please select at least 2 funds')
            return
        }
        goToStep(2)
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') searchFunds()
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
                🔍 Step 1: Search & Select Mutual Funds
            </h2>

            {/* Search Box */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Search Mutual Funds</label>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="e.g., HDFC, SBI, Axis..."
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <button
                        onClick={searchFunds}
                        disabled={isSearching}
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSearching ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Search size={20} />
                        )}
                        Search
                    </button>
                </div>
            </div>

            {/* Selected Funds */}
            {selectedFunds.length > 0 && (
                <div className="mb-6">
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                        <div className="flex justify-between mb-3">
                            <h3 className="font-semibold text-blue-900">
                                📋 Selected: {selectedFunds.length} funds
                            </h3>
                            <button
                                onClick={clearAll}
                                className="text-sm text-blue-700 underline hover:text-blue-900"
                            >
                                Clear All
                            </button>
                        </div>
                        <div className="space-y-2 mb-3">
                            {selectedFunds.map((f, i) => (
                                <div key={f.code} className="flex justify-between bg-white p-3 rounded-lg border border-blue-200">
                                    <span className="text-sm font-medium">{i + 1}. {f.name}</span>
                                    <button
                                        onClick={() => toggleFund(f.code, f.name)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={proceedToStep2}
                            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
                        >
                            <CheckCircle size={20} />
                            Proceed to Fetch Data (Step 2) →
                        </button>
                    </div>
                </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-3">
                        Results ({searchResults.length})
                    </h3>
                    <div className="max-h-96 overflow-y-auto space-y-3">
                        {searchResults.map((fund) => {
                            const isSelected = selectedFunds.some(f => f.code === fund.schemeCode)
                            return (
                                <div
                                    key={fund.schemeCode}
                                    onClick={() => toggleFund(fund.schemeCode, fund.schemeName)}
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${isSelected
                                            ? 'bg-green-50 border-green-300'
                                            : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{fund.schemeName}</p>
                                            <p className="text-xs text-gray-500">Code: {fund.schemeCode}</p>
                                        </div>
                                        <span className="text-2xl">{isSelected ? '✓' : '+'}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
