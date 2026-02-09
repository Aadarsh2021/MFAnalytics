import fs from 'fs';
import path from 'path';
import https from 'https';
import { config } from 'dotenv';
import { fetchLatestWPI, fetchLatestCPI, isDataRecent } from '../utils/governmentDataFetcher.mjs';

// Load environment variables from .env file
config();

// --- Configuration ---
const DATA_DIR = path.join(process.cwd(), 'data');
const PROCESSED_DIR = path.join(DATA_DIR, 'processed');
const OUTPUT_FILE = path.join(PROCESSED_DIR, 'indiaMacroHistorical.json');

// Mappings: Internal Key -> FRED Series ID (Equipping with full set)
const FRED_MAPPINGS = {
    repoRate: 'IRSTCB01INM156N',      // Central Bank Rate (Direct Repo)
    cpiIndex: 'INDCPIALLMINMEI',      // Consumer Price Index (2015=100)
    wpiIndex: 'WPIATT01INM661N',      // Wholesale Price Index (Monthly)
    nominalGDP: 'MKTGDPINA646NWDB',   // GDP at Market Prices
    realGDP: 'NGDPRNSAXDCINQ',        // Real GDP (Quarterly)
    gdpGrowth: 'INDGDPRQPSMEI',       // GDP Growth Rate (YoY Quarterly)
    gSecYield: 'INDIRLTLT01STM',      // 10Y Government Bond Yield
    forexReserves: 'TRESEGINM052N',   // Foreign Exchange Reserves
    inrUsd: 'DEXINUS',                // INR/USD Exchange Rate
    bankCredit: 'CRDQINAPABIS'        // Total Credit to Private Sector
};

// API Key - Passed via environment variable or command line
const API_KEY = process.env.FRED_API_KEY || process.argv[2];

if (!API_KEY) {
    console.error('❌ Error: FRED_API_KEY is missing.');
    console.error('   Usage: node backend/scripts/fetchIndianMacroData.mjs <YOUR_API_KEY>');
    process.exit(1);
}

// Manual Override File (for latest official data)
const MANUAL_OVERRIDE_FILE = path.join(DATA_DIR, 'manual', 'indiaOverrides.json');

// Load manual overrides if available
function loadManualOverrides() {
    try {
        if (fs.existsSync(MANUAL_OVERRIDE_FILE)) {
            const data = JSON.parse(fs.readFileSync(MANUAL_OVERRIDE_FILE, 'utf-8'));
            console.log('📋 Manual overrides loaded from official sources');
            return data.indicators || {};
        }
    } catch (e) {
        console.warn('⚠️ Could not load manual overrides:', e.message);
    }
    return {};
}

// --- Helper Functions ---

const fetchJSON = async (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse JSON: ${data.substring(0, 100)}...`));
                }
            });
        }).on('error', reject);
    });
};

const fetchSeries = async (seriesId) => {
    console.log(`📡 Fetching ${seriesId}...`);
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${API_KEY}&file_type=json`;
    try {
        const data = await fetchJSON(url);
        if (!data.observations) throw new Error('No observations found');
        return data.observations.map(obs => ({
            date: obs.date,
            value: parseFloat(obs.value)
        })).filter(obs => !isNaN(obs.value));
    } catch (e) {
        console.error(`   ⚠️ Failed to fetch ${seriesId}: ${e.message}`);
        return [];
    }
};

// --- Main Execution ---

