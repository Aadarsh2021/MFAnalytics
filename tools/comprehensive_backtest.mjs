
import fs from 'fs';
import path from 'path';

// --- CONFIG & PATHS ---
const ROOT = 'c:/Users/thaku/Desktop/Work/MFP';
const US_JSON = path.join(ROOT, 'data/processed/usMacroHistorical.json');
const IN_JSON = path.join(ROOT, 'data/processed/indiaMacroHistorical.json');
const OUTPUT_DIR = path.join(ROOT, 'docs/reports');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Production Allocation Targets (Simplified for the simulation)
const REGIME_TARGETS = {
    REGIME_A: { EQUITY: 0.575, HYBRID: 0.125, DEBT_LONG: 0.15, DEBT_MEDIUM: 0.10, DEBT_SHORT: 0.05, GOLD: 0.00 },
    REGIME_B: { EQUITY: 0.50, HYBRID: 0.125, DEBT_LONG: 0.20, DEBT_MEDIUM: 0.125, DEBT_SHORT: 0.05, GOLD: 0.04 },
    REGIME_C: { EQUITY: 0.43, HYBRID: 0.11, DEBT_LONG: 0.00, DEBT_MEDIUM: 0.19, DEBT_SHORT: 0.17, GOLD: 0.10 },
    REGIME_D: { EQUITY: 0.25, HYBRID: 0.15, DEBT_LONG: 0.00, DEBT_MEDIUM: 0.10, DEBT_SHORT: 0.35, GOLD: 0.15 }
};

// --- SIMULATION LOGIC ---

function sigmoid(x, k = 1, theta = 0) {
    return 1 / (1 + Math.exp(-k * (x - theta)));
}

function calculateCorrelation(xArr, yArr) {
    if (xArr.length < 5) return -0.1;
    const n = xArr.length;
    const muX = xArr.reduce((a, b) => a + b, 0) / n;
    const muY = yArr.reduce((a, b) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
        num += (xArr[i] - muX) * (yArr[i] - muY);
        denX += (xArr[i] - muX) ** 2; denY += (yArr[i] - muY) ** 2;
    }
    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : num / den;
}

function scoreRegimeC(ind) {
    const weights = { realRate: 0.2, debtStress: 0.18, bondEquityCorr: 0.18, cbGoldBuying: 0.1, inflationVol: 0.14, volatilityRatio: 0.2 };
    const s = {
        realRate: sigmoid(-(ind.realRate - 1.0), 2.5, 0),
        debtStress: sigmoid(ind.debtStress, 1.2, 3.0),
        bondEquityCorr: sigmoid(ind.bondEquityCorr, 2.5, 0),
        cbGoldBuying: sigmoid(ind.cbGoldBuying ?? 50, 0.05, 80.0),
        inflationVol: sigmoid(ind.inflationVol ?? 1.5, 1.5, 2.0),
        volatilityRatio: sigmoid(ind.volatilityRatio ?? 0.8, 1.8, 1.0)
    };
    return Object.keys(weights).reduce((acc, k) => acc + (s[k] * weights[k]), 0);
}

function scoreRegimeA(ind) {
    const rrScore = sigmoid((ind.realRate ?? 1.5) - 1.5, 2, 0);
    const corrScore = sigmoid(-(ind.bondEquityCorr ?? -0.1) - 0.3, 4, 0);
    return (rrScore * 0.5 + corrScore * 0.5);
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
    const rrCond = recent3.filter(r => (r.indicators?.realRate || 0) > 0.5).length >= 2;
    const corrCond = recent3.filter(r => (r.indicators?.bondEquityCorr || 0) < -0.1).length >= 1;
    const goldCond = recent3.filter(r => (r.indicators?.cbGoldBuying || 0) < 30).length >= 2;
    return rrCond || corrCond || goldCond;
}

function detectRegime(ind, prevProbs, prevDominant, history) {
    const likelihoods = { REGIME_A: scoreRegimeA(ind), REGIME_B: scoreRegimeB(ind), REGIME_C: scoreRegimeC(ind), REGIME_D: scoreRegimeD(ind) };
    const total = Object.values(likelihoods).reduce((a, b) => a + b, 0) || 1;
    let probs = Object.fromEntries(Object.entries(likelihoods).map(([k, v]) => [k, v / total]));
    if (prevProbs) probs = Object.fromEntries(Object.keys(probs).map(k => [k, 0.3 * probs[k] + 0.7 * prevProbs[k]]));
    let dominant = Object.entries(probs).sort((a, b) => b[1] - a[1])[0][0];
    if (prevDominant === 'REGIME_C' && dominant !== 'REGIME_C' && !shouldExitRegimeC(history)) dominant = 'REGIME_C';
    return { dominant, probabilities: probs };
}

