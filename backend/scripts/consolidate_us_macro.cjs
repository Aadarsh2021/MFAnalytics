const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DATA_DIR = 'c:/Users/thaku/Desktop/Work/MFP/data/raw/us-macro';
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
    gold_excel: 'GDT Tables_Q424_EN.xlsx'
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
        d = new Date(parts[2], parts[0] - 1, parts[1]);
    }
    return d;
}

function processCSV(filePath, colMappings) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const header = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const cols = lines[i].split(',');
        const row = {};
        header.forEach((h, idx) => {
            const cleanH = h.trim().replace(/"/g, '');
            const cleanV = cols[idx] ? cols[idx].trim().replace(/"/g, '') : '';
            row[cleanH] = cleanV;
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

function extractGoldData(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Prices'];
    if (!sheet) return [];

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const headers = rows[4];
    const prices = rows[5];

    const data = [];
    headers.forEach((h, idx) => {
        if (h && typeof h === 'string' && h.includes("'")) {
            const quarter = h.substring(1, 2);
            const year = parseInt('20' + h.substring(3));
            const month = (parseInt(quarter) - 1) * 3 + 1;
            const date = new Date(year, month - 1, 1);
            const price = typeof prices[idx] === 'number' ? prices[idx] : parseFloat(prices[idx]);
            if (!isNaN(price)) {
                data.push({ date: date.toISOString().split('T')[0], gold: price });
            }
        }
    });
    return data;
}

async function run() {
    console.log('Starting US Macro consolidation...');
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
            console.error(`Error processing ${source.file}:`, e.message);
        }
    }

    const sortedDates = Object.keys(combinedData).sort();
    const result = sortedDates.map(d => ({ ...combinedData[d] }));

    // Forward-fill missing values
    const allIndicators = Object.keys(sources.reduce((acc, s) => ({ ...acc, ...s.mapping }), {}));
    for (let i = 1; i < result.length; i++) {
        allIndicators.forEach(ind => {
            if (result[i][ind] === undefined || isNaN(result[i][ind])) {
                result[i][ind] = result[i - 1][ind];
            }
        });
    }

    // Calculate YoY Changes (12-month window)
    for (let i = 12; i < result.length; i++) {
        // Inflation from CPI index (Annualized YoY %)
        if (result[i].cpiIndex && result[i - 12].cpiIndex) {
            result[i].cpiInflation = ((result[i].cpiIndex / result[i - 12].cpiIndex) - 1) * 100;
        } else {
            result[i].cpiInflation = 0;
        }

        // GDP Growth from GDP index (Annualized YoY %)
        if (result[i].gdpIndex && result[i - 12].gdpIndex) {
            result[i].gdpGrowth = ((result[i].gdpIndex / result[i - 12].gdpIndex) - 1) * 100;
        } else {
            result[i].gdpGrowth = 0;
        }
    }

    // Set defaults and calculate real rate
    result.forEach(d => {
        if (d.cpiInflation === undefined) d.cpiInflation = 0;
        if (d.gdpGrowth === undefined) d.gdpGrowth = 0;
        d.realRate = (d.repoRate || 0) - d.cpiInflation;
    });

    // Calculate SP500 realized vol
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
            result[i].volatility = Math.sqrt(variance) * Math.sqrt(12) * 100; // Annualized %
        }
    }

    const outDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`Successfully created ${OUTPUT_FILE} with ${result.length} months.`);

    if (result.length > 0) {
        const latest = result[result.length - 1];
        console.log(`Latest Corrected (${latest.date}):`);
        console.log(`  Fed Funds: ${latest.repoRate}%`);
        console.log(`  Inflation (YoY): ${latest.cpiInflation.toFixed(2)}%`);
        console.log(`  Real Rate: ${latest.realRate.toFixed(2)}%`);
        console.log(`  GDP Growth (YoY): ${latest.gdpGrowth.toFixed(2)}%`);
    }
}

run();