async function run() {
    console.log('🚀 Starting Comprehensive Indian Macro Data Alignment...');

    // Try to fetch latest data from government APIs first (automatic)
    let govWPI = null;
    let govCPI = null;

    try {
        console.log('\n🌐 Attempting automatic fetch from Indian government APIs...');
        [govWPI, govCPI] = await Promise.all([
            fetchLatestWPI().catch(() => null),
            fetchLatestCPI().catch(() => null)
        ]);

        if (govWPI || govCPI) {
            console.log('   ✅ Government API data fetched successfully');
        } else {
            console.log('   ℹ️ Government APIs unavailable, using FRED + manual overrides');
        }
    } catch (e) {
        console.log('   ℹ️ Government API fetch skipped:', e.message);
    }

    // Load manual overrides (priority over FRED, but government API has highest priority)
    const manualOverrides = loadManualOverrides();

    const combinedData = {}; // Key: YYYY-MM

    // 1. Fetch FRED Data
    for (const [key, seriesId] of Object.entries(FRED_MAPPINGS)) {
        const obsList = await fetchSeries(seriesId);

        obsList.forEach(obs => {
            const yyyyMm = obs.date.substring(0, 7); // YYYY-MM

            if (!combinedData[yyyyMm]) {
                combinedData[yyyyMm] = {
                    date: obs.date,
                };
            }

            // Standardize: Take last value for the month
            combinedData[yyyyMm][key] = obs.value;
        });
    }

    // 2. Processing & Interpolation
    const sortedDates = Object.keys(combinedData).sort();
    let result = sortedDates.map(d => combinedData[d]);

    // Forward fill missing values (handle quarterly GDP or occasional gaps)
    const indicators = Object.keys(FRED_MAPPINGS);
    indicators.forEach(k => {
        let lastVal = null;
        for (let i = 0; i < result.length; i++) {
            if (result[i][k] !== undefined && result[i][k] !== null) {
                lastVal = result[i][k];
            } else if (lastVal !== null) {
                result[i][k] = lastVal;
            }
        }
    });

    // 3. Derived Metrics (Matching Static Backup Schema)
    for (let i = 12; i < result.length; i++) {
        // CPI Inflation (YoY)
        if (result[i].cpiIndex && result[i - 12].cpiIndex) {
            result[i].cpiInflation = Number((((result[i].cpiIndex / result[i - 12].cpiIndex) - 1) * 100).toFixed(2));
        }

        // WPI Inflation (YoY)
        if (result[i].wpiIndex && result[i - 12].wpiIndex) {
            result[i].wpiInflation = Number((((result[i].wpiIndex / result[i - 12].wpiIndex) - 1) * 100).toFixed(2));
        }

        // GDP Growth (YoY) - Using Real GDP if available
        if (result[i].realGDP && result[i - 12].realGDP) {
            result[i].gdpGrowth = Number((((result[i].realGDP / result[i - 12].realGDP) - 1) * 100).toFixed(2));
        } else if (result[i].nominalGDP && result[i - 12].nominalGDP) {
            result[i].gdpGrowth = Number((((result[i].nominalGDP / result[i - 12].nominalGDP) - 1) * 100).toFixed(2));
        }

        // Real Rate
        const currentRepo = result[i].repoRate || 6.5;
        const currentInf = result[i].cpiInflation || 0;
        result[i].realRate = Number((currentRepo - currentInf).toFixed(2));

        // Forex normalization (Trillions/Billions check) - FRED TRESEGINM052N is in Millions of USD
        // Standard dashboard expects Billions
        if (result[i].forexReserves > 1000) {
            result[i].forexReserves = Number((result[i].forexReserves / 1000).toFixed(2));
        }
    }

    // 4. Apply Manual Overrides (Priority over FRED for latest data)
    if (Object.keys(manualOverrides).length > 0) {
        console.log('\n🔄 Applying manual overrides from official sources...');

        // Apply WPI override
        if (manualOverrides.wpi && manualOverrides.wpi.date) {
            const wpiDate = manualOverrides.wpi.date.substring(0, 7); // YYYY-MM
            const wpiEntry = result.find(r => r.date.startsWith(wpiDate));
            if (wpiEntry) {
                wpiEntry.wpiIndex = manualOverrides.wpi.index;
                wpiEntry.wpiInflation = manualOverrides.wpi.inflation;
                console.log(`   ✅ WPI updated: ${manualOverrides.wpi.inflation}% (${manualOverrides.wpi.source})`);
            }
        }

        // Apply CPI override
        if (manualOverrides.cpi && manualOverrides.cpi.date) {
            const cpiDate = manualOverrides.cpi.date.substring(0, 7);
            const cpiEntry = result.find(r => r.date.startsWith(cpiDate));
            if (cpiEntry) {
                cpiEntry.cpiIndex = manualOverrides.cpi.index;
                cpiEntry.cpiInflation = manualOverrides.cpi.inflation;
                console.log(`   ✅ CPI updated: ${manualOverrides.cpi.inflation}% (${manualOverrides.cpi.source})`);
            }
        }

        // Apply Repo Rate override
        if (manualOverrides.repoRate && manualOverrides.repoRate.date) {
            const repoDate = manualOverrides.repoRate.date.substring(0, 7);
            const repoEntry = result.find(r => r.date.startsWith(repoDate));
            if (repoEntry) {
                repoEntry.repoRate = manualOverrides.repoRate.value;
                // Recalculate real rate
                repoEntry.realRate = Number((repoEntry.repoRate - (repoEntry.cpiInflation || 0)).toFixed(2));
                console.log(`   ✅ Repo Rate updated: ${manualOverrides.repoRate.value}% (${manualOverrides.repoRate.source})`);
            }
        }
    }

    // 5. Apply Government API Data (HIGHEST PRIORITY - most recent official data)
    if (govWPI || govCPI) {
        console.log('\n🏛️ Applying government API data (highest priority)...');

        // Apply Government WPI
        if (govWPI && govWPI.date) {
            const wpiDate = govWPI.date.substring(0, 7);
            const wpiEntry = result.find(r => r.date.startsWith(wpiDate));
            if (wpiEntry) {
                wpiEntry.wpiIndex = govWPI.index;
                wpiEntry.wpiInflation = govWPI.inflation;
                console.log(`   ✅ WPI updated: ${govWPI.inflation}% (data.gov.in - ${govWPI.date})`);
            }
        }

        // Apply Government CPI
        if (govCPI && govCPI.date) {
            const cpiDate = govCPI.date.substring(0, 7);
            const cpiEntry = result.find(r => r.date.startsWith(cpiDate));
            if (cpiEntry) {
                cpiEntry.cpiIndex = govCPI.index;
                cpiEntry.cpiInflation = govCPI.inflation;
                // Recalculate real rate with new CPI
                cpiEntry.realRate = Number((cpiEntry.repoRate - govCPI.inflation).toFixed(2));
                console.log(`   ✅ CPI updated: ${govCPI.inflation}% (data.gov.in - ${govCPI.date})`);
            }
        }
    }

    // Filter to baseline
    result = result.filter(d => parseInt(d.date.substring(0, 4)) >= 2002);

    // Save
    if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`\n✅ Successfully updated ${OUTPUT_FILE}`);
    console.log(`   Total Entries: ${result.length}`);
    if (result.length > 0) {
        const last = result[result.length - 1];
        console.log(`\n📊 Latest Data State:`);
        console.log(`   Date: ${last.date}`);
        console.log(`   CPI Inflation: ${last.cpiInflation !== undefined ? last.cpiInflation : 'N/A'}%`);
        console.log(`   WPI Inflation: ${last.wpiInflation !== undefined ? last.wpiInflation : 'N/A'}%`);
        console.log(`   GDP Growth: ${last.gdpGrowth !== undefined ? last.gdpGrowth : 'N/A'}%`);
        console.log(`   Repo Rate: ${last.repoRate}%`);
        console.log(`   Real Rate: ${last.realRate}%`);
        console.log(`   Forex: $${last.forexReserves}B`);
    }
}

run().catch(err => {
    console.error('❌ Critical Alignment Error:', err);
    process.exit(1);
});
