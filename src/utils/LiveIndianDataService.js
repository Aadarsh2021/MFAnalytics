
import { fetchWithCache, fetchWithProxy } from './apiOptimized'

// FRED API Key (Public key from existing python script)
const FRED_API_KEY = import.meta.env.VITE_FRED_API_KEY

// FRED Series IDs
const SERIES = {
    CPI: 'INDCPIALLMINMEI',
    WPI: 'WPIATT01INM661N', // Monthly, Verified
    GDP: 'MKTGDPINA646NWDB', // Nominal
    REAL_GDP: 'NGDPRNSAXDCINQ', // Quarterly NSA, Verified
    FOREX: 'TRESEGINM052N',
    INR_USD: 'DEXINUS',
    GSEC: 'INDIRLTLT01STM',
    BANK_CREDIT: 'CRDQINAPABIS', // Total Credit
    REPO_PROXY: 'IRSTCB01INM156N', // Direct Central Bank Rate (Repo)
    STOCK_INDEX: 'STXINDINM', // India Stock Index (Nifty Proxy)
    DEBT_TO_GDP: 'GGGDTAINA188N', // General Government Gross Debt (% of GDP)
    MONEY_SUPPLY: 'MABMM301INM189N', // M3 for India
    IND_PROD: 'INDPROINMMEI' // Industrial Production
}

/**
 * Fetch latest observation from FRED
 */
async function fetchFredSeries(seriesId) {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=13`

    try {
        const data = await fetchWithProxy(url);
        if (data.observations && data.observations.length > 0) {
            return data.observations.map(obs => ({
                date: obs.date,
                value: parseFloat(obs.value)
            })).filter(obs => !isNaN(obs.value))
        }
    } catch (e) {
        console.warn(`FRED fetch failed for ${seriesId}`, e)
    }
    return null
}

/**
 * Load manual overrides from JSON file
 */
async function loadManualOverrides() {
    try {
        const response = await fetch('/data/manual/indiaOverrides.json')
        if (response.ok) {
            const data = await response.json()
            console.log('📋 Manual overrides loaded for live data')
            return data.indicators || {}
        }
    } catch (e) {
        console.warn('Manual overrides not available:', e.message)
    }
    return {}
}

/**
 * Get Live Indian Macro Data
 * Now uses 3-tier priority: Manual Override > FRED > Static
 */
export async function getLiveIndianData(staticData) {
    console.log('🔄 Fetching live Indian data with priority system and merge logic...')

    // Load manual overrides first
    const manualOverrides = await loadManualOverrides()

    try {
        // Fetch key indicators in parallel
        const keys = Object.keys(SERIES)
        const results = await Promise.all(keys.map(k => fetchFredSeries(SERIES[k])))

        const liveMap = {}
        const historyMap = {}

        keys.forEach((k, i) => {
            if (results[i] && results[i].length > 0) {
                liveMap[k] = results[i][0] // Latest
                historyMap[k] = results[i] // Full fetched history
            }
        })

        if (!liveMap.CPI || !liveMap.INR_USD) {
            console.log('⚠️ Essential live data missing, using static.')
            return staticData
        }

        // --- Robust Merging Logic (Prevents Overwriting) ---
        let newData = [...staticData]

        // Map FRED keys to our internal keys
        const fredToInternal = {
            'INR_USD': 'inrUsd',
            'GSEC': 'gSecYield',
            'FOREX': 'forexReserves',
            'BANK_CREDIT': 'bankCredit',
            'REPO_PROXY': 'repoRate',
            'STOCK_INDEX': 'nifty', // Primary equity proxy for India
            'GDP': 'nominalGDP',
            'REAL_GDP': 'realGDP', // Add mapping for realGDP
            'WPI': 'wpiIndex', // Add mapping for wpiIndex
            'DEBT_TO_GDP': 'debtToGDP',
            'MONEY_SUPPLY': 'm3Money',
            'IND_PROD': 'industrialProd'
        }

        // Helper to find or create a month row
        const getRow = (dateStr) => {
            const yyyyMm = dateStr.substring(0, 7)
            let row = newData.find(r => r.date === yyyyMm)
            if (!row) {
                // Clone last known row as base to avoid Pillar loss
                row = { ...newData[newData.length - 1], date: yyyyMm, valDate: dateStr }
                newData.push(row)
                console.log(`➕ Added new month: ${yyyyMm}`)
            }
            return row
        }

        // Process all fetched observations for each series
        Object.entries(historyMap).forEach(([fredKey, observations]) => {
            const internalKey = fredToInternal[fredKey]
            if (!internalKey) return

            observations.forEach(obs => {
                const row = getRow(obs.date)
                let val = obs.value

                // Specialized handling
                if (fredKey === 'FOREX') val = Number((val / 1000).toFixed(2))

                if (!isNaN(val)) {
                    row[internalKey] = val
                    // Update valDate if it's the latest for this row
                    if (!row.valDate || new Date(obs.date) > new Date(row.valDate)) {
                        row.valDate = obs.date
                    }
                }
            })
        })

        // Handle CPI and Inflation separately (since it drives dates)
        if (historyMap.CPI) {
            historyMap.CPI.forEach(obs => {
                const row = getRow(obs.date)
                row.cpiIndex = obs.value
            })
        }

        // Re-calculate YoY and Derived metrics for the updated months
        // (Usually handled by processMacroData, but we apply overrides here)

        // Sort by date to ensure continuity
        newData.sort((a, b) => a.date.localeCompare(b.date))

        // Apply manual overrides to the tip
        if (Object.keys(manualOverrides).length > 0) {
            const lastRow = newData[newData.length - 1]
            console.log('🎯 Applying manual overrides to the latest data point...')

            if (manualOverrides.wpi) {
                lastRow.wpiIndex = manualOverrides.wpi.index
                lastRow.wpiInflation = manualOverrides.wpi.inflation
            }
            if (manualOverrides.cpi) {
                lastRow.cpiIndex = manualOverrides.cpi.index
                lastRow.cpiInflation = manualOverrides.cpi.inflation
            }
            if (manualOverrides.repoRate) {
                lastRow.repoRate = manualOverrides.repoRate.value
            }
            if (manualOverrides.inrUsd) {
                lastRow.inrUsd = manualOverrides.inrUsd.value
            }
            if (manualOverrides.forexReserves) {
                lastRow.forexReserves = manualOverrides.forexReserves.value
            }
        }

        return newData

    } catch (e) {
        console.error('Live fetch/merge error:', e)
    }
    return staticData
}

function calculateYoY(currentIndex, history, field) {
    // Placeholder. Implementing full YoY logic is complex without full history index.
    // For now returning last known rate.
    return 0
}
