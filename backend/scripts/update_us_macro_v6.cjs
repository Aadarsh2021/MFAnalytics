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
    if (typeof dateStr === 'number') return new Date((dateStr - 25569) * 86400 * 1000);
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
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
        header.forEach((h, idx) => { row[h] = cols[idx] ? cols[idx].trim().replace(/"/g, '') : ''; });
        const date = parseDate(row['observation_date'] || row['Date']);
        if (date && !isNaN(date)) {
            // Normalize to monthKey (YYYY-MM)
            const monthKey = date.toISOString().substring(0, 7);
            const processedRow = { date: monthKey, actualDate: date.toISOString().split('T')[0] };
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

function extractGold(filePath) {
    const workbook = XLSX.readFile(filePath);
    const res = { purchases: [], prices: [] };
    const balSheet = workbook.Sheets['Gold Balance'];
    if (balSheet) {
        const rows = XLSX.utils.sheet_to_json(balSheet, { header: 1 });
        const years = rows[1], quarters = rows[2];
        const dataRow = rows.find(r => r && r[0] && typeof r[0] === 'string' && r[0].toLowerCase().includes('central bank'));
        if (dataRow) {
            let curY = null;
            for (let i = 1; i < dataRow.length; i++) {
                if (years[i] && (typeof years[i] === 'number' || years[i].toString().match(/^\d{4}$/))) curY = parseInt(years[i]);
                if (curY && quarters[i] && quarters[i].toString().startsWith('Q')) {
                    const q = parseInt(quarters[i].substring(1));
                    for (let m = 0; m < 3; m++) {
                        const d = new Date(curY, (q - 1) * 3 + m, 1);
                        res.purchases.push({ date: d.toISOString().substring(0, 7), cbGoldBuying: dataRow[i] / 3 });
                    }
                }
            }
        }
    }
    const prcSheet = workbook.Sheets['Gold Prices'];
    if (prcSheet) {
        const range = XLSX.utils.decode_range(prcSheet['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            const dCell = prcSheet[XLSX.utils.encode_cell({ r: R, c: 0 })], vCell = prcSheet[XLSX.utils.encode_cell({ r: R, c: 1 })];
            if (dCell && vCell && dCell.t === 'n' && vCell.t === 'n') {
                const date = parseDate(dCell.v);
                if (date) res.prices.push({ date: date.toISOString().substring(0, 7), goldPrice: vCell.v });
            }
        }
    }
    return res;
}

async function run() {
    console.log('🔄 Starting v6 Consolidation (Aggregated Monthly)...');
    const monthlyMap = {};

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

    for (const s of sources) {
        try {
            const data = processCSV(path.join(DATA_DIR, s.file), s.mapping);
            data.forEach(r => {
                if (!monthlyMap[r.date]) monthlyMap[r.date] = { date: r.date + "-01" };
                // Strategy: Last observation of the month Wins (since data is sorted ascending usually)
                Object.assign(monthlyMap[r.date], r);
            });
        } catch (e) { }
    }

    const gold = extractGold(path.join(DATA_DIR, files.gold_wgc));
    console.log(`✅ Extracted ${gold.purchases.length} purchases and ${gold.prices.length} price points.`);

    gold.purchases.forEach(r => { if (monthlyMap[r.date]) monthlyMap[r.date].cbGoldBuying = r.cbGoldBuying; });
    gold.prices.forEach(r => { if (monthlyMap[r.date]) monthlyMap[r.date].goldPrice = r.goldPrice; });

    const sortedMonths = Object.keys(monthlyMap).sort();
    let result = sortedMonths.map(m => {
        const row = monthlyMap[m];
        delete row.actualDate; // Remove temp field
        return row;
    });

    const indicators = ['repoRate', 'cpiIndex', 'debtToGDP', 'pceIndex', 'gdpIndex', 'sp500', 'interest_expense', 'gSecYield', 'cbGoldBuying', 'goldPrice'];
    for (let i = 1; i < result.length; i++) {
        indicators.forEach(ind => { if (result[i][ind] === undefined || isNaN(result[i][ind])) result[i][ind] = result[i - 1][ind]; });
    }

    for (let i = 12; i < result.length; i++) {
        if (result[i].cpiIndex && result[i - 12].cpiIndex) result[i].cpiInflation = ((result[i].cpiIndex / result[i - 12].cpiIndex) - 1) * 100;
        if (result[i].gdpIndex && result[i - 12].gdpIndex) result[i].gdpGrowth = ((result[i].gdpIndex / result[i - 12].gdpIndex) - 1) * 100;

        // Volatility Calculation (12-month trailing)
        const window = result.slice(i - 12 + 1, i + 1);
        const rets = [];
        for (let j = 1; j < window.length; j++) if (window[j].sp500 && window[j - 1].sp500) rets.push(Math.log(window[j].sp500 / window[j - 1].sp500));
        if (rets.length > 0) {
            const m = rets.reduce((a, b) => a + b, 0) / rets.length;
            const v = rets.reduce((s, x) => s + Math.pow(x - m, 2), 0) / rets.length;
            result[i].volatility = Math.sqrt(v) * Math.sqrt(12);
        }
    }

    result.forEach(d => {
        d.realRate = (d.repoRate || 0) - (d.cpiInflation || 0);
        d.debtStress = (d.interest_expense || 3.0);
        d.cbGoldBuying = d.cbGoldBuying || 0;
    });

    result = result.filter(d => new Date(d.date).getFullYear() >= 2001);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`🚀 Final: ${result.length} months in ${OUTPUT_FILE}`);
}
run();
