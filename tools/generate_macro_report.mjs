import fs from 'fs';
import path from 'path';

// --- CONFIG & PATHS ---
const ROOT = 'c:/Users/thaku/Desktop/Work/MFP';
const US_JSON = path.join(ROOT, 'data/processed/usMacroHistorical.json');
const IN_JSON = path.join(ROOT, 'data/processed/indiaMacroHistorical.json');
const OUTPUT_DIR = path.join(ROOT, 'docs/reports');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Production Weights from regimeDetector.js
const REGIME_WEIGHTS = {
    realRate: 0.20,
    debtStress: 0.18,
    bondEquityCorr: 0.18,
    cbGoldBuying: 0.10,
    inflationVol: 0.14,
    volatilityRatio: 0.20
};

// Production Allocation Targets from regimeConfig.js
const REGIME_TARGETS = {
    REGIME_A: { EQUITY: 0.575, HYBRID: 0.125, DEBT_LONG: 0.15, DEBT_MEDIUM: 0.10, DEBT_SHORT: 0.05, GOLD: 0.00 },
    REGIME_B: { EQUITY: 0.50, HYBRID: 0.125, DEBT_LONG: 0.20, DEBT_MEDIUM: 0.125, DEBT_SHORT: 0.05, GOLD: 0.04 },
    REGIME_C: { EQUITY: 0.43, HYBRID: 0.11, DEBT_LONG: 0.00, DEBT_MEDIUM: 0.19, DEBT_SHORT: 0.17, GOLD: 0.10 },
    REGIME_D: { EQUITY: 0.25, HYBRID: 0.15, DEBT_LONG: 0.00, DEBT_MEDIUM: 0.10, DEBT_SHORT: 0.35, GOLD: 0.15 }
};

// --- CORE LOGIC ---
function sigmoid(x, k = 1, theta = 0) {
    return 1 / (1 + Math.exp(-k * (x - theta)));
}

function scoreRegimeC(ind) {
    const s = {
        realRate: sigmoid(-(ind.realRate - 1.0), 2.5, 0),
        debtStress: sigmoid(ind.debtStress, 1.2, 3.0),
        bondEquityCorr: sigmoid(ind.bondEquityCorr, 2.5, 0),
        cbGoldBuying: sigmoid(ind.cbGoldBuying ?? 50, 0.05, 80.0),
        inflationVol: sigmoid(ind.inflationVol ?? 1.5, 1.5, 2.0),
        volatilityRatio: sigmoid(ind.volatilityRatio ?? 0.8, 1.8, 1.0)
    };
    return Object.keys(REGIME_WEIGHTS).reduce((acc, k) => acc + (s[k] * REGIME_WEIGHTS[k]), 0);
}

function scoreRegimeA(ind) {
    const rrScore = sigmoid((ind.realRate ?? 1.5) - 1.5, 2, 0);
    const corrScore = sigmoid(-(ind.bondEquityCorr ?? -0.1) - 0.3, 4, 0);
    return (rrScore * 0.5 + corrScore * 0.5); // Simplified production logic
}

function scoreRegimeB(ind) {
    const infMom = sigmoid(-(ind.inflationMomentum ?? 0), 3, 0);
    const groMom = sigmoid(-(ind.growthMomentum ?? 0), 3, 0);
    return (infMom * 0.5 + groMom * 0.5);
}

function scoreRegimeD(ind) {
    const volScore = sigmoid(ind.volatility ?? 15, 2, 2.0);
    const corrScore = sigmoid(ind.bondEquityCorr ?? 0, 5, 0.8);
    return (volScore * 0.5 + corrScore * 0.5);
}

function shouldExitRegimeC(history) {
    if (history.length < 3) return false;
    const recent3 = history.slice(-3);
    const realRateCondition = recent3.filter(r => (r.indicators?.realRate || 0) > 0.5).length >= 2;
    const correlationCondition = recent3.filter(r => (r.indicators?.bondEquityCorr || 0) < -0.1).length >= 1;
    const goldCondition = recent3.filter(r => (r.indicators?.cbGoldBuying || 0) < 30).length >= 2;
    return realRateCondition || correlationCondition || goldCondition;
}

