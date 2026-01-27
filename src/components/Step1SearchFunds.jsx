import { useState, useEffect } from 'react'
import { Search, X, CheckCircle, Upload } from 'lucide-react'
import DataFeeder from './DataFeeder'
import FundCategoryPanel from './FundCategoryPanel'
import AdvancedFundFilter from './AdvancedFundFilter'
import { supabase } from '../utils/supabase'
import { categorizeFundImproved, getCategoryColor, mapSEBICategoryToSimple } from '../utils/fundCategorization'




export default function Step1SearchFunds({
    selectedFunds,
    setSelectedFunds,
    searchResults,
    setSearchResults,
    showMessage,
    goToStep
}) {
    const [rawResults, setRawResults] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [fundDetails, setFundDetails] = useState({})

    // Master list cache (module level variable to persist across re-renders in session)
    // We'll use a local state for the component to trigger re-renders if needed, 
    // but the data is large so we might want to keep it outside if valid. 
    // For React best practices, let's keep it in a ref or just simple state if not too huge.
    // 45k items is manageable in JS memory.

    const [masterLoading, setMasterLoading] = useState(false)
    const [allFunds, setAllFunds] = useState([])

    // Fetch full master list on mount
    useEffect(() => {
        const fetchMasterList = async () => {
            // Check if we already have data in a global variable (simple cache)
            if (window.mfMasterList && window.mfMasterList.length > 0) {
                setAllFunds(window.mfMasterList)
                return
            }

            setMasterLoading(true)
            try {
                const res = await fetch('https://api.mfapi.in/mf')
                const data = await res.json()
                if (Array.isArray(data)) {
                    window.mfMasterList = data // Cache globally
                    setAllFunds(data)
                    // console.log("Loaded", data.length, "funds")
                }
            } catch (e) {
                console.error("Failed to load fund master list", e)
                showMessage('error', 'Could not load fund database. Search may be limited.')
            } finally {
                setMasterLoading(false)
            }
        }

        fetchMasterList()
    }, [])

    const searchFunds = () => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) {
            showMessage('error', 'Please enter a fund name')
            return
        }

        setIsSearching(true)

        // Local Search Logic
        setTimeout(() => {
            try {
                if (allFunds.length === 0) {
                    // Fallback to API if master list failed
                    fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(searchQuery)}`)
                        .then(res => res.json())
                        .then(data => {
                            if (!data || data.length === 0) {
                                showMessage('error', 'No funds found (API)')
                                setRawResults([])
                            } else {
                                setRawResults(data)
                            }
                        })
                        .catch(e => showMessage('error', 'Search failed: ' + e.message))
                        .finally(() => setIsSearching(false))
                    return
                }

                // Client-side filtering
                const terms = query.split(/\s+/).filter(t => t.length > 0)

                const matches = allFunds.filter(fund => {
                    const name = fund.schemeName.toLowerCase()
                    // Check if ALL terms are present in the name
                    return terms.every(term => name.includes(term))
                })

                // Limit results for performance
                const limitedResults = matches.slice(0, 100)

                if (limitedResults.length === 0) {
                    showMessage('error', 'No funds found matching all terms')
                    setRawResults([])
                } else {
                    setRawResults(limitedResults)
                    if (matches.length > 100) {
                        showMessage('success', `Found ${matches.length} matches. Showing top 100.`)
                    }
                }
            } catch (e) {
                console.error("Search error", e)
                setRawResults([])
            } finally {
                setIsSearching(false)
            }
        }, 10) // Small timeout to allow UI to update spinner
    }

    const updateFundAUM = (code, value) => {
        const val = value === '' ? '' : parseFloat(value);
        setSelectedFunds(prev => prev.map(f => f.code === code ? { ...f, marketCap: val } : f));
    }

    const toggleFund = async (code, name) => {
        const idx = selectedFunds.findIndex(f => f.code === code)
        if (idx >= 0) {
            setSelectedFunds(selectedFunds.filter((_, i) => i !== idx))
        } else {
            // Check Database for Market Cap
            let dbMarketCap = ''
            try {
                const { data } = await supabase
                    .from('fund_master')
                    .select('aum')
                    .eq('scheme_code', code)
                    .maybeSingle()

                if (data && data.aum) {
                    // Ensure market cap is a valid string representation
                    dbMarketCap = String(data.aum).trim()
                    console.log(`Auto-filled Market Cap for ${code}: ${dbMarketCap}`)
                } else {
                    console.log(`No Market Cap data in DB for ${code}`)
                }
            } catch (e) {
                console.error("Failed to check DB for Market Cap", e)
            }

            // Initialize with Market Cap from DB if available
            const newFund = {
                code,
                name,
                marketCap: dbMarketCap,
                nav: null,
                navDate: null,
                sebiCategory: null,
                category: null
            }

            // Add to selection first
            const newSelection = [...selectedFunds, newFund]
            setSelectedFunds(newSelection)

            // Fetch extra details (NAV + Inception + SEBI Category)
            try {
                const res = await fetch(`https://api.mfapi.in/mf/${code}`)
                const data = await res.json()

                if (data.data && data.data.length > 0) {
                    const latest = data.data[0]
                    const inception = data.data[data.data.length - 1].date

                    // Get SEBI category from meta
                    const sebiCategory = data.meta?.scheme_category || 'Not Available'

                    // Map to simple category using improved utility
                    const simpleCategory = mapSEBICategoryToSimple(sebiCategory, name);

                    // Update the fund in the list with fetched details
                    setSelectedFunds(prev => prev.map(f =>
                        f.code === code
                            ? {
                                ...f,
                                nav: latest.nav,
                                navDate: latest.date,
                                sebiCategory: sebiCategory,
                                category: simpleCategory
                            }
                            : f
                    ))

                    setFundDetails(prev => ({ ...prev, [code]: inception }))

                    console.log(`Fetched category for ${code}: ${sebiCategory} → ${simpleCategory}`)
                }
            } catch (e) {
                console.error("Failed to fetch details for", code)
            }
        }
    }

    const clearAll = () => {
        setSelectedFunds([])
        setFundDetails({})
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
                        {masterLoading ? 'Loading DB...' : 'Search'}
                    </button>
                </div>
            </div>

            {/* Advanced Filter Component */}
            <div className="mb-6">
                <AdvancedFundFilter
                    allFunds={rawResults}
                    onFilteredResults={setSearchResults}
                    searchQuery={searchQuery}
                />
            </div>

            {/* Two Column Layout: Results (Left) + Selected Funds (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Search Results */}
                {searchResults.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-gray-800">
                            📊 Results ({searchResults.length})
                        </h3>
                        <div className="max-h-[600px] overflow-y-auto space-y-3 border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                            {searchResults.map((fund) => {
                                const isSelected = selectedFunds.some(f => f.code === fund.schemeCode)
                                return (
                                    <div
                                        key={fund.schemeCode}
                                        onClick={() => toggleFund(fund.schemeCode, fund.schemeName)}
                                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${isSelected
                                            ? 'bg-green-50 border-green-400 shadow-md'
                                            : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-medium text-sm text-gray-800">{fund.schemeName}</p>
                                                <p className="text-xs text-gray-500 mt-1">Code: {fund.schemeCode}</p>
                                            </div>
                                            <span className={`text-2xl ${isSelected ? 'text-green-600' : 'text-blue-600'}`}>
                                                {isSelected ? '✓' : '+'}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}


                {/* Right Column - Selected Funds */}
                {selectedFunds.length > 0 && (
                    <div>
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
                                <div className="space-y-4 mb-3">
                                    {selectedFunds.map((f, i) => (
                                        <div key={f.code} className="flex flex-col bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <span className="text-sm font-semibold text-gray-800">{i + 1}. {f.name}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">Code: {f.code}</span>
                                                        {f.category ? (
                                                            <span
                                                                className={`text-[10px] px-2 py-0.5 ${getCategoryColor(f.category).badge} text-white rounded font-bold cursor-help`}
                                                                title={f.sebiCategory || 'SEBI Category'}
                                                            >
                                                                {f.category}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] px-2 py-0.5 bg-gray-400 text-white rounded font-bold animate-pulse">
                                                                Loading...
                                                            </span>
                                                        )}
                                                        {fundDetails[f.code] ? (
                                                            <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded font-bold border border-green-200">
                                                                Starts: {fundDetails[f.code]}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded animate-pulse">
                                                                Checking info...
                                                            </span>
                                                        )}
                                                    </div>
                                                    {f.nav && (
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                                NAV: ₹{f.nav}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">
                                                                ({f.navDate})
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => toggleFund(f.code, f.name)}
                                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                                    title="Remove Fund"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>

                                            {/* Market Cap Input for Black-Litterman */}
                                            <div className="mt-2 flex items-center gap-2">
                                                <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
                                                    Market Cap (₹ Cr):
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="Required for Market Cap Weights"
                                                    value={f.marketCap || ''}
                                                    onChange={(e) => updateFundAUM(f.code, e.target.value)}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-gray-400"
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-1 italic">
                                                * Enter Market Capitalization for market cap-based weights. Leave empty to default to Equal Weight.
                                            </p>
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
                    </div>
                )}
            </div>

            {/* Fund Category Analysis Panel */}
            {selectedFunds.length > 0 && (
                <div className="mt-6">
                    <FundCategoryPanel selectedFunds={selectedFunds} />
                </div>
            )}
        </div>
    )
}
