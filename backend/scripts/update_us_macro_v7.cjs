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
    if (!fs.existsSync(filePath)) { console.log(`❌ File missing: ${filePath}`); return []; }
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
            const mKey = date.toISOString().substring(0, 7);
            const pRow = { date: mKey, valDate: date.toISOString().split('T')[0] };
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

function extractGold(fp) {
    console.log(`🔍 Opening: ${fp}`);
    if (!fs.existsSync(fp)) { console.log('❌ Gold file missing!'); return { purchases: [], prices: [] }; }
    const wb = XLSX.readFile(fp);
    const res = { purchases: [], prices: [] };

    // Sheets for Q325 might be different. Let's list.
    // console.log('Sheets found:', wb.SheetNames);

    const balName = wb.SheetNames.find(n => n.includes('Balance'));
    const prcName = wb.SheetNames.find(n => n.includes('Price'));

    if (balName) {
        console.log(`🔍 Using Balance Sheet: ${balName}`);
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[balName], { header: 1 });
        // Years are usually Row 1
        const years = rows[1];
        const quarters = rows[2];
        const dRow = rows.find(r => r && r[0] && typeof r[0] === 'string' && r[0].toLowerCase().includes('central bank'));
        if (dRow) {
            console.log(`✅ Found Central Bank Row at ${rows.indexOf(dRow)}`);
            let curY = null;
            for (let i = 1; i < dRow.length; i++) {
                if (years[i] && (typeof years[i] === 'number' || years[i].toString().match(/^\d{4}$/))) curY = parseInt(years[i]);
                if (curY && quarters[i] && quarters[i].toString().startsWith('Q')) {
                    const qn = parseInt(quarters[i].substring(1));
                    for (let m = 0; m < 3; m++) {
                        const d = new Date(curY, (qn - 1) * 3 + m, 1);
                        res.purchases.push({ date: d.toISOString().substring(0, 7), val: dRow[i] / 3 });
                    }
                }
            }
        }
    }

    if (prcName) {
        console.log(`🔍 Using Price Sheet: ${prcName}`);
        const s = wb.Sheets[prcName];
        const range = XLSX.utils.decode_range(s['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            const dc = s[XLSX.utils.encode_cell({ r: R, c: 0 })], vc = s[XLSX.utils.encode_cell({ r: R, c: 1 })];
            if (dc && vc && dc.t === 'n' && vc.t === 'n') {
                const date = parseDate(dc.v);
                if (date) res.prices.push({ date: date.toISOString().substring(0, 7), val: vc.v });
            }
        }
    }
    return res;
}

async function run() {
    const map = {};
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
        const fp = path.join(DATA_DIR, s.file);
        const data = processCSV(fp, s.mapping);
        data.forEach(r => {
            if (!map[r.date]) map[r.date] = { date: r.date + "-01", valDate: r.valDate };
            Object.assign(map[r.date], r);
        });
    }

    const gold = extractGold(path.join(DATA_DIR, files.gold_wgc));
    console.log(`✅ Extracted ${gold.purchases.length} purchases and ${gold.prices.length} prices.`);

    gold.purchases.forEach(r => { if (map[r.date]) map[r.date].cbGoldBuying = r.val; });
    gold.prices.forEach(r => { if (map[r.date]) map[r.date].goldPrice = r.val; });

    const sorted = Object.keys(map).sort();
    let res = sorted.map(m => map[m]);

    const inds = ['repoRate', 'cpiIndex', 'debtToGDP', 'pceIndex', 'gdpIndex', 'sp500', 'interest_expense', 'gSecYield', 'cbGoldBuying', 'goldPrice'];
    for (let i = 1; i < res.length; i++) {
        inds.forEach(ind => {
            if (res[i][ind] === undefined || isNaN(res[i][ind]) || res[i][ind] === null) {
                res[i][ind] = res[i - 1][ind];
            }
        });
    }

    for (let i = 12; i < res.length; i++) {
        if (res[i].cpiIndex && res[i - 12].cpiIndex) res[i].cpiInflation = ((res[i].cpiIndex / res[i - 12].cpiIndex) - 1) * 100;
        if (res[i].gdpIndex && res[i - 12].gdpIndex) res[i].gdpGrowth = ((res[i].gdpIndex / res[i - 12].gdpIndex) - 1) * 100;

        const win = res.slice(Math.max(0, i - 11), i + 1);
        const rets = [];
        for (let j = 1; j < win.length; j++) if (win[j].sp500 && win[j - 1].sp500) rets.push(Math.log(win[j].sp500 / win[j - 1].sp500));
        if (rets.length > 0) {
            const m = rets.reduce((a, b) => a + b, 0) / rets.length;
            const v = rets.reduce((s, x) => s + Math.pow(x - m, 2), 0) / (rets.length > 1 ? rets.length - 1 : 1);
            res[i].volatility = Math.sqrt(v) * Math.sqrt(12);
        }
    }

    res.forEach(d => {
        d.realRate = (d.repoRate || 0) - (d.cpiInflation || 0);
        d.debtStress = (d.interest_expense || 3.0);
        d.cbGoldBuying = d.cbGoldBuying || 0;
        delete d.valDate; // Cleanup
    });

    res = res.filter(d => new Date(d.date).getFullYear() >= 2001);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(res, null, 2));
    console.log(`🚀 Final: ${res.length} months in ${OUTPUT_FILE}`);
}
run();