function detectRegime(ind, prevProbs, prevDominant, history) {
    const likelihoods = {
        REGIME_A: scoreRegimeA(ind),
        REGIME_B: scoreRegimeB(ind),
        REGIME_C: scoreRegimeC(ind),
        REGIME_D: scoreRegimeD(ind)
    };

    const total = Object.values(likelihoods).reduce((a, b) => a + b, 0) || 1;
    let probs = Object.fromEntries(Object.entries(likelihoods).map(([k, v]) => [k, v / total]));

    // Bayesian Update
    if (prevProbs) {
        probs = Object.fromEntries(Object.keys(probs).map(k => [k, 0.3 * probs[k] + 0.7 * prevProbs[k]]));
    }

    let dominant = Object.entries(probs).sort((a, b) => b[1] - a[1])[0][0];

    // Sticky Hysteresis for Regime C
    if (prevDominant === 'REGIME_C' && dominant !== 'REGIME_C') {
        if (!shouldExitRegimeC(history)) {
            dominant = 'REGIME_C';
        }
    }

    return { dominant, probabilities: probs };
}

// --- CALCULATION UTILS ---
function calculateCorrelation(xArr, yArr) {
    if (xArr.length < 5) return -0.1;
    const n = xArr.length;
    const muX = xArr.reduce((a, b) => a + b, 0) / n;
    const muY = yArr.reduce((a, b) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
        num += (xArr[i] - muX) * (yArr[i] - muY);
        denX += (xArr[i] - muX) ** 2;
        denY += (yArr[i] - muY) ** 2;
    }
    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : num / den;
}

// --- MAIN RUNNER ---
function runAnalysis(region, data) {
    console.log(`Analyzing ${region}...`);
    let portfolioValue = 100000;
    let benchValue = 100000;
    let peak = 100000, benchPeak = 100000;
    let results = [];
    let transitions = [];
    let prevProbs = null, prevDominant = null;
    let equityRetHistory = [], bondRetHistory = [];

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const prev = i > 0 ? data[i - 1] : null;

        // 1. Calculate Returns
        let ret_eq = 0, ret_gold = 0, ret_long = 0, ret_med = 0, ret_short = 0;
        const eqKey = region === 'US' ? 'sp500' : 'nifty';

        if (prev) {
            ret_eq = (row[eqKey] / prev[eqKey]) - 1;
            ret_gold = (row.goldPrice / prev.goldPrice) - 1 || 0;
            const y1 = prev.gSecYield || 5, y2 = row.gSecYield || 5;
            ret_long = ((y1 - y2) / 100) * 7 + (y1 / 100 / 12);
            ret_med = ((y1 - y2) / 100) * 3.5 + (y1 / 100 / 12);
            ret_short = (y1 / 100 / 12);
        }

        equityRetHistory.push(ret_eq);
        bondRetHistory.push(ret_med);
        if (equityRetHistory.length > 12) { equityRetHistory.shift(); bondRetHistory.shift(); }

        // 2. Derive Indicators for detection (Unified for both regions)
        const pceKey = region === 'US' ? 'pceIndex' : 'cpiIndex';
        const gdpKey = region === 'US' ? 'gdpIndex' : 'nominalGDP';

        const indicators = {
            ...row,
            bondEquityCorr: calculateCorrelation(equityRetHistory, bondRetHistory),
            inflationMomentum: (prev && row[pceKey] && prev[pceKey]) ? (row[pceKey] / prev[pceKey]) - 1 : 0,
            growthMomentum: (prev && row[gdpKey] && prev[gdpKey]) ? (row[gdpKey] / prev[gdpKey]) - 1 : 0,
            volatility: row.vix || (Math.abs(ret_eq) * 100 * Math.sqrt(12)), // Proxy VIX if missing
            inflationVol: row.inflationVol || 1.5,
            debtStress: row.debtStress || (row.debtToGDP > 80 ? 4.5 : 2.5) // Adaptive proxy for India if missing
        };

        // 3. Detect Regime
        const res = detectRegime(indicators, prevProbs, prevDominant, results);
        const currentRegime = res.dominant;
        const target = REGIME_TARGETS[currentRegime];

        if (prevDominant && currentRegime !== prevDominant) {
            transitions.push({ date: row.date, from: prevDominant, to: currentRegime });
        }

        // 4. Portfolio Return
        const port_ret = (target.EQUITY * ret_eq) + (target.GOLD * ret_gold) +
            (target.DEBT_LONG * ret_long) + (target.DEBT_MEDIUM * ret_med) +
            (target.DEBT_SHORT * ret_short) + (target.HYBRID * (ret_eq * 0.4 + ret_med * 0.6));

        portfolioValue *= (1 + port_ret);
        benchValue *= (1 + ret_eq);

        if (portfolioValue > peak) peak = portfolioValue;
        if (benchValue > benchPeak) benchPeak = benchValue;

        results.push({
            date: row.date,
            regime: currentRegime,
            portValue: portfolioValue, benchValue,
            portRet: port_ret, benchRet: ret_eq, goldRet: ret_gold,
            drawdown: (peak - portfolioValue) / peak,
            benchDrawdown: (benchPeak - benchValue) / benchPeak,
            indicators
        });

        prevDominant = currentRegime;
        prevProbs = res.probabilities;
    }

    return { results, transitions, region };
}

