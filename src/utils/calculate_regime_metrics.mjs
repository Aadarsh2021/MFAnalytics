
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REGIMES } from '../config/regimeConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, '../../data/processed/usMacroHistorical.json');

async function calculateMetrics() {
    try {
        const rawData = fs.readFileSync(DATA_PATH, 'utf8');
        const macroData = JSON.parse(rawData);

        // We will calculate returns for EACH regime strategy over the FULL history
        const strategies = ['REGIME_A', 'REGIME_B', 'REGIME_C', 'REGIME_D'];
        const strategyResults = {};
        strategies.forEach(s => strategyResults[s] = { returns: [], values: [100000] }); // Start with 100k

        // Skip first (return calculation requires previous)
        for (let i = 1; i < macroData.length; i++) {
            const current = macroData[i];
            const prev = macroData[i - 1];

            // Returns
            const assetReturns = {};

            // Equity (SP500)
            assetReturns.EQUITY = (current.sp500 && prev.sp500) ? (current.sp500 / prev.sp500) - 1 : 0;

            // Gold
            assetReturns.GOLD = (current.goldPrice && prev.goldPrice) ? (current.goldPrice / prev.goldPrice) - 1 : 0;

            // Debt (Yield)
            const prevYield = (prev.gSecYield || 5.0) / 100;
            const curYield = (current.gSecYield || 5.0) / 100;
            const deltaYield = curYield - prevYield;

            assetReturns.DEBT_LONG = (prevYield / 12) - (7.0 * deltaYield);
            assetReturns.DEBT_MEDIUM = (prevYield / 12) - (3.0 * deltaYield);

            // Short/Cash (Repo)
            const repoRate = (prev.repoRate || 4.0) / 100;
            assetReturns.DEBT_SHORT = repoRate / 12;

            // Hybrid
            assetReturns.HYBRID = (0.65 * assetReturns.EQUITY) + (0.35 * assetReturns.DEBT_MEDIUM);

            // Calculate Return for Every Strategy
            strategies.forEach(regime => {
                const targets = REGIMES[regime]?.allocationBands;
                let portfolioReturn = 0;

                if (targets) {
                    for (const [asset, band] of Object.entries(targets)) {
                        portfolioReturn += band.target * (assetReturns[asset] || 0);
                    }
                } else {
                    portfolioReturn = (assetReturns.EQUITY + assetReturns.DEBT_MEDIUM) / 2;
                }

                strategyResults[regime].returns.push(portfolioReturn);

                // Track cumulative value for Drawdown
                const lastValue = strategyResults[regime].values[strategyResults[regime].values.length - 1];
                strategyResults[regime].values.push(lastValue * (1 + portfolioReturn));
            });
        }

        const stats = {};
        for (const [regime, data] of Object.entries(strategyResults)) {
            const returns = data.returns;
            const values = data.values;
            const n = returns.length;
            const avg = returns.reduce((a, b) => a + b, 0) / n;
            const variance = returns.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / (n - 1);
            const stdDev = Math.sqrt(variance);

            const annualizedRet = Math.pow(1 + returns.reduce((acc, r) => acc * (1 + r), 1) - 1, 1 / (n / 12)) - 1;
            const annualizedVol = stdDev * Math.sqrt(12);

            // VaR / CVaR
            const sorted = [...returns].sort((a, b) => a - b);
            const idx95 = Math.floor(0.05 * n);
            const vaR95 = sorted[idx95];
            const tail = sorted.slice(0, idx95);
            const cVaR95 = tail.length > 0 ? tail.reduce((a, b) => a + b, 0) / tail.length : vaR95;

            // Max Drawdown
            let maxDD = 0;
            let peak = values[0];
            for (const v of values) {
                if (v > peak) peak = v;
                const dd = (peak - v) / peak;
                if (dd > maxDD) maxDD = dd;
            }

            // Win Rate
            const positiveMonths = returns.filter(r => r > 0).length;
            const winRate = positiveMonths / n;

            // Sharpe Ratio (Assuming 0 risk free for simplicity or 2%)
            // Let's use 0% for pure comparison, or subtract avg risk free.
            // Using simplified Sharpe = AnnReturn / AnnVol
            const sharpe = annualizedRet / annualizedVol;

            stats[regime] = {
                annualizedReturn: annualizedRet,
                annualizedVol: annualizedVol,
                monthlyVaR95: vaR95,
                monthlyCVaR95: cVaR95,
                maxDrawdown: maxDD,
                winRate: winRate,
                sharpeRatio: sharpe
            };
        }

        console.log(JSON.stringify(stats, null, 2));

    } catch (err) {
        console.error(err);
    }
}

calculateMetrics();