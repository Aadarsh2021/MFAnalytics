const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DATA_DIR = 'c:/Users/thaku/Desktop/Work/MFP/Data_For_Model';
const OUTPUT_FILE = 'c:/Users/thaku/Desktop/Work/MFP/src/data/usMacroHistorical.json';

const files = {
    debt_to_gdp: 'FED DEBT to GDP.csv',
    fed_funds: 'FED FUNDS EFFECTIVE RATE.csv', // Also has CPI
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
        // S&P format is MM/DD/YYYY
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
    // Prices sheet: Row 5 has headers (Q1'10 etc), Row 6 has US$/oz
    const headers = rows[4];
    const prices = rows[5];

    const data = [];
    headers.forEach((h, idx) => {
        if (h && typeof h === 'string' && h.includes("'")) {
            // Format Q1'10
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

    // Process all sources
    const sources = [
        { file: files.fed_funds, mapping: { realRate: 'FEDFUNDS', inflationExpectations: 'CPIAUCSL' } },
        { file: files.debt_to_gdp, mapping: { debtStress: 'GFDEGDQ188S' } },
        { file: files.pce, mapping: { growth: 'PCEPI' } },
        { file: files.gdp, mapping: { growth: 'GDPC1' } },
        { file: files.sp500, mapping: { sp500: 'Price' } },
        { file: files.inflation_vol, mapping: { volatilityRatio: 'CPI_VOL' } },
        { file: files.interest_expense, mapping: { interest_expense: 'FED_INT_EXP' } },
        { file: files.real_policy_rate, mapping: { realRate: 'REAL_RATE' } },
        { file: files.bond_yield, mapping: { bond_yield: 'Price' } }
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

    // Process Gold
    try {
        const goldData = extractGoldData(path.join(DATA_DIR, files.gold_excel));
        goldData.forEach(row => {
            if (!combinedData[row.date]) combinedData[row.date] = { date: row.date };
            combinedData[row.date].gold = row.gold;
        });
    } catch (e) {
        console.error('Error processing Gold:', e.message);
    }

    // Sort by date
    const sortedDates = Object.keys(combinedData).sort();
    // Forward-fill missing values for monthly alignment
    const indicators = Object.keys(sources.reduce((acc, s) => ({ ...acc, ...s.mapping }), {}));
    sortedDates.forEach((date, idx) => {
        if (idx === 0) return;
        indicators.forEach(ind => {
            if (combinedData[date][ind] === undefined || isNaN(combinedData[date][ind])) {
                combinedData[date][ind] = combinedData[sortedDates[idx - 1]][ind];
            }
        });
    });

    // Calculate Changes for level-based indicators
    const result = sortedDates.map(d => combinedData[d]);
    for (let i = 1; i < result.length; i++) {
        if (result[i].growth && result[i - 1].growth) {
            result[i].growth_change = (result[i].growth / result[i - 1].growth) - 1;
        }
        if (result[i].inflationExpectations && result[i - 1].inflationExpectations) {
            result[i].inflation_change = (result[i].inflationExpectations / result[i - 1].inflationExpectations) - 1;
        }
    }
    // Remap back to original keys for detector
    result.forEach(d => {
        if (d.growth_change !== undefined) d.growth = d.growth_change;
        if (d.inflation_change !== undefined) d.inflationExpectations = d.inflation_change;
    });

    // Calculate Realized Volatility from SP500 if missing
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
            const stdDev = Math.sqrt(variance) * Math.sqrt(12); // Annualized
            if (!result[i].volatility) result[i].volatility = stdDev;
        }
    }

    // Ensure output directory exists
    const outDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`Successfully created ${OUTPUT_FILE} with ${result.length} months.`);
}

run();
