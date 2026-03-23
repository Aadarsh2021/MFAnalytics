import fs from 'fs';
import path from 'path';

const ROOT = 'c:/Users/thaku/Desktop/Work/MFP';
const JSON_PATH = path.join(ROOT, 'data/processed/usMacroHistorical.json');
const NEW_DATA_DIR = path.join(ROOT, 'data/new data');

function parseCSV(filePath, dateCol, valCol) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const dateIdx = header.indexOf(dateCol);
    const valIdx = header.indexOf(valCol);
    if (dateIdx === -1 || valIdx === -1) return {};

    const results = {};
    const csvRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(csvRegex).map(v => v.replace(/"/g, '').trim());
        if (cols.length <= Math.max(dateIdx, valIdx)) continue;
        let dateStr = cols[dateIdx];
        let val = parseFloat(cols[valIdx].replace(/,/g, ''));
        if (!dateStr || isNaN(val)) continue;

        let yyyy, mm;
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts[0].length === 4) { yyyy = parts[0]; mm = parts[1]; }
            else { yyyy = parts[2]; mm = parts[1]; }
        } else if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            yyyy = parts[2]; mm = parts[0];
        } else if (dateStr.includes('.')) {
            const parts = dateStr.split('.');
            yyyy = parts[2]; mm = parts[1];
        }

        if (yyyy && mm) results[`${yyyy}-${mm.padStart(2, '0')}`] = val;
    }
    return results;
}

// Special parser for extracted Real Rate (Excel Serials)
function parseExtractedRealRate() {
    const filePath = path.join(NEW_DATA_DIR, 'extracted_real_rate.json');
    if (!fs.existsSync(filePath)) return {};
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const results = {};
    data.forEach(row => {
        if (row.observation_date && row['USD Real Policy Rate'] !== undefined) {
            // Excel serial to JS date
            const date = new Date((row.observation_date - 25569) * 86400 * 1000);
            const yyyyMm = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            results[yyyyMm] = row['USD Real Policy Rate'];
        }
    });
    return results;
}

const sp500Data = parseCSV(path.join(NEW_DATA_DIR, 'S&P 500 Historical Data.csv'), 'Date', 'Price');
const yieldData = parseCSV(path.join(NEW_DATA_DIR, 'United States 10-Year Bond Yield Historical Data.csv'), 'Date', 'Price');
const pceData = parseCSV(path.join(NEW_DATA_DIR, 'PCEPI.csv'), 'observation_date', 'PCEPI');
const repoData = parseCSV(path.join(NEW_DATA_DIR, 'FEDFUNDS EFFECTIVE RATE.csv'), 'observation_date', 'FEDFUNDS');
const gdpData = parseCSV(path.join(NEW_DATA_DIR, 'GDPC1.csv'), 'observation_date', 'GDPC1');
const interestData = parseCSV(path.join(NEW_DATA_DIR, 'US FED Interest Expenses data.csv'), 'observation_date', 'A091RC1Q027SBEA');
const realRateData = parseExtractedRealRate();

const entries = [];
let curr = new Date(1990, 0, 1);
const end = new Date(2026, 1, 1);

while (curr <= end) {
    const yyyyMm = `${curr.getFullYear()}-${(curr.getMonth() + 1).toString().padStart(2, '0')}`;
    entries.push({
        date: yyyyMm,
        valDate: `${yyyyMm}-01`,
        sp500: sp500Data[yyyyMm],
        gSecYield: yieldData[yyyyMm],
        pceIndex: pceData[yyyyMm],
        repoRate: repoData[yyyyMm],
        gdpIndex: gdpData[yyyyMm],
        interestExpense: interestData[yyyyMm],
        realRate: realRateData[yyyyMm]
    });
    curr.setMonth(curr.getMonth() + 1);
}

// Forward fill
const keys = ['sp500', 'gSecYield', 'pceIndex', 'repoRate', 'gdpIndex', 'interestExpense', 'realRate'];
for (let i = 0; i < entries.length; i++) {
    keys.forEach(k => {
        if (entries[i][k] === undefined || entries[i][k] === null || isNaN(entries[i][k])) {
            if (i > 0) entries[i][k] = entries[i - 1][k];
        }
    });
}

// Calculate indicators
for (let i = 0; i < entries.length; i++) {
    // 1. Debt Stress
    if (entries[i].interestExpense && entries[i].gdpIndex) {
        entries[i].debtStress = (entries[i].interestExpense / entries[i].gdpIndex) * 100;
    }

    // 2. Inflation Volatility (6m rolling std dev of YoY PCE)
    if (i >= 12) {
        const yoyChanges = [];
        for (let j = i - 12; j <= i; j++) {
            if (entries[j].pceIndex && entries[j - 12]?.pceIndex) {
                yoyChanges.push((entries[j].pceIndex / entries[j - 12].pceIndex) - 1);
            }
        }
        if (yoyChanges.length >= 6) {
            const mean = yoyChanges.reduce((a, b) => a + b, 0) / yoyChanges.length;
            const variance = yoyChanges.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / yoyChanges.length;
            entries[i].inflationVol = Math.sqrt(variance) * 100; // as percent
        }
    }

    // 3. Volatility Ratio (Default to 0.8 as baseline)
    entries[i].volatilityRatio = 0.8;
}

fs.writeFileSync(JSON_PATH, JSON.stringify(entries, null, 2));
console.log(`Final rebuild of ${JSON_PATH} complete.`);