function saveReport(analysis) {
    const { results, transitions, region } = analysis;
    const benchmark = region === 'US' ? 'S&P 500' : 'NIFTY';
    const filePath = path.join(OUTPUT_DIR, `Final_Verified_Report_${region}.md`);

    let md = `# Final Verified Macro-Only Backtest Report: ${region} (${results[0].date} to ${results[results.length - 1].date})\n\n`;

    md += `## 1. Summary Metrics\n`;
    const totalP = (results[results.length - 1].portValue / 100000) - 1;
    const totalB = (results[results.length - 1].benchValue / 100000) - 1;
    const maxDD = Math.max(...results.map(r => r.drawdown));
    const bMaxDD = Math.max(...results.map(r => r.benchDrawdown));

    md += `- **Total Portfolio Return**: ${(totalP * 100).toFixed(2)}%\n`;
    md += `- **Total ${benchmark} Return**: ${(totalB * 100).toFixed(2)}%\n`;
    md += `- **Max Portfolio Drawdown**: ${(maxDD * 100).toFixed(2)}%\n`;
    md += `- **Max ${benchmark} Drawdown**: ${(bMaxDD * 100).toFixed(2)}%\n`;
    md += `- **Relative Drawdown Protection**: ${((bMaxDD - maxDD) * 100).toFixed(2)}% (Lower is Better)\n\n`;

    md += `## 2. Regime Transitions (${transitions.length} Shifts)\n\n`;
    md += `| Date | From | To | Cause |\n|---|---|---|---|\n`;
    transitions.forEach(t => md += `| ${t.date} | ${t.from} | ${t.to} | Macro Evolution |\n`);

    md += `\n## 3. High-Stress Resilience (Regime C & D)\n`;
    const stress = results.filter(r => r.regime === 'REGIME_C' || r.regime === 'REGIME_D');
    const avgP = stress.reduce((a, b) => a + b.portRet, 0) / (stress.length || 1);
    const avgB = stress.reduce((a, b) => a + b.benchRet, 0) / (stress.length || 1);
    md += `- **Avg Annualized Portfolio Return in Stress**: ${(avgP * 1200).toFixed(2)}%\n`;
    md += `- **Avg Annualized ${benchmark} Return in Stress**: ${(avgB * 1200).toFixed(2)}%\n`;

    fs.writeFileSync(filePath, md);
    console.log(`Saved: ${filePath}`);
}

const usData = JSON.parse(fs.readFileSync(US_JSON, 'utf8'));
const inData = JSON.parse(fs.readFileSync(IN_JSON, 'utf8'));

saveReport(runAnalysis('US', usData));
saveReport(runAnalysis('India', inData));
