
import { fetchWithCache } from './apiOptimized'

// FRED API Key (Public key from existing python script)
const FRED_API_KEY = '5e1b06fcd9ed77b5a46c643fd982a485'

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
    REPO_PROXY: 'INTDSRINM193N'
}

/**
 * Fetch latest observation from FRED
 */
async function fetchFredSeries(seriesId) {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=13` // Fetch 13 months to calculate YoY if needed
    const encodedUrl = encodeURIComponent(url)
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodedUrl}`

    try {
        const response = await fetchWithCache(proxyUrl)
        if (response.observations && response.observations.length > 0) {
            return response.observations.map(obs => ({
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
    console.log('🔄 Fetching live Indian data with priority system...')

    // Load manual overrides first
    const manualOverrides = await loadManualOverrides()

    try {
        // Fetch key indicators in parallel
        const keys = Object.keys(SERIES)
        const results = await Promise.all(keys.map(k => fetchFredSeries(SERIES[k])))

        const liveMap = {}
        keys.forEach((k, i) => {
            if (results[i] && results[i].length > 0) {
                liveMap[k] = results[i][0] // Latest
                liveMap[`${k}_HISTORY`] = results[i] // For YoY
            }
        })

        if (!liveMap.CPI || !liveMap.INR_USD) {
            console.log('⚠️ Essential live data missing, using static.')
            return staticData
        }

        const lastStatic = staticData[staticData.length - 1]
        const lastStaticDate = new Date(lastStatic.date)
        const liveDate = new Date(liveMap.CPI.date)

        if (liveDate > lastStaticDate) {
            console.log(`✅ New data found! ${liveMap.CPI.date} vs ${lastStatic.date}`)

            const updatedLast = { ...lastStatic, date: liveMap.CPI.date }

            if (liveMap.INR_USD) updatedLast.inrUsd = liveMap.INR_USD.value
            if (liveMap.GSEC) updatedLast.gSecYield = liveMap.GSEC.value
            if (liveMap.FOREX) updatedLast.forexReserves = Number((liveMap.FOREX.value / 1000).toFixed(2))
            if (liveMap.BANK_CREDIT) updatedLast.bankCredit = liveMap.BANK_CREDIT.value

            // YoY Calculations
            if (liveMap.CPI_HISTORY && liveMap.CPI_HISTORY.length >= 12) {
                const cur = liveMap.CPI_HISTORY[0].value
                const old = liveMap.CPI_HISTORY[12].value
                updatedLast.cpiInflation = Number((((cur / old) - 1) * 100).toFixed(2))
            }

            if (liveMap.WPI_HISTORY && liveMap.WPI_HISTORY.length >= 12) {
                const cur = liveMap.WPI_HISTORY[0].value
                const old = liveMap.WPI_HISTORY[12].value
                updatedLast.wpiInflation = Number((((cur / old) - 1) * 100).toFixed(2))
            }

            if (liveMap.REAL_GDP_HISTORY && liveMap.REAL_GDP_HISTORY.length >= 4) { // Quarterly data
                const cur = liveMap.REAL_GDP_HISTORY[0].value
                const old = liveMap.REAL_GDP_HISTORY[1].value // 1 quarter ago? Or 4 quarters ago for YoY?
                // For true YoY on quarterly data:
                const oldYoY = liveMap.REAL_GDP_HISTORY.find(o => {
                    const d1 = new Date(liveMap.REAL_GDP_HISTORY[0].date)
                    const d2 = new Date(o.date)
                    return (d1.getFullYear() - d2.getFullYear() === 1) && (d1.getMonth() === d2.getMonth())
                })
                if (oldYoY) {
                    updatedLast.gdpGrowth = Number((((cur / oldYoY.value) - 1) * 100).toFixed(2))
                }
            }

            updatedLast.realRate = Number((updatedLast.repoRate - updatedLast.cpiInflation).toFixed(2))

            // Apply manual overrides (highest priority)
            if (Object.keys(manualOverrides).length > 0) {
                console.log('🎯 Applying manual overrides to live data...')

                if (manualOverrides.wpi) {
                    updatedLast.wpiIndex = manualOverrides.wpi.index
                    updatedLast.wpiInflation = manualOverrides.wpi.inflation
                    console.log(`   ✅ WPI: ${manualOverrides.wpi.inflation}% (${manualOverrides.wpi.source})`)
                }

                if (manualOverrides.cpi) {
                    updatedLast.cpiIndex = manualOverrides.cpi.index
                    updatedLast.cpiInflation = manualOverrides.cpi.inflation
                    updatedLast.realRate = Number((updatedLast.repoRate - manualOverrides.cpi.inflation).toFixed(2))
                    console.log(`   ✅ CPI: ${manualOverrides.cpi.inflation}% (${manualOverrides.cpi.source})`)
                }

                if (manualOverrides.repoRate) {
                    updatedLast.repoRate = manualOverrides.repoRate.value
                    updatedLast.realRate = Number((manualOverrides.repoRate.value - updatedLast.cpiInflation).toFixed(2))
                    console.log(`   ✅ Repo: ${manualOverrides.repoRate.value}% (${manualOverrides.repoRate.source})`)
                }
            }

            const newData = [...staticData]
            newData[newData.length - 1] = updatedLast
            return newData
        }
    } catch (e) {
        console.error('Live fetch error:', e)
    }
    return staticData
}

function calculateYoY(currentIndex, history, field) {
    // Placeholder. Implementing full YoY logic is complex without full history index.
    // For now returning last known rate.
    return 0
}
