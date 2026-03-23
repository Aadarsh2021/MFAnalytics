import fs from 'fs';
import path from 'path';

const ROOT = 'c:/Users/thaku/Desktop/Work/MFP';
const JSON_PATH = path.join(ROOT, 'data/processed/usMacroHistorical.json');
const NEW_DATA_DIR = path.join(ROOT, 'data/new data');

function parseCSV(filePath, dateCol, valCol, isDateDDMMYYYY = false) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    const header = lines[0].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[0].split(',');
    const cleanHeader = header.map(h => h.replace(/"/g, '').trim());
    const dateIdx = cleanHeader.indexOf(dateCol);
    const valIdx = cleanHeader.indexOf(valCol);
    const results = {};
    const csvRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(csvRegex).map(v => v.replace(/"/g, '').trim());
        if (cols.length <= Math.max(dateIdx, valIdx)) continue;
        let dateStr = cols[dateIdx];
        let val = parseFloat(cols[valIdx].replace(/,/g, ''));
        if (!dateStr || isNaN(val)) continue;
        let yyyyMm;
        if (isDateDDMMYYYY) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                yyyyMm = parts[0].length === 4 ? `${parts[0]}-${parts[1]}` : `${parts[2]}-${parts[1]}`;
            }
        } else {
            yyyyMm = dateStr.substring(0, 7);
        }
        if (yyyyMm) results[yyyyMm] = val;
    }
    return results;
}

console.log('Final Data Sync starting...');
const sp500Data = parseCSV(path.join(NEW_DATA_DIR, 'S&P 500 Historical Data.csv'), 'Date', 'Price', true);
const yieldData = parseCSV(path.join(NEW_DATA_DIR, 'United States 10-Year Bond Yield Historical Data.csv'), 'Date', 'Price', true);
const pceData = parseCSV(path.join(NEW_DATA_DIR, 'PCEPI.csv'), 'observation_date', 'PCEPI');
const repoData = parseCSV(path.join(NEW_DATA_DIR, 'FEDFUNDS EFFECTIVE RATE.csv'), 'observation_date', 'FEDFUNDS');
const gdpData = parseCSV(path.join(NEW_DATA_DIR, 'GDPC1.csv'), 'observation_date', 'GDPC1');
const debtData = parseCSV(path.join(NEW_DATA_DIR, 'GFDEGDQ188S- FED DEBT TO GDP.csv'), 'observation_date', 'GFDEGDQ188S');

const historical = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const allDates = new Set(historical.map(d => d.date));
[sp500Data, yieldData, pceData, repoData, gdpData, debtData].forEach(d => Object.keys(d).forEach(k => allDates.add(k)));

const sortedDates = Array.from(allDates).sort();
const updated = sortedDates.map(date => {
    let entry = historical.find(d => d.date === date) || { date };
    if (sp500Data[date]) entry.sp500 = sp500Data[date];
    if (yieldData[date]) entry.gSecYield = yieldData[date];
    if (pceData[date]) entry.pceIndex = pceData[date];
    if (repoData[date]) entry.repoRate = repoData[date];
    if (gdpData[date]) entry.gdpIndex = gdpData[date];
    if (debtData[date]) entry.debtToGDP = debtData[date];
    if (!entry.valDate) entry.valDate = `${date}-01`;
    return entry;
});

// ALL KEYS Forward Fill
const allKeys = [...new Set(updated.flatMap(Object.keys))].filter(k => k !== 'date' && k !== 'valDate');
console.log('Forward filling all keys:', allKeys);
for (let i = 1; i < updated.length; i++) {
    allKeys.forEach(key => {
        if (updated[i][key] === undefined || updated[i][key] === null) {
            updated[i][key] = updated[i - 1][key];
        }
    });
}

fs.writeFileSync(JSON_PATH, JSON.stringify(updated, null, 2));
console.log('Sync complete!');