function runBacktest(region, data) {
    let portfolioValue = 100000;
    let results = [];
    let transitions = [];
    let prevProbs = null, prevDominant = null;
    let equityRetHistory = [], bondRetHistory = [];
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const prev = i > 0 ? data[i - 1] : null;
        let ret_eq = 0, ret_gold = 0, ret_long = 0, ret_med = 0, ret_short = 0;
        const eqKey = region === 'US' ? 'sp500' : 'nifty';

        if (prev) {
            ret_eq = (row[eqKey] / prev[eqKey]) - 1;
            ret_gold = (row.goldPrice / prev.goldPrice) - 1 || 0;
            if (region === 'India' && isNaN(ret_gold)) { // India data might have goldPrice missing in some early parts or different key
                 ret_gold = 0; // Simplified for robustness
            }
            const y1 = prev.gSecYield || 5, y2 = row.gSecYield || 5;
            ret_long = ((y1 - y2) / 100) * 7 + (y1 / 100 / 12);
            ret_med = ((y1 - y2) / 100) * 3.5 + (y1 / 100 / 12);
            ret_short = (y1 / 100 / 12);
        }

        equityRetHistory.push(ret_eq);
        bondRetHistory.push(ret_med);
        if (equityRetHistory.length > 12) { equityRetHistory.shift(); bondRetHistory.shift(); }

        const pceKey = region === 'US' ? 'pceIndex' : 'cpiIndex';
        const gdpKey = region === 'US' ? 'gdpIndex' : 'nominalGDP';

        const indicators = {
            ...row,
            bondEquityCorr: calculateCorrelation(equityRetHistory, bondRetHistory),
            inflationMomentum: (prev && row[pceKey] && prev[pceKey]) ? (row[pceKey] / prev[pceKey]) - 1 : 0,
            growthMomentum: (prev && row[gdpKey] && prev[gdpKey]) ? (row[gdpKey] / prev[gdpKey]) - 1 : 0,
            volatility: row.vix || (Math.abs(ret_eq) * 100 * Math.sqrt(12)),
            inflationVol: row.inflationVol || 1.5,
            debtStress: row.debtStress || (row.debtToGDP > 80 ? 4.5 : 2.5)
        };

        const res = detectRegime(indicators, prevProbs, prevDominant, results);
        const currentRegime = res.dominant;
        const target = REGIME_TARGETS[currentRegime];

        if (prevDominant && currentRegime !== prevDominant) {
            transitions.push({ date: row.date, from: prevDominant, to: currentRegime });
        }

        const port_ret = (target.EQUITY * ret_eq) + (target.GOLD * ret_gold) +
            (target.DEBT_LONG * ret_long) + (target.DEBT_MEDIUM * ret_med) +
            (target.DEBT_SHORT * ret_short) + (target.HYBRID * (ret_eq * 0.4 + ret_med * 0.6));

        portfolioValue *= (1 + port_ret);

        results.push({
            date: row.date,
            regime: currentRegime,
            portValue: portfolioValue,
            portRet: port_ret,
            eqRet: ret_eq,
            goldRet: ret_gold,
            debtRet: ret_med, // Using medium as proxy for "Debt" metric
            indicators
        });

        prevDominant = currentRegime;
        prevProbs = res.probabilities;
    }
    return { results, transitions, region };
}

// --- METRICS CALCULATION ---
function getMetrics(analysis) {
    const { results, transitions, region } = analysis;
    const n = results.length;
    const startValue = 100000;
    const endValue = results[n - 1].portValue;
    const years = n / 12;
    const cagr = Math.pow(endValue / startValue, 1 / years) - 1;

    // VaR / CVaR
    const returns = results.map(r => r.portRet).sort((a, b) => a - b);
    const getVaR = (lvl) => -returns[Math.floor((1 - lvl) * returns.length)];
    const getCVaR = (lvl) => {
        const tail = returns.slice(0, Math.floor((1 - lvl) * returns.length));
        return -tail.reduce((a, b) => a + b, 0) / (tail.length || 1);
    };

    // Drawdowns
    let peak = 0, maxDD = 0, ddStart = null, maxDDPeriod = 0, currentDDPeriod = 0;
    results.forEach(r => {
        if (r.portValue > peak) {
            peak = r.portValue;
            currentDDPeriod = 0;
        } else {
            const dd = (peak - r.portValue) / peak;
            if (dd > maxDD) maxDD = dd;
            currentDDPeriod++;
            if (currentDDPeriod > maxDDPeriod) maxDDPeriod = currentDDPeriod;
        }
    });

    // Stress Recovery
    let stressRecovery = [];
    let inStress = false, stressStart = null;
    results.forEach(r => {
        if ((r.regime === 'REGIME_C' || r.regime === 'REGIME_D') && !inStress) {
            inStress = true; stressStart = r.date;
        } else if (inStress && r.regime !== 'REGIME_C' && r.regime !== 'REGIME_D') {
            inStress = false;
            // Simplified: distance from stress end to new peak? Or just duration? 
            // Let's use duration until regime change as "Stress Period" and noting recovery logic
        }
    });

    // Best/Worst
    const bestRet = Math.max(...results.map(r => r.portRet));
    const worstRet = Math.min(...results.map(r => r.portRet));
    const bestGold = Math.max(...results.map(r => r.goldRet));
    const bestEq = Math.max(...results.map(r => r.eqRet));
    const bestDebt = Math.max(...results.map(r => r.debtRet));

    // Sharpe
    const avgRet = results.reduce((a, b) => a + b.portRet, 0) / n;
    const stdDev = Math.sqrt(results.reduce((s, r) => s + Math.pow(r.portRet - avgRet, 2), 0) / n) * Math.sqrt(12);
    const sharpe = (cagr - 0.03) / stdDev; // 3% risk free

    return {
        regimeAtStart: results[0].regime,
        cagr: (cagr * 100).toFixed(2) + '%',
        finalValue: '$' + endValue.toLocaleString(undefined, { maximumFractionDigits: 0 }),
        maxDD: (maxDD * 100).toFixed(2) + '%',
        maxDDPeriod: maxDDPeriod + ' months',
        var95: (getVaR(0.95) * 100).toFixed(2) + '%',
        cvar95: (getCVaR(0.95) * 100).toFixed(2) + '%',
        var99: (getVaR(0.99) * 100).toFixed(2) + '%',
        cvar99: (getCVaR(0.99) * 100).toFixed(2) + '%',
        bestPeriod: (bestRet * 100).toFixed(2) + '%',
        worstPeriod: (worstRet * 100).toFixed(2) + '%',
        bestGold: (bestGold * 100).toFixed(2) + '%',
        bestEq: (bestEq * 100).toFixed(2) + '%',
        bestDebt: (bestDebt * 100).toFixed(2) + '%',
        sharpe: sharpe.toFixed(2),
        totalShifts: transitions.length,
        recentShift: transitions[transitions.length - 1] || { date: 'N/A', from: 'N/A', to: 'N/A' }
    };
}

