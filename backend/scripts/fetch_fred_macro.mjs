import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import https from 'https';

// --- Configuration ---
const DATA_DIR = path.join(process.cwd(), 'data');
const PROCESSED_DIR = path.join(DATA_DIR, 'processed');
const RAW_DIR = path.join(DATA_DIR, 'temp_extracted/Data For Model');
const OUTPUT_FILE = path.join(PROCESSED_DIR, 'usMacroHistorical.json');

// Mappings: Internal Key -> FRED Series ID
const FRED_MAPPINGS = {
    repoRate: 'FEDFUNDS',             // Federal Funds Effective Rate
    gdpIndex: 'GDPC1',                // Real Gross Domestic Product
    debtToGDP: 'GFDEGDQ188S',         // Federal Debt: Total Public Debt as % of GDP
    pceIndex: 'PCEPI',                // Personal Consumption Expenditures: Chain-type Price Index
    cpiIndex: 'CPIAUCSL',             // Consumer Price Index for All Urban Consumers: All Items
    interest_expense: 'A091RC1Q027SBEA', // Federal government current expenditures: Interest payments
    gSecYield: 'DGS10',               // Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity
    sp500: 'SP500',                   // S&P 500
    // Real Rate & Volatility calculated derived
};

// API Key - Passed via environment variable or command line
const API_KEY = process.env.FRED_API_KEY || process.argv[2];

if (!API_KEY) {
    console.error('❌ Error: FRED_API_KEY is missing.');
    console.error('   Usage: node backend/scripts/fetch_fred_macro.mjs <YOUR_API_KEY>');
    process.exit(1);
}

// --- Helper Functions ---

// Simple fetch wrapper using native fetch (Node 18+) or https fallback
const fetchJSON = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        // Fallback for older Node versions if fetch is not global
        if (error.message.includes('fetch is not defined')) {
            return new Promise((resolve, reject) => {
                https.get(url, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => resolve(JSON.parse(data)));
                }).on('error', reject);
            });
        }
        throw error;
    }
};

