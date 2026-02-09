import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROCESSED_DIR = path.join(__dirname, '../../data/processed');
const MANUAL_DIR = path.join(__dirname, '../../data/manual');

const API_KEY = process.env.FRED_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!API_KEY) {
    console.error('❌ Error: FRED_API_KEY is missing.');
    process.exit(1);
}

const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// --- Mappings ---

const US_FRED_MAPPINGS = {
    repoRate: 'FEDFUNDS',
    gdpNominal: 'GDP',
    gdpIndex: 'GDPC1',
    debtToGDP: 'GFDEGDQ188S',
    pceIndex: 'PCEPI',
    cpiIndex: 'CPIAUCSL',
    interest_expense: 'A091RC1Q027SBEA',
    gSecYield: 'DGS10',
    sp500: 'SP500',
    goldPrice: 'GOLDAMGBD228NLBM',
    vix: 'VIXCLS',
    m2Money: 'M2SL'
};

const IN_FRED_MAPPINGS = {
    repoRate: 'IRSTCB01INM156N',
    cpiIndex: 'INDCPIALLMINMEI',
    wpiIndex: 'WPIATT01INM661N',
    nominalGDP: 'MKTGDPINA646NWDB',
    realGDP: 'NGDPRNSAXDCINQ',
    gdpGrowth: 'INDGDPRQPSMEI',
    gSecYield: 'INDIRLTLT01STM',
    forexReserves: 'TRESEGINM052N',
    inrUsd: 'DEXINUS',
    bankCredit: 'CRDQINAPABIS',
    nifty: 'STXINDINM',
    debtToGDP: 'GGGDTAINA188N',
    m3Money: 'MABMM301INM189N',
    industrialProd: 'INDPROINMMEI'
};

// --- Helper Functions ---

const fetchJSON = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
};

const fetchFredSeries = async (seriesId) => {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${API_KEY}&file_type=json&sort_order=desc&limit=24`;
    try {
        const data = await fetchJSON(url);
        return data.observations.map(obs => ({
            date: obs.date,
            value: parseFloat(obs.value)
        })).filter(obs => !isNaN(obs.value));
    } catch (e) {
        console.warn(`   ⚠️ Failed to fetch ${seriesId}: ${e.message}`);
        return [];
    }
};

const loadOverrides = (region) => {
    const filePath = path.join(MANUAL_DIR, `${region.toLowerCase()}Overrides.json`);
    try {
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return data.indicators || {};
        }
    } catch (e) {
        console.warn(`⚠️ No overrides for ${region}`);
    }
    return {};
};

// --- Execution Logic ---

async function syncRegion(region, mappings, outputFile) {
    console.log(`\n🌍 Syncing ${region} Macro Data...`);
    const existingData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    const overrides = loadOverrides(region);

    // 1. Fetch all series in parallel
    const keys = Object.keys(mappings);
    const results = await Promise.all(keys.map(k => fetchFredSeries(mappings[k])));

    const historyMap = {};
    keys.forEach((k, i) => { historyMap[k] = results[i]; });

    // 2. Merge into local Dataset
    let newData = [...existingData];

    const getRow = (dateStr) => {
        const yyyyMm = dateStr.substring(0, 7);
        let row = newData.find(r => r.date === yyyyMm);
        if (!row) {
            row = { ...newData[newData.length - 1], date: yyyyMm, valDate: dateStr };
            newData.push(row);
        }
        return row;
    };

    Object.entries(historyMap).forEach(([key, observations]) => {
        observations.forEach(obs => {
            const row = getRow(obs.date);
            let val = obs.value;
            // India Forex normalization
            if (region === 'IN' && key === 'forexReserves') val = Number((val / 1000).toFixed(2));

            row[key] = val;
            if (!row.valDate || new Date(obs.date) > new Date(row.valDate)) row.valDate = obs.date;
        });
    });

    newData.sort((a, b) => a.date.localeCompare(b.date));

    // 3. Derived Metrics (Recalculate Tip)
    for (let i = newData.length - 12; i < newData.length; i++) {
        if (i < 12) continue;
        const cur = newData[i];
        const prev12 = newData[i - 12];

        // Shared Logic: Inflation
        if (cur.cpiIndex && prev12.cpiIndex) {
            cur.cpiInflation = Number((((cur.cpiIndex / prev12.cpiIndex) - 1) * 100).toFixed(2));
        }

        // India Specific: Real Rate & GDP
        if (region === 'IN') {
            cur.realRate = Number(((cur.repoRate || 0) - (cur.cpiInflation || 0)).toFixed(2));
            if (cur.realGDP && prev12.realGDP) {
                cur.gdpGrowth = Number((((cur.realGDP / prev12.realGDP) - 1) * 100).toFixed(2));
            }
        }
        // US Specific: Real Rate & GDP Growth from Index
        else {
            cur.realRate = Number(((cur.repoRate || 0) - (cur.cpiInflation || 0)).toFixed(2));
            if (cur.gdpIndex && prev12.gdpIndex) {
                cur.gdpGrowth = Number((((cur.gdpIndex / prev12.gdpIndex) - 1) * 100).toFixed(2));
            }
            // Debt Stress for US
            const nominal = cur.gdpNominal || (cur.gdpIndex ? cur.gdpIndex * 1.5 : null);
            if (cur.interest_expense && nominal) {
                cur.debtStress = Number(((cur.interest_expense / nominal) * 100).toFixed(2));
            }
        }
    }

    // 4. Apply Manual Overrides to the tip
    if (Object.keys(overrides).length > 0) {
        const lastRow = newData[newData.length - 1];
        Object.entries(overrides).forEach(([key, detail]) => {
            if (detail.value !== undefined) {
                lastRow[key] = detail.value;
                console.log(`   🎯 Override: ${key} = ${detail.value}`);
            }
        });
    }

    // 5. Save Locally
    fs.writeFileSync(outputFile, JSON.stringify(newData, null, 2));
    console.log(`   ✅ Saved to ${path.basename(outputFile)}`);

    // 6. Supabase Sync (Latest row)
    if (supabase) {
        const lastRow = newData[newData.length - 1];
        const { error } = await supabase
            .from('macro_data')
            .upsert({
                id: region === 'US' ? 'us_macro' : 'india_macro',
                data: newData, // We sync the whole file for client-side processing convenience
                last_updated: new Date().toISOString()
            }, { onConflict: 'id' });

        if (error) console.error(`   ❌ Supabase push failed: ${error.message}`);
        else console.log(`   ✅ Synced to Supabase Cloud Cache.`);
    }

    return newData;
}

async function run() {
    console.log('🤖 Starting Global Macro Data Automation Sync...');

    await syncRegion('US', US_FRED_MAPPINGS, path.join(PROCESSED_DIR, 'usMacroHistorical.json'));
    await syncRegion('IN', IN_FRED_MAPPINGS, path.join(PROCESSED_DIR, 'indiaMacroHistorical.json'));

    console.log('\n✨ Global Macro Sync Complete!');
}

run().catch(err => {
    console.error('❌ Sync Error:', err);
    process.exit(1);
});
