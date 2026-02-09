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

function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
        } else cur += char;
    }
    result.push(cur.trim());
    return result;
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    if (typeof dateStr === 'number') return new Date((dateStr - 25569) * 86400 * 1000);
    // Handle DD-MM-YYYY or YYYY-MM-DD
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts[0].length === 4) return new Date(dateStr); // YYYY-MM-DD
        return new Date(parts[2], parts[1] - 1, parts[0]); // DD-MM-YYYY
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

function processCSV(filePath, colMappings) {
    if (!fs.existsSync(filePath)) { console.log(`❌ Missing: ${filePath}`); return []; }
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    if (lines.length === 0) return [];
    const header = parseCSVLine(lines[0]);
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const cols = parseCSVLine(lines[i]);
        const row = {};
        header.forEach((h, idx) => { row[h] = cols[idx] || ''; });
        const date = parseDate(row['observation_date'] || row['Date']);
        if (date && !isNaN(date.getTime())) {
            const mKey = date.toISOString().substring(0, 7);
            const pRow = { date: mKey, valDate: date.toISOString().substring(0, 10) };
            Object.entries(colMappings).forEach(([k, vName]) => {
                let v = row[vName];
                if (v && v.includes('%')) v = parseFloat(v.replace('%', '')) / 100;
                else if (v && v.includes(',')) v = parseFloat(v.replace(/,/g, ''));
                else v = parseFloat(v);
                pRow[k] = v;
            });
            data.push(pRow);
        }
    }
    return data;
}

function parseWGCHeader(h) {
    if (!h || typeof h !== 'string') return null;
    if (h.match(/^Q\d'\d{2}$/)) {
        const q = parseInt(h.substring(1, 2));
        const yShort = h.substring(3);
        const y = parseInt(yShort) < 50 ? 2000 + parseInt(yShort) : 1900 + parseInt(yShort);
        return { year: y, quarter: q };
    }
    return null;
}

function extractGold(fp) {
    if (!fs.existsSync(fp)) return { purchases: [], prices: [] };
    const wb = XLSX.readFile(fp);
    const res = { purchases: [], prices: [] };
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
                        res.purchases.push({ date: d.toISOString().substring(0, 7), val: dRow[i] / 3 });
                    }
                }
            });
        }
    }
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

async function run() {
    console.log('🔄 Starting Macro v9 (Robust Parser & Pillar Fix)...');
    const map = {};
    const sources = [
        { file: files.fed_funds, mapping: { repoRate: 'FEDFUNDS', cpiIndex: 'CPIAUCSL' } },
        { file: files.debt_to_gdp, mapping: { debtToGDP: 'GFDEGDQ188S' } },
        { file: files.pce, mapping: { pceIndex: 'PCEPI' } },
        { file: files.gdp, mapping: { gdpIndex: 'GDPC1' } },
        { file: files.sp500, mapping: { sp500: 'Price' } },
        { file: files.interest_expense, mapping: { interest_expense: 'A091RC1Q027SBEA' } },
        { file: files.real_policy_rate, mapping: { realRateProvided: 'REAL_RATE' } },
        { file: files.bond_yield, mapping: { gSecYield: 'Price' } }
    ];

    for (const s of sources) {
        const data = processCSV(path.join(DATA_DIR, s.file), s.mapping);
        data.forEach(r => {
            if (!map[r.date]) map[r.date] = { date: r.date + "-01" };
            Object.assign(map[r.date], r);
        });
    }

    const gold = extractGold(path.join(DATA_DIR, files.gold_wgc));
    console.log(`✅ Gold: ${gold.purchases.length} q-months, ${gold.prices.length} price points.`);
    gold.purchases.forEach(r => { if (map[r.date]) map[r.date].cbGoldBuying = r.val; });
    gold.prices.forEach(r => { if (map[r.date]) map[r.date].goldPrice = r.val; });

    const sorted = Object.keys(map).sort();
    let res = sorted.map(m => map[m]);

    const inds = ['repoRate', 'cpiIndex', 'debtToGDP', 'pceIndex', 'gdpIndex', 'sp500', 'interest_expense', 'gSecYield', 'cbGoldBuying', 'goldPrice'];
    for (let i = 1; i < res.length; i++) {
        inds.forEach(ind => { if (res[i][ind] === undefined || isNaN(res[i][ind])) res[i][ind] = res[i - 1][ind]; });
    }

    for (let i = 12; i < res.length; i++) {
        if (res[i].cpiIndex && res[i - 12].cpiIndex) res[i].cpiInflation = ((res[i].cpiIndex / res[i - 12].cpiIndex) - 1) * 100;
        if (res[i].gdpIndex && res[i - 12].gdpIndex) res[i].gdpGrowth = ((res[i].gdpIndex / res[i - 12].gdpIndex) - 1) * 100;

        // Pillar 5: Inflation Volatility (12m rolling std of monthly inflation)
        const win = res.slice(Math.max(0, i - 11), i + 1);
        const infs = [];
        for (let j = 1; j < win.length; j++) {
            if (win[j].cpiIndex && win[j - 1].cpiIndex) infs.push((win[j].cpiIndex / win[j - 1].cpiIndex) - 1);
        }
        if (infs.length > 2) {
            const m = infs.reduce((a, b) => a + b, 0) / infs.length;
            const v = infs.reduce((s, x) => s + Math.pow(x - m, 2), 0) / (infs.length - 1);
            res[i].inflationVol = Math.sqrt(v) * Math.sqrt(12) * 100; // Annualized %
        }

        // Pillar 6 (Part): S&P 500 Volatility for Vol Ratio
        const rets = [];
        for (let j = 1; j < win.length; j++) if (win[j].sp500 && win[j - 1].sp500) rets.push(Math.log(win[j].sp500 / win[j - 1].sp500));
        if (rets.length > 2) {
            const m = rets.reduce((a, b) => a + b, 0) / rets.length;
            const v = rets.reduce((s, x) => s + Math.pow(x - m, 2), 0) / (rets.length - 1);
            res[i].volatility = Math.sqrt(v) * Math.sqrt(12);
        }
    }

    // Final Pillar 6: Volatility Ratio (CPI Vol / GDP Vol - or similar repression signature)
    // Actually, following the PDF logic: Vol Ratio > 1.0 is the signal. 
    // If GDP vol isn't available, we use Equity Vol as a proxy for market distress vs inflation vol.
    res.forEach(d => {
        d.realRate = (d.repoRate || 0) - (d.cpiInflation || 0);
        d.debtStress = (d.interest_expense / (d.gdpIndex * 1.5)) * 100 || 3.0; // interest/nominalGDP proxy
        d.cbGoldBuying = d.cbGoldBuying || 0;
        d.volatilityRatio = d.inflationVol ? (d.inflationVol / 2.0) : 1.0; // Signal proxy
    });

    res = res.filter(d => new Date(d.date).getFullYear() >= 2001);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(res, null, 2));
    console.log(`🚀 Done: ${res.length} months in ${OUTPUT_FILE}`);
}
run();