const fetchSeries = async (seriesId) => {
    console.log(`📡 Fetching ${seriesId}...`);
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${API_KEY}&file_type=json`;
    try {
        const data = await fetchJSON(url);
        return data.observations.map(obs => ({
            date: obs.date,
            value: parseFloat(obs.value)
        })).filter(obs => !isNaN(obs.value));
    } catch (e) {
        console.error(`   ⚠️ Failed to fetch ${seriesId}: ${e.message}`);
        return [];
    }
};

// Ported from update_us_macro_v9.cjs
function parseWGCHeader(h) {
    if (!h || typeof h !== 'string') return null;
    if (h.match(/^Q\d'\d{2}$/)) {
        const q = parseInt(h.substring(1, 2));
        const yShort = h.substring(3);
        const y = parseInt(yShort) < 50 ? 2000 + parseInt(yShort) : 1900 + parseInt(yShort);
        return { year: y, quarter: q };
    }
    // Also handle formats like "Q1 2025" if they change
    return null;
}

function extractGold(dir) {
    // Find the latest GDT Excel file
    let files = [];
    try {
        if (fs.existsSync(dir)) {
            files = fs.readdirSync(dir).filter(f => f.includes('GDT') && f.endsWith('.xlsx'));
        }
    } catch (e) { console.log('⚠️ Could not list GDT files'); }

    if (files.length === 0) {
        console.log('⚠️ No GDT/Gold Excel file found. Skipping Gold data.');
        return { purchases: [], prices: [] };
    }

    // Sort to get the likely latest one (by name or time? for now assume name sort works if they use Q numbers)
    // Actually, update_us_macro_v9 hardcoded a specific file. We should try to be smarter or pick the same one.
    // Let's pick the one with the highest quarter/year in name if possible.
    const latestFile = files.sort().pop();
    const fp = path.join(dir, latestFile);
    console.log(`Assuming Gold File: ${latestFile}`);

    const wb = XLSX.readFile(fp);
    const res = { purchases: [], prices: [] };

    // Extract Balance (Purchases)
    const balName = wb.SheetNames.find(n => n.includes('Balance'));
    if (balName) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[balName], { header: 1 });
        const headers = rows[1];
        const dRow = rows.find(r => r && r[0] && typeof r[0] === 'string' && r[0].toLowerCase().includes('central bank'));
        if (headers && dRow) {
            headers.forEach((h, i) => {
                const p = parseWGCHeader(h);
                if (p && dRow[i] !== undefined) {
                    for (let m = 0; m < 3; m++) {
                        const d = new Date(p.year, (p.quarter - 1) * 3 + m, 1);
                        // Convert to YYYY-MM
                        const dateStr = d.toISOString().substring(0, 7);
                        res.purchases.push({ date: dateStr, val: dRow[i] / 3 }); // Annual/Quarterly to monthly average? Logic check: Code said /3 so implied quarterly to monthly
                    }
                }
            });
        }
    }

    // Extract Price (if needed as fallback to FRED, but we have Gold Price? No, GDT script extracts Gold Price too)
    // Actually FRED doesn't have daily gold price easily (GOLDAMGBD228NLBM is London AM Fix?). 
    // The previous script used 'Prices' sheet. We should keep it.
    const prcName = wb.SheetNames.find(n => n.includes('Price'));
    if (prcName) {
        const s = wb.Sheets[prcName];
        const rows = XLSX.utils.sheet_to_json(s, { header: 1 });
        const headers = rows[1], dRow = rows[2];
        if (headers && dRow) {
            headers.forEach((h, i) => {
                const p = parseWGCHeader(h);
                if (p && dRow[i] !== undefined) {
                    const d = new Date(p.year, (p.quarter - 1) * 3, 1);
                    res.prices.push({ date: d.toISOString().substring(0, 7), val: dRow[i] });
                }
            });
        }
    }
    return res;
}

// --- Main Execution ---

async function run() {
    console.log('🚀 Starting FRED Macro Data Fetch...');

    const combinedData = {}; // Key: YYYY-MM

    // 1. Fetch FRED Data
    for (const [key, seriesId] of Object.entries(FRED_MAPPINGS)) {
        const obsList = await fetchSeries(seriesId);

        obsList.forEach(obs => {
            const dateParams = new Date(obs.date);
            const yyyyMm = obs.date.substring(0, 7); // YYYY-MM

            if (!combinedData[yyyyMm]) {
                combinedData[yyyyMm] = {
                    date: yyyyMm,
                    valDate: obs.date
                };
            }

            // Handle monthly aggregation for daily data (e.g. SP500, DGS10)
            // Just take the last available value for the month? Or average?
            // Existing logic seemed to take the last one or mapped row-by-row.
            // For simplicity and robustness, let's take the LAST value of the month.
            // But FRED "observations" API sums daily data? No, it lists all dates.
            // We need to overwrite with latest date for that month.

            // Check if we already have a value for this month
            // If this observation is later in the month than what we have, update.
            const existing = combinedData[yyyyMm][key];
            // Since FRED returns chronological, the last one we see for a month IS the latest.
            combinedData[yyyyMm][key] = obs.value;
            // Update valDate to latest
            if (dateParams > new Date(combinedData[yyyyMm].valDate)) {
                combinedData[yyyyMm].valDate = obs.date;
            }
        });
    }

    // 2. Extract Gold Data (Manual File)
    const goldData = extractGold(RAW_DIR);
    console.log(`✨ Extracted Gold Data: ${goldData.purchases.length} points`);

    goldData.purchases.forEach(p => {
        if (!combinedData[p.date]) combinedData[p.date] = { date: p.date, valDate: `${p.date}-01` };
        combinedData[p.date].cbGoldBuying = p.val;
    });
    goldData.prices.forEach(p => {
        if (!combinedData[p.date]) combinedData[p.date] = { date: p.date, valDate: `${p.date}-01` };
        combinedData[p.date].goldPrice = p.val;
    });

    // 3. Processing & Calculations
    const sortedDates = Object.keys(combinedData).sort();
    let result = sortedDates.map(d => combinedData[d]);

    // Forward fill missing values (gaps in daily data or missing months)
    const keys = Object.keys(FRED_MAPPINGS).concat(['cbGoldBuying', 'goldPrice']);
    for (let i = 1; i < result.length; i++) {
        keys.forEach(k => {
            if (result[i][k] === undefined || result[i][k] === null) {
                result[i][k] = result[i - 1][k];
            }
        });
    }

    // Derived Metrics
    for (let i = 12; i < result.length; i++) {
        // YoY Calculations
        if (result[i].cpiIndex && result[i - 12].cpiIndex) {
            result[i].cpiInflation = ((result[i].cpiIndex / result[i - 12].cpiIndex) - 1) * 100;
        }
        if (result[i].gdpIndex && result[i - 12].gdpIndex) {
            result[i].gdpGrowth = ((result[i].gdpIndex / result[i - 12].gdpIndex) - 1) * 100;
        }

        // Inflation Volatility (12m rolling std dev of monthly changes)
        // Monthly change
        const monthlyChanges = [];
        for (let j = i - 11; j <= i; j++) {
            if (result[j].cpiIndex && result[j - 1].cpiIndex) {
                monthlyChanges.push((result[j].cpiIndex / result[j - 1].cpiIndex) - 1);
            }
        }
        if (monthlyChanges.length > 2) {
            const mean = monthlyChanges.reduce((a, b) => a + b, 0) / monthlyChanges.length;
            const variance = monthlyChanges.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / (monthlyChanges.length - 1);
            result[i].inflationVol = Math.sqrt(variance) * Math.sqrt(12) * 100;
        }

        // S&P 500 Volatility (Proxy if daily not available fully, use monthly change proxy)
        // FRED 'SP500' is daily. Fetch returns daily.
        // But our 'result' array is monthly. 
        // We lost daily granularity in step 1. 
        // For accurate Vol, we might need a separate daily pass or just use monthly approximation.
        // Existing script used `Math.log(window[j].sp500 / window[j - 1].sp500)` on monthly data?
        // Let's stick to simple monthly derivation to match existing v9 logic approximately.
        const spRets = [];
        for (let j = i - 11; j <= i; j++) {
            if (result[j].sp500 && result[j - 1].sp500) {
                spRets.push(Math.log(result[j].sp500 / result[j - 1].sp500));
            }
        }
        if (spRets.length > 2) {
            const m = spRets.reduce((a, b) => a + b, 0) / spRets.length;
            const v = spRets.reduce((s, x) => s + Math.pow(x - m, 2), 0) / (spRets.length - 1);
            result[i].volatility = Math.sqrt(v) * Math.sqrt(12); // Annualized ? v9 didn't *100? v9: `Math.sqrt(v) * Math.sqrt(12)` -> It IS annualized volatility (decimal)
        }
    }

    // Final Derived Columns
    result.forEach(d => {
        d.repoRate = d.repoRate || 0;
        d.cpiInflation = d.cpiInflation || 0;

        // Real Rate
        d.realRate = d.repoRate - d.cpiInflation;

        // Debt Stress: Interest / (GDP * 1.5) approx
        // Note: Interest is "Billions of Dollars", GDP is "Billions of Chained 2012 Dollars" (Real).
        // Should use Nominal GDP for ratio? GDPC1 is Real.
        // GDP (Nominal) is 'GDP'. We fetched 'GDPC1' (Real).
        // Ratio usually uses Nominal.
        // Let's check FRED mapping again. 'GFDEGDQ188S' is Debt to GDP ratio itself.
        // We fetched 'debtToGDP'. So we can use that directly?
        // v9 script calculated `d.debtStress` manually.
        // v9: `d.debtStress = (d.interest_expense / (d.gdpIndex * 1.5)) * 100 || 3.0;`
        // It used gdpIndex (Real GDP). Let's stick to that for consistency, or improve?
        // Keeping consistency with v9 logic.
        d.debtStress = (d.interest_expense / ((d.gdpIndex || 1) * 1.5)) * 100 || 3.0;

        // Volatility Ratio
        d.volatilityRatio = d.inflationVol ? (d.inflationVol / 2.0) : 1.0;
    });

    // Filter > 2001
    result = result.filter(d => parseInt(d.date.substring(0, 4)) >= 2001);

    // Save
    if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`\\n✅ Successfully updated ${OUTPUT_FILE}`);
    console.log(`   Total Entries: ${result.length}`);
    if (result.length > 0) {
        const last = result[result.length - 1];
        console.log(`   Latest Date: ${last.date}`);
        console.log(`   Repo Rate: ${last.repoRate}%`);
        console.log(`   CPI Inflation: ${last.cpiInflation.toFixed(2)}%`);
        console.log(`   Real Rate: ${last.realRate.toFixed(2)}%`);
    }
}

run();
