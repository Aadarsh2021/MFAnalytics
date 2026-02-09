const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DATA_DIR = 'c:/Users/thaku/Desktop/Work/MFP/data/temp_extracted/Data For Model';
const OUTPUT_FILE = 'c:/Users/thaku/Desktop/Work/MFP/data/processed/usMacroHistorical.json';

const files = {
    debt_to_gdp: 'FED DEBT to GDP.csv',
    fed_funds: 'FED FUNDS EFFECTIVE RATE.csv',
    pce: 'PCEPI.csv',
    gdp: 'Real GDP Raw Data.csv',
    sp500: 'S&P 500 Historical Data.csv',
    inflation_vol: 'US CPI Inflation Volatility.csv',
    interest_expense: 'US FED Interest Expenses Data.csv',
    real_policy_rate: 'USD Real Policy Rate- 1.csv',
    bond_yield: 'United States 10-Year Bond Yield Historical Data.csv',
    gold_wgc: 'GDT-Tables_Q325_EN.xlsx'
};

function parseDate(dateStr) {
    if (!dateStr) return null;
    let d;
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts[0].length === 4) { // YYYY-MM-DD
            d = new Date(parts[0], parts[1] - 1, parts[2]);
        } else { // DD-MM-YYYY
            d = new Date(parts[2], parts[1] - 1, parts[0]);
        }
    } else if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        // Assume MM/DD/YYYY from Investing.com csvs (S&P 500 etc)
        d = new Date(parts[2], parts[0] - 1, parts[1]);
    }
    return d;
}

function processCSV(filePath, colMappings) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const cols = lines[i].split(',');
        const row = {};
        header.forEach((h, idx) => {
            const cleanV = cols[idx] ? cols[idx].trim().replace(/"/g, '') : '';
            row[h] = cleanV;
        });

        const date = parseDate(row['observation_date'] || row['Date']);
        if (date && !isNaN(date)) {
            const processedRow = { date: date.toISOString().split('T')[0] };
            Object.entries(colMappings).forEach(([key, colName]) => {
                let v = row[colName];
                if (v && v.includes('%')) v = parseFloat(v.replace('%', '')) / 100;
                else if (v && v.includes(',')) v = parseFloat(v.replace(/,/g, ''));
                else v = parseFloat(v);
                processedRow[key] = v;
            });
            data.push(processedRow);
        }
    }
    return data;
}