function generateMD(analysis, metrics) {
    const { results, transitions, region } = analysis;
    const filePath = path.join(OUTPUT_DIR, `Comprehensive_Report_${region}.md`);
    
    let md = `# Comprehensive Macro Backtest Report: ${region}\n`;
    md += `**Period**: ${results[0].date} to ${results[results.length - 1].date}\n\n`;

    md += `## 1. Executive Summary\n`;
    md += `| Metric | Value |\n|---|---|\n`;
    md += `| **Initial Investment** | $100,000 |\n`;
    md += `| **Final Value** | ${metrics.finalValue} |\n`;
    md += `| **CAGR** | ${metrics.cagr} |\n`;
    md += `| **Sharpe Ratio** | ${metrics.sharpe} (Rf=3%) |\n`;
    md += `| **Initial Regime** | ${metrics.regimeAtStart} |\n`;
    md += `| **Total Regime Shifts** | ${metrics.totalShifts} |\n\n`;

    md += `## 2. Risk Metrics\n`;
    md += `| Risk Indicator | Value |\n|---|---|\n`;
    md += `| **Maximum Drawdown** | ${metrics.maxDD} |\n`;
    md += `| **Max Drawdown Duration** | ${metrics.maxDDPeriod} |\n`;
    md += `| **Value at Risk (VaR 95%)** | ${metrics.var95} |\n`;
    md += `| **Conditional VaR (CVaR 95%)** | ${metrics.cvar95} |\n`;
    md += `| **Value at Risk (VaR 99%)** | ${metrics.var99} |\n`;
    md += `| **Conditional VaR (CVaR 99%)** | ${metrics.cvar99} |\n\n`;

    md += `## 3. Best/Worst Period Returns\n`;
    md += `| Category | Best Monthly | Worst Monthly |\n|---|---|---|\n`;
    md += `| **Portfolio** | ${metrics.bestPeriod} | ${metrics.worstPeriod} |\n`;
    md += `| **Equity (Benchmark)** | ${metrics.bestEq} | - |\n`;
    md += `| **Gold** | ${metrics.bestGold} | - |\n`;
    md += `| **Debt (Proxy)** | ${metrics.bestDebt} | - |\n\n`;

    md += `## 4. Regime Transitions & Transfers\n`;
    md += `- **Recent Change**: ${metrics.recentShift.to} (on ${metrics.recentShift.date}, from ${metrics.recentShift.from})\n\n`;
    md += `### History of Transitions\n`;
    md += `| Date | From | To |\n|---|---|---|\n`;
    transitions.forEach(t => md += `| ${t.date} | ${t.from} | ${t.to} |\n`);

    fs.writeFileSync(filePath, md);
    console.log(`Saved: ${filePath}`);
}

const usData = JSON.parse(fs.readFileSync(US_JSON, 'utf8'));
const inData = JSON.parse(fs.readFileSync(IN_JSON, 'utf8'));

const usAnalysis = runBacktest('US', usData);
generateMD(usAnalysis, getMetrics(usAnalysis));

const inAnalysis = runBacktest('India', inData);
generateMD(inAnalysis, getMetrics(inAnalysis));