function extractGoldPurchases(filePath) {
    console.log(`🔍 Extracting Gold from: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Gold Balance'] || workbook.Sheets[workbook.SheetNames.find(n => n.includes('Balance'))];
    if (!sheet) {
        console.log('❌ Could not find Gold Balance sheet.');
        return [];
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const years = rows[1];
    const quarters = rows[2];

    // Find "Central bank" row
    const dataRow = rows.find(r => r && r[0] && typeof r[0] === 'string' &&
        (r[0].toLowerCase().includes('central bank') || r[0].toLowerCase().includes('net purchases')));

    if (!dataRow) {
        console.log('❌ Could not find Central Bank row.');
        return [];
    }
    console.log(`✅ Found Gold Row: "${dataRow[0].substring(0, 40)}"`);

    const series = [];
    let currentYear = null;
    for (let i = 1; i < dataRow.length; i++) {
        const yVal = years[i];
        if (yVal && (typeof yVal === 'number' || (typeof yVal === 'string' && yVal.match(/^\d{4}$/)))) {
            currentYear = parseInt(yVal);
        }

        const q = quarters[i];
        const val = dataRow[i];

        if (currentYear && q && typeof q === 'string' && q.startsWith('Q')) {
            const qNum = parseInt(q.substring(1));
            // Add 3 months
            for (let m = 0; m < 3; m++) {
                const month = (qNum - 1) * 3 + m + 1;
                const d = new Date(currentYear, month - 1, 1);
                series.push({
                    date: d.toISOString().split('T')[0],
                    cbGoldBuying: val / 3
                });
            }
        }
    }
    return series;
}

async function run() {
    console.log('🔄 Starting Enhanced US Macro consolidation...');
    const combinedData = {};

    const sources = [
        { file: files.fed_funds, mapping: { repoRate: 'FEDFUNDS', cpiIndex: 'CPIAUCSL' } },
        { file: files.debt_to_gdp, mapping: { debtToGDP: 'GFDEGDQ188S' } },
        { file: files.pce, mapping: { pceIndex: 'PCEPI' } },
        { file: files.gdp, mapping: { gdpIndex: 'GDPC1' } },
        { file: files.sp500, mapping: { sp500: 'Price' } },
        { file: files.inflation_vol, mapping: { volatilityRatio: 'CPI_VOL' } },
        { file: files.interest_expense, mapping: { interest_expense: 'FED_INT_EXP' } },
        { file: files.real_policy_rate, mapping: { realRateProvided: 'REAL_RATE' } },
        { file: files.bond_yield, mapping: { gSecYield: 'Price' } }
    ];

    for (const source of sources) {
        try {
            const data = processCSV(path.join(DATA_DIR, source.file), source.mapping);
            data.forEach(row => {
                if (!combinedData[row.date]) combinedData[row.date] = { date: row.date };
                Object.assign(combinedData[row.date], row);
            });
        } catch (e) {
            console.error(`❌ Error processing ${source.file}:`, e.message);
        }
    }

    // Add Gold Purchases
    try {
        const goldData = extractGoldPurchases(path.join(DATA_DIR, files.gold_wgc));
        if (goldData.length > 0) {
            goldData.forEach(row => {
                if (!combinedData[row.date]) combinedData[row.date] = { date: row.date };
                combinedData[row.date].cbGoldBuying = row.cbGoldBuying;
            });
            console.log(`✅ Extracted ${goldData.length} gold data points.`);
        }
    } catch (e) {
        console.error('❌ Error extracting gold data:', e.message);
    }

    const sortedDates = Object.keys(combinedData).sort();
    let result = sortedDates.map(d => ({ ...combinedData[d] }));

    // Forward-fill missing values
    const allIndicators = ['repoRate', 'cpiIndex', 'debtToGDP', 'pceIndex', 'gdpIndex', 'sp500', 'volatilityRatio', 'interest_expense', 'realRateProvided', 'gSecYield', 'cbGoldBuying'];
    for (let i = 1; i < result.length; i++) {
        allIndicators.forEach(ind => {
            if (result[i][ind] === undefined || isNaN(result[i][ind])) {
                result[i][ind] = result[i - 1][ind];
            }
        });
    }

    // Calculate YoY Changes
    for (let i = 12; i < result.length; i++) {
        if (result[i].cpiIndex && result[i - 12].cpiIndex) {
            result[i].cpiInflation = ((result[i].cpiIndex / result[i - 12].cpiIndex) - 1) * 100;
        } else {
            result[i].cpiInflation = 0;
        }

        if (result[i].gdpIndex && result[i - 12].gdpIndex) {
            result[i].gdpGrowth = ((result[i].gdpIndex / result[i - 12].gdpIndex) - 1) * 100;
        } else {
            result[i].gdpGrowth = 0;
        }
    }

    // SP500 realized vol for Pillar 6
    for (let i = 12; i < result.length; i++) {
        const window = result.slice(i - 12 + 1, i + 1);
        const returns = [];
        for (let j = 1; j < window.length; j++) {
            if (window[j].sp500 && window[j - 1].sp500) {
                returns.push(Math.log(window[j].sp500 / window[j - 1].sp500));
            }
        }
        if (returns.length > 0) {
            const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
            const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
            result[i].volatility = Math.sqrt(variance) * Math.sqrt(12);
        }
    }

    result.forEach(d => {
        d.realRate = (d.repoRate || 0) - (d.cpiInflation || 0);
        d.debtStress = (d.interest_expense || 3.0);
        if (d.cbGoldBuying === undefined) d.cbGoldBuying = 0;
    });

    result = result.filter(d => new Date(d.date).getFullYear() >= 2001);

    const outDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`🚀 Successfully updated ${OUTPUT_FILE} with ${result.length} months.`);
}

run();
